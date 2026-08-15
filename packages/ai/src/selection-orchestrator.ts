import type { DesignPreferenceQuery, DesignRegistryEntry } from "@micirql/registry";
import type { SitePlan } from "@micirql/schema";
import { composeSiteFromRegistry } from "./composition-engine";
import { decideSiteComponents } from "./decision";
import type { PlannerModel } from "./planner-adapter";
import type { AiDecisionOutput, SectionSelection, SelectionConfidence } from "./types";

export type SelectionOrchestratorInput = {
  sitePlan: SitePlan;
  registryEntries: readonly DesignRegistryEntry[];
  compositionModel?: PlannerModel;
  minimumSelectionScore?: number;
  shortlistSize?: number;
  preferences?: DesignPreferenceQuery;
};

export type SelectionOrchestratorResult = {
  selection: AiDecisionOutput;
  source: "ai-composition" | "deterministic";
  fallbackUsed: boolean;
  warnings: string[];
};

export async function selectSiteComponents(input: SelectionOrchestratorInput): Promise<SelectionOrchestratorResult> {
  const deterministic = decideSiteComponents({
    sitePlan: input.sitePlan,
    registryEntries: input.registryEntries,
    ...(input.minimumSelectionScore === undefined ? {} : { minimumSelectionScore: input.minimumSelectionScore }),
    mode: "library-preferred",
  });

  // AI composition is allowed only when the deterministic production gate confirms
  // every required family already has an acceptable certified library match.
  if (!input.compositionModel || deterministic.gaps.length > 0) {
    return {
      selection: deterministic,
      source: "deterministic",
      fallbackUsed: Boolean(input.compositionModel),
      warnings: deterministic.gaps.length > 0 && input.compositionModel
        ? ["AI composition skipped because one or more required sections have no acceptable production candidate."]
        : [],
    };
  }

  const composition = await composeSiteFromRegistry({
    plan: input.sitePlan,
    registry: input.registryEntries,
    model: input.compositionModel,
    ...(input.shortlistSize === undefined ? {} : { shortlistSize: input.shortlistSize }),
    ...(input.preferences ? { preferences: input.preferences } : {}),
  });

  const selections: SectionSelection[] = [];
  for (const page of composition.pages) {
    for (const section of page.sections) {
      const entry = input.registryEntries.find((candidate) =>
        candidate.id === section.componentId && candidate.version === section.version && candidate.status === "production" && candidate.protocol.passed,
      );
      if (!entry) {
        return {
          selection: deterministic,
          source: "deterministic",
          fallbackUsed: true,
          warnings: [...composition.warnings, `Composition returned non-production component ${section.componentId}@${section.version}; deterministic selection restored.`],
        };
      }
      selections.push({
        pagePath: page.path,
        family: section.family,
        componentId: section.componentId,
        version: section.version,
        score: section.score,
        confidence: confidenceFor(section.score, input.minimumSelectionScore ?? 75),
        alternatives: [],
      });
    }
  }

  const expectedCount = input.sitePlan.pages.reduce((sum, page) => sum + page.requiredSectionFamilies.length, 0);
  if (selections.length !== expectedCount) {
    return {
      selection: deterministic,
      source: "deterministic",
      fallbackUsed: true,
      warnings: [...composition.warnings, "AI composition did not preserve every required section; deterministic selection restored."],
    };
  }

  return {
    selection: {
      plan: input.sitePlan,
      selections,
      gaps: [],
      requiresNewComponent: false,
    },
    source: composition.fallbackUsed ? "deterministic" : "ai-composition",
    fallbackUsed: composition.fallbackUsed,
    warnings: composition.warnings,
  };
}

function confidenceFor(score: number, threshold: number): SelectionConfidence {
  if (score >= Math.max(88, threshold + 8)) return "high";
  if (score >= threshold) return "medium";
  return "low";
}
