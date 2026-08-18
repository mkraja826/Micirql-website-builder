import { DENTAL_LAYOUT_BLUEPRINTS } from "./dental-layout-blueprints";
import { rankWebsiteLayoutCandidates, rankWebsiteLayouts, validateLayoutLibrary, type LayoutSelectionInput, type RankedLayout, type WebsiteLayoutBlueprint } from "./website-layout-blueprints";

export const WEBSITE_LAYOUT_LIBRARY: readonly WebsiteLayoutBlueprint[] = [
  ...DENTAL_LAYOUT_BLUEPRINTS,
];

export function normalizeLayoutIndustry(industry: string): string {
  const normalized = industry.trim().toLowerCase();
  if (/\bdental|dentist|dentistry|orthodont|endodont|implant\b/.test(normalized)) return "dental";
  return normalized.replace(/\s+/g, "-");
}

export function normalizeLayoutSubindustry(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "general dentistry": "general-dentistry",
    "family dentistry": "general-dentistry",
    "family dental": "general-dentistry",
    "implant dentistry": "implant-dentistry",
    "dental implants": "implant-dentistry",
    "cosmetic dentistry": "cosmetic-dentistry",
    "smile design": "cosmetic-dentistry",
    "orthodontics": "orthodontics",
    "endodontics": "endodontics",
    "root canal": "endodontics",
  };
  return aliases[normalized] ?? normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeInput(input: LayoutSelectionInput): LayoutSelectionInput {
  return {
    ...input,
    industry: normalizeLayoutIndustry(input.industry),
    subindustryId: normalizeLayoutSubindustry(input.subindustryId),
  };
}

export function layoutsForIndustry(industry: string, options: { includeDrafts?: boolean } = {}): WebsiteLayoutBlueprint[] {
  const normalized = normalizeLayoutIndustry(industry);
  return WEBSITE_LAYOUT_LIBRARY.filter((layout) => {
    if (layout.industry !== normalized) return false;
    return options.includeDrafts ? layout.status !== "retired" : layout.status === "certified";
  });
}

export function findWebsiteLayout(id: string): WebsiteLayoutBlueprint | undefined {
  return WEBSITE_LAYOUT_LIBRARY.find((layout) => layout.id === id);
}

/** Production selector: only certified layouts are eligible. */
export function recommendWebsiteLayouts(input: LayoutSelectionInput, limit = 5): RankedLayout[] {
  return rankWebsiteLayouts(WEBSITE_LAYOUT_LIBRARY, normalizeInput(input)).slice(0, Math.max(1, limit));
}

/** Internal selector: ranks drafts so they can be implemented and certified in order of fit. */
export function recommendLayoutCandidates(input: LayoutSelectionInput, limit = 5): RankedLayout[] {
  return rankWebsiteLayoutCandidates(WEBSITE_LAYOUT_LIBRARY, normalizeInput(input)).slice(0, Math.max(1, limit));
}

/** Internal design workflow: drafts are visible to MiCirql's layout studio before certification. */
export function draftLayoutsForIndustry(industry: string): WebsiteLayoutBlueprint[] {
  return layoutsForIndustry(industry, { includeDrafts: true }).filter((layout) => layout.status === "draft");
}

export const WEBSITE_LAYOUT_LIBRARY_ISSUES = validateLayoutLibrary(WEBSITE_LAYOUT_LIBRARY);
