export type LayoutBreakpoint = "mobile" | "tablet" | "desktop";
export type LayoutOrigin = "curated" | "community";
export type LayoutStatus = "draft" | "certified" | "retired";
export type LayoutDensity = "airy" | "balanced" | "compact";
export type LayoutImageStyle = "clinical" | "editorial" | "cinematic" | "portrait-led" | "outcome-led" | "technology-led" | "lifestyle";

export type WebsiteLayoutSection = {
  id: string;
  family: string;
  pattern: string;
  purpose: string;
  required: boolean;
};

export type ResponsiveComposition = {
  sectionOrder: string[];
  rules: string[];
};

export type WebsiteLayoutBlueprint = {
  id: string;
  industry: string;
  name: string;
  description: string;
  archetype: string;
  origin: LayoutOrigin;
  status: LayoutStatus;
  version: number;
  styleTags: string[];
  fit: {
    subindustryIds: string[];
    goals: string[];
    priorities: string[];
  };
  shell: {
    navbarBlueprintId: string;
    heroBlueprintId: string;
    footerBlueprintId: string;
  };
  design: {
    preferredPaletteIds: string[];
    preferredTypographyIds: string[];
    density: LayoutDensity;
    imageStyle: LayoutImageStyle;
    radius: "square" | "soft" | "rounded";
    sectionRhythm: "alternating" | "editorial" | "immersive" | "conversion" | "minimal";
  };
  sections: WebsiteLayoutSection[];
  responsive: Record<LayoutBreakpoint, ResponsiveComposition>;
  mutation: {
    allowed: string[];
    locked: string[];
  };
  quality: {
    minimumDesktopScore: number;
    minimumMobileScore: number;
    requiredViewports: readonly number[];
    hardRules: readonly string[];
  };
};

export type LayoutSelectionInput = {
  industry: string;
  subindustryId?: string;
  goals?: string[];
  priorities?: string[];
  styleTags?: string[];
};

export type RankedLayout = {
  layout: WebsiteLayoutBlueprint;
  score: number;
  reasons: string[];
};

function normalizedSet(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function overlapScore(requested: readonly string[] | undefined, supported: readonly string[], weight: number, reasons: string[], label: string) {
  if (!requested?.length) return 0;
  const supportedSet = normalizedSet(supported);
  const matches = [...new Set(requested.map((item) => item.trim().toLowerCase()).filter((item) => supportedSet.has(item)))];
  if (!matches.length) return 0;
  reasons.push(`${label}: ${matches.join(", ")}`);
  return Math.min(weight, matches.length * Math.max(1, Math.floor(weight / 2)));
}

type SignalSelector = (layout: WebsiteLayoutBlueprint) => readonly string[];

function rarityBonus(eligible: readonly WebsiteLayoutBlueprint[], layout: WebsiteLayoutBlueprint, requested: readonly string[] | undefined, selector: SignalSelector, label: string, reasons: string[]): number {
  if (!requested?.length) return 0;
  const supportedSet = normalizedSet(selector(layout));
  const requestedSignals = [...new Set(requested.map((value) => value.trim().toLowerCase()).filter(Boolean))];
  const bonuses: string[] = [];
  let total = 0;

  for (const signal of requestedSignals) {
    if (!supportedSet.has(signal)) continue;
    const frequency = eligible.filter((candidate) => normalizedSet(selector(candidate)).has(signal)).length;
    const points = frequency <= 1 ? 10 : frequency <= 3 ? 7 : frequency <= 5 ? 4 : 0;
    if (!points) continue;
    total += points;
    bonuses.push(`${signal} +${points}`);
  }

  if (bonuses.length) reasons.push(`${label} specificity: ${bonuses.join(", ")}`);
  return total;
}

function rank(layouts: readonly WebsiteLayoutBlueprint[], input: LayoutSelectionInput, statuses: readonly LayoutStatus[]): RankedLayout[] {
  const eligible = layouts.filter((layout) => statuses.includes(layout.status) && layout.industry === input.industry);
  const ranked = eligible.map((layout) => {
    const reasons: string[] = [];
    let rawScore = 20;
    if (input.subindustryId && layout.fit.subindustryIds.includes(input.subindustryId)) {
      rawScore += 30;
      reasons.push(`subindustry: ${input.subindustryId}`);
    }
    rawScore += overlapScore(input.goals, layout.fit.goals, 20, reasons, "goal");
    rawScore += overlapScore(input.priorities, layout.fit.priorities, 20, reasons, "priority");
    rawScore += overlapScore(input.styleTags, layout.styleTags, 10, reasons, "style");

    const specificity = Math.min(24,
      rarityBonus(eligible, layout, input.goals, (candidate) => candidate.fit.goals, "goal", reasons)
      + rarityBonus(eligible, layout, input.priorities, (candidate) => candidate.fit.priorities, "priority", reasons)
      + rarityBonus(eligible, layout, input.styleTags, (candidate) => candidate.styleTags, "style", reasons),
    );
    rawScore += specificity;

    if (layout.status === "certified") reasons.push("certified layout");
    else reasons.push("draft candidate - not eligible for production generation");
    return { layout, score: Math.min(100, rawScore), rawScore, reasons };
  });

  return ranked
    .sort((a, b) => b.rawScore - a.rawScore || a.layout.id.localeCompare(b.layout.id))
    .map(({ layout, score, reasons }) => ({ layout, score, reasons }));
}

/**
 * Production ranking layer. Only certified layouts can be selected for users.
 */
export function rankWebsiteLayouts(layouts: readonly WebsiteLayoutBlueprint[], input: LayoutSelectionInput): RankedLayout[] {
  return rank(layouts, input, ["certified"]);
}

/**
 * Internal design-studio ranking. Drafts may be evaluated and visually tested,
 * but this result must never be treated as production certification.
 */
export function rankWebsiteLayoutCandidates(layouts: readonly WebsiteLayoutBlueprint[], input: LayoutSelectionInput): RankedLayout[] {
  return rank(layouts, input, ["certified", "draft"]);
}

export function validateWebsiteLayoutBlueprint(layout: WebsiteLayoutBlueprint): string[] {
  const issues: string[] = [];
  const ids = new Set(layout.sections.map((section) => section.id));
  if (ids.size !== layout.sections.length) issues.push("section ids must be unique");
  if (!layout.sections.some((section) => section.family === "navbar")) issues.push("navbar is required");
  if (!layout.sections.some((section) => section.family === "hero")) issues.push("hero is required");
  if (!layout.sections.some((section) => section.family === "footer")) issues.push("footer is required");
  if (!layout.sections.some((section) => section.family === "contact" || section.family === "cta")) issues.push("conversion section is required");
  for (const breakpoint of ["mobile", "tablet", "desktop"] as const) {
    const missing = layout.responsive[breakpoint].sectionOrder.filter((id) => !ids.has(id));
    if (missing.length) issues.push(`${breakpoint} references unknown sections: ${missing.join(", ")}`);
  }
  if (layout.quality.minimumMobileScore < 8) issues.push("mobile quality threshold must be at least 8");
  if (layout.quality.minimumDesktopScore < 8) issues.push("desktop quality threshold must be at least 8");
  if (![360, 390, 430].every((width) => layout.quality.requiredViewports.includes(width))) issues.push("mobile certification must include 360, 390 and 430px");
  return issues;
}

export function validateLayoutLibrary(layouts: readonly WebsiteLayoutBlueprint[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const layout of layouts) {
    if (ids.has(layout.id)) issues.push(`duplicate layout id: ${layout.id}`);
    ids.add(layout.id);
    for (const issue of validateWebsiteLayoutBlueprint(layout)) issues.push(`${layout.id}: ${issue}`);
  }
  return issues;
}
