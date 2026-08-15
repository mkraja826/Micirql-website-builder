import type { Domain, SitePlan, ThemeFamily, ThemeModifier } from "@micirql/schema";
import { rankDesigns, type ComponentFamily, type DesignRegistryEntry, type RankedDesign } from "@micirql/registry";
import type { PlannerModel } from "./planner-adapter";

export type CompositionCandidate = {
  componentId: string;
  version: string;
  family: ComponentFamily;
  score: number;
  reasons: string[];
  visualWeight: "light" | "medium" | "heavy";
  contentDensity: "low" | "medium" | "high";
  imageRequirement: "none" | "optional" | "recommended" | "required";
};

export type ComposedSection = {
  family: ComponentFamily;
  componentId: string;
  version: string;
  source: "ai" | "ranker";
  score: number;
  reasons: string[];
};

export type ComposedPage = {
  name: string;
  path: string;
  purpose: string;
  sections: ComposedSection[];
};

export type CompositionResult = {
  pages: ComposedPage[];
  modelId?: string;
  fallbackUsed: boolean;
  warnings: string[];
};

export type CompositionInput = {
  plan: SitePlan;
  registry: readonly DesignRegistryEntry[];
  model?: PlannerModel;
  shortlistSize?: number;
};

type AiChoice = { family: string; componentId: string };
type AiPageChoice = { path: string; sections: AiChoice[] };
type AiComposition = { pages: AiPageChoice[] };
type PlacementRole = "opening" | "early-proof" | "core-content" | "visual-break" | "decision-support" | "conversion" | "closing";

const KNOWN_FAMILIES = new Set<ComponentFamily>([
  "navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "portfolio",
  "team", "pricing", "cta", "contact", "blog", "footer", "card", "carousel", "faq", "tabs", "stats",
  "page-header", "lead-capture", "map", "form", "table", "modal", "drawer", "search", "filter", "pagination",
  "stepper", "date-picker",
]);

export async function composeSiteFromRegistry(input: CompositionInput): Promise<CompositionResult> {
  const shortlistSize = Math.max(2, Math.min(input.shortlistSize ?? 6, 12));
  const warnings: string[] = [];
  const shortlistByPage = buildPageShortlists(input.plan, input.registry, shortlistSize);

  for (const page of shortlistByPage) {
    for (const item of page.sections) {
      if (!item.candidates.length) warnings.push(`No approved registry candidates for ${page.page.path}:${item.family}.`);
    }
  }

  if (input.model && shortlistByPage.every((page) => page.sections.every((item) => item.candidates.length > 0))) {
    try {
      const raw = await input.model.generate({
        system: [
          "You are the MiCirql composition selector.",
          "Choose only component IDs supplied in candidate lists.",
          "Do not invent component IDs, sections, copy, CSS, code, or business facts.",
          "Preserve the supplied section-family order. Do not add or remove required families.",
          "Prefer visual rhythm: avoid consecutive heavy sections and consecutive high-density sections when alternatives exist.",
          "Return JSON only with shape: { pages: [{ path, sections: [{ family, componentId }] }] }.",
        ].join("\n"),
        input: {
          business: input.plan.business,
          brand: input.plan.brand,
          design: input.plan.design,
          pages: shortlistByPage.map(({ page, sections }) => ({
            path: page.path,
            purpose: page.purpose,
            sections: sections.map((section) => ({ family: section.family, candidates: section.candidates })),
          })),
        },
        responseFormat: "json",
      });
      const parsed = normalizeComposition(raw);
      const validated = validateAiChoice(parsed, shortlistByPage);
      if (validated.ok) {
        return {
          pages: materializeAiComposition(validated.value, shortlistByPage),
          modelId: input.model.id,
          fallbackUsed: false,
          warnings,
        };
      }
      warnings.push(...validated.issues.map((issue) => `AI composition rejected: ${issue}`));
    } catch (error) {
      warnings.push(`AI composition failed: ${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }

  return {
    pages: materializeDeterministic(shortlistByPage),
    ...(input.model ? { modelId: input.model.id } : {}),
    fallbackUsed: Boolean(input.model),
    warnings,
  };
}

function buildShortlists(plan: SitePlan, requestedFamilies: string[], registry: readonly DesignRegistryEntry[], limit: number) {
  const families = requestedFamilies.map(toFamily).filter((value): value is ComponentFamily => Boolean(value));
  return families.map((family, index) => {
    const previousFamily = index > 0 ? families[index - 1] : undefined;
    const nextFamily = index < families.length - 1 ? families[index + 1] : undefined;
    const ranked = rankDesigns(registry, {
      family,
      theme: plan.design.theme as ThemeFamily,
      domain: plan.business.domain as Domain,
      modifiers: plan.design.modifiers as ThemeModifier[],
      brandPersonalities: plan.brand.personalities,
      requiredCapabilities: requiredCapabilitiesForFamily(family, plan.business.requiredFunctions),
      conversionGoals: [normalizeGoal(plan.business.primaryGoal)],
      placementRole: placementRole(index, families.length, family),
      previousFamily,
      nextFamily,
      preferImage: prefersImage(plan.brand.imageryDirection),
      targetVisualWeight: plan.brand.visualWeight,
      limit,
    });
    return { family, candidates: ranked.map(toCandidate) };
  });
}

function toCandidate(ranked: RankedDesign): CompositionCandidate {
  const intelligence = ranked.entry.intelligence;
  return {
    componentId: ranked.entry.id,
    version: ranked.entry.version,
    family: ranked.entry.family,
    score: ranked.score,
    reasons: ranked.reasons,
    visualWeight: intelligence?.visualWeight ?? "medium",
    contentDensity: intelligence?.contentDensity ?? "medium",
    imageRequirement: intelligence?.imageRequirement ?? "optional",
  };
}

function materializeDeterministic(pages: ReturnType<typeof buildPageShortlists>): ComposedPage[] {
  return pages.map(({ page, sections }) => {
    const selected: CompositionCandidate[] = [];
    const output: ComposedSection[] = [];
    for (const item of sections) {
      const choice = chooseWithRhythm(item.candidates, selected);
      if (!choice) continue;
      selected.push(choice);
      output.push({ family: item.family, componentId: choice.componentId, version: choice.version, source: "ranker", score: choice.score, reasons: choice.reasons });
    }
    return { name: page.name, path: page.path, purpose: page.purpose, sections: output };
  });
}

function materializeAiComposition(ai: AiComposition, shortlists: ReturnType<typeof buildPageShortlists>): ComposedPage[] {
  return shortlists.map(({ page, sections }) => {
    const selectedPage = ai.pages.find((candidate) => candidate.path === page.path)!;
    return {
      name: page.name,
      path: page.path,
      purpose: page.purpose,
      sections: selectedPage.sections.map((choice, index) => {
        const shortlist = sections[index]!;
        const selected = shortlist.candidates.find((candidate) => candidate.componentId === choice.componentId)!;
        return { family: shortlist.family, componentId: selected.componentId, version: selected.version, source: "ai" as const, score: selected.score, reasons: selected.reasons };
      }),
    };
  });
}

function chooseWithRhythm(candidates: CompositionCandidate[], previous: CompositionCandidate[]): CompositionCandidate | undefined {
  if (!candidates.length) return undefined;
  const last = previous.at(-1);
  if (!last) return candidates[0];
  return candidates.find((candidate) =>
    !(candidate.visualWeight === "heavy" && last.visualWeight === "heavy") &&
    !(candidate.contentDensity === "high" && last.contentDensity === "high")
  ) ?? candidates[0];
}

function validateAiChoice(value: AiComposition | null, shortlists: ReturnType<typeof buildPageShortlists>): { ok: true; value: AiComposition } | { ok: false; issues: string[] } {
  if (!value) return { ok: false, issues: ["response is not valid composition JSON"] };
  const issues: string[] = [];
  if (value.pages.length !== shortlists.length) issues.push("page count changed");
  for (const expected of shortlists) {
    const page = value.pages.find((candidate) => candidate.path === expected.page.path);
    if (!page) { issues.push(`missing page ${expected.page.path}`); continue; }
    if (page.sections.length !== expected.sections.length) issues.push(`section count changed for ${expected.page.path}`);
    page.sections.forEach((choice, index) => {
      const expectedSection = expected.sections[index];
      if (!expectedSection) return;
      if (choice.family !== expectedSection.family) issues.push(`family order changed at ${expected.page.path}:${index}`);
      if (!expectedSection.candidates.some((candidate) => candidate.componentId === choice.componentId)) issues.push(`unapproved component ${choice.componentId}`);
    });
  }
  return issues.length ? { ok: false, issues } : { ok: true, value };
}

function normalizeComposition(value: unknown): AiComposition | null {
  let parsed: unknown = value;
  if (typeof value === "string") {
    let text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
    try { parsed = JSON.parse(text); } catch { return null; }
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as AiComposition).pages)) return null;
  return parsed as AiComposition;
}

function toFamily(value: string): ComponentFamily | undefined {
  const normalized = value.trim().toLowerCase().replace(/_/g, "-") as ComponentFamily;
  return KNOWN_FAMILIES.has(normalized) ? normalized : undefined;
}

function normalizeGoal(goal: string): string {
  const value = goal.toLowerCase();
  if (/book|appointment|reservation/.test(value)) return "appointments";
  if (/lead|enquir|contact|quote/.test(value)) return "lead-generation";
  if (/sell|sale|purchase|checkout/.test(value)) return "sales";
  if (/trust|credib|authority/.test(value)) return "trust";
  if (/educat|inform|explain/.test(value)) return "education";
  return "conversion";
}

function placementRole(index: number, total: number, family: ComponentFamily): PlacementRole {
  if (family === "hero" || index === 0) return "opening";
  if (family === "cta" || family === "contact") return index >= total - 2 ? "closing" : "conversion";
  if (["testimonials", "stats", "team"].includes(family)) return index < Math.ceil(total / 2) ? "early-proof" : "decision-support";
  if (["gallery", "portfolio", "carousel"].includes(family)) return "visual-break";
  return index < total / 2 ? "core-content" : "decision-support";
}

function prefersImage(imageryDirection: SitePlan["brand"]["imageryDirection"]): boolean {
  return ["photography", "mixed", "product", "architectural", "editorial"].includes(imageryDirection);
}

function requiredCapabilitiesForFamily(family: ComponentFamily, requiredFunctions: string[]): string[] {
  const out: string[] = [];
  if (["hero", "cta", "contact", "lead-capture", "form"].includes(family) && requiredFunctions.length) out.push("primaryCTA");
  if (["contact", "lead-capture", "form"].includes(family) && requiredFunctions.length) out.push("functionalBinding");
  return out;
}

function buildPageShortlists(plan: SitePlan, registry: readonly DesignRegistryEntry[], limit: number) {
  return plan.pages.map((page) => ({ page, sections: buildShortlists(plan, page.requiredSectionFamilies, registry, limit) }));
}
