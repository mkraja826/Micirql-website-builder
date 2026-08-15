import { rankDesigns, type ComponentFamily } from "@micirql/registry";
import type { ThemeModifier } from "@micirql/schema";
import type {
  AiDecisionInput,
  AiDecisionOutput,
  LibraryGap,
  SectionSelection,
  SelectionConfidence,
} from "./types";

export function decideSiteComponents(input: AiDecisionInput): AiDecisionOutput {
  const plan = input.sitePlan;
  const threshold = input.minimumSelectionScore ?? 75;
  const mode = input.mode ?? "library-preferred";
  const selections: SectionSelection[] = [];
  const gaps: LibraryGap[] = [];

  for (const page of plan.pages) {
    for (const familyName of page.requiredSectionFamilies) {
      const family = familyName as ComponentFamily;
      const requiredCapabilities = capabilitiesForFamily(familyName, page.requiredFunctions);
      const ranked = rankDesigns(input.registryEntries, {
        family,
        theme: plan.design.theme,
        domain: plan.business.domain,
        modifiers: plan.design.modifiers as ThemeModifier[],
        brandPersonalities: plan.brand.personalities,
        requiredCapabilities,
        limit: 4,
      });

      const best = ranked[0];
      if (!best) {
        gaps.push({
          pagePath: page.path,
          family: familyName,
          reason: requiredCapabilities.length > 0 ? "MISSING_CAPABILITY" : "NO_PRODUCTION_MATCH",
          requiredCapabilities,
          allowCodeGeneration: mode === "library-preferred",
        });
        continue;
      }

      const confidence = confidenceFor(best.score, threshold);
      if (best.score < threshold) {
        gaps.push({
          pagePath: page.path,
          family: familyName,
          reason: "LOW_CONFIDENCE",
          requiredCapabilities,
          allowCodeGeneration: mode === "library-preferred",
        });
        if (mode === "library-only") continue;
      }

      selections.push({
        pagePath: page.path,
        family: familyName,
        componentId: best.entry.id,
        version: best.entry.version,
        score: best.score,
        confidence,
        alternatives: ranked.slice(1).map((item) => ({
          componentId: item.entry.id,
          version: item.entry.version,
          score: item.score,
        })),
      });
    }
  }

  return {
    plan,
    selections,
    gaps,
    requiresNewComponent: gaps.some((gap) => gap.allowCodeGeneration),
  };
}

function confidenceFor(score: number, threshold: number): SelectionConfidence {
  if (score >= Math.max(88, threshold + 8)) return "high";
  if (score >= threshold) return "medium";
  return "low";
}

function capabilitiesForFamily(family: string, functions: string[]): string[] {
  const interactiveFamilies = new Set(["contact", "lead-capture", "form", "cta"]);
  if (!interactiveFamilies.has(family)) return [];
  return functions.map((action) => `action:${action}`);
}
