import { DENTAL_LAYOUT_BLUEPRINTS } from "./dental-layout-blueprints";
import { rankWebsiteLayouts, validateLayoutLibrary, type LayoutSelectionInput, type RankedLayout, type WebsiteLayoutBlueprint } from "./website-layout-blueprints";

export const WEBSITE_LAYOUT_LIBRARY: readonly WebsiteLayoutBlueprint[] = [
  ...DENTAL_LAYOUT_BLUEPRINTS,
];

export function layoutsForIndustry(industry: string, options: { includeDrafts?: boolean } = {}): WebsiteLayoutBlueprint[] {
  const normalized = industry.trim().toLowerCase();
  return WEBSITE_LAYOUT_LIBRARY.filter((layout) => {
    if (layout.industry !== normalized) return false;
    return options.includeDrafts ? layout.status !== "retired" : layout.status === "certified";
  });
}

export function findWebsiteLayout(id: string): WebsiteLayoutBlueprint | undefined {
  return WEBSITE_LAYOUT_LIBRARY.find((layout) => layout.id === id);
}

export function recommendWebsiteLayouts(input: LayoutSelectionInput, limit = 5): RankedLayout[] {
  return rankWebsiteLayouts(WEBSITE_LAYOUT_LIBRARY, input).slice(0, Math.max(1, limit));
}

/** Internal design workflow: drafts are visible to MiCirql's layout studio before certification. */
export function draftLayoutsForIndustry(industry: string): WebsiteLayoutBlueprint[] {
  return layoutsForIndustry(industry, { includeDrafts: true }).filter((layout) => layout.status === "draft");
}

export const WEBSITE_LAYOUT_LIBRARY_ISSUES = validateLayoutLibrary(WEBSITE_LAYOUT_LIBRARY);
