import { siteSchema, type Site } from "@micirql/schema";

const LAYOUT_IDENTITY_KEYS = [
  "layoutBlueprintId",
  "layoutArchetype",
  "layoutDensity",
  "layoutImageStyle",
  "layoutRhythm",
  "layoutRadius",
  "layoutPaletteIds",
  "layoutTypographyIds",
  "layoutVisualLocked",
  "layoutMobileRules",
] as const;

export type DentalMultipageLayoutIdentityResult = {
  site: Site;
  applied: boolean;
  layoutBlueprintId?: string;
  pagesUpdated: number;
};

/**
 * Carries the certified homepage visual identity into generated secondary pages.
 * Section-specific layout IDs/patterns are intentionally not copied: treatment
 * sections have their own semantic role, while the site-level blueprint still
 * owns typography, rhythm, palette, radius and responsive art direction.
 */
export function applyDentalMultipageLayoutIdentity(site: Site): DentalMultipageLayoutIdentityResult {
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  if (!home) return { site, applied: false, pagesUpdated: 0 };

  const source = home.sections.find((section) => typeof section.props.layoutBlueprintId === "string" && section.props.layoutBlueprintId.trim());
  const layoutBlueprintId = typeof source?.props.layoutBlueprintId === "string" ? source.props.layoutBlueprintId.trim() : "";
  if (!source || !layoutBlueprintId) return { site, applied: false, pagesUpdated: 0 };

  const identity: Record<string, unknown> = {};
  for (const key of LAYOUT_IDENTITY_KEYS) {
    const value = source.props[key];
    if (value !== undefined) identity[key] = structuredClone(value);
  }

  let pagesUpdated = 0;
  for (const page of next.pages) {
    if (page.path === "/") continue;
    let pageChanged = false;
    page.sections = page.sections.map((section) => {
      const missingIdentity = Object.keys(identity).some((key) => section.props[key] === undefined);
      if (!missingIdentity) return section;
      pageChanged = true;
      return { ...section, props: { ...identity, ...section.props } };
    });
    if (pageChanged) pagesUpdated += 1;
  }

  return {
    site: siteSchema.parse(next),
    applied: pagesUpdated > 0,
    layoutBlueprintId,
    pagesUpdated,
  };
}
