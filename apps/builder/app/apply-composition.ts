import { siteSchema, type Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { WebsiteComposition } from "./composition-intelligence";

/**
 * Applies MiCirql's composition decision to an already generated draft without
 * allowing the intelligence layer to invent content or arbitrary components.
 * Existing section objects are reused, so bindings/content/media survive.
 */
export function applyComposition(site: Site, composition: WebsiteComposition): Site {
  const next = structuredClone(site);
  next.theme = mergeThemeKeepingBrand(next, composition);

  for (const page of next.pages) {
    if (!page.sections.length) continue;
    const buckets = new Map<SectionFamily, typeof page.sections>();
    const unknown: typeof page.sections = [];

    for (const section of page.sections) {
      const family = familyFromId(section.component.componentId);
      if (!family) { unknown.push(section); continue; }
      const bucket = buckets.get(family) ?? [];
      bucket.push(section);
      buckets.set(family, bucket);
    }

    const ordered: typeof page.sections = [];
    for (const decision of composition.sections) {
      const bucket = buckets.get(decision.family);
      if (!bucket?.length) continue; // never fabricate a section here
      for (const section of bucket) {
        section.component = {
          componentId: sectionDesignId(composition.preset.theme.family, decision.family, decision.variant),
          version: section.component.version,
        };
        ordered.push(section);
      }
      buckets.delete(decision.family);
    }

    // Keep any builder-generated families that were not selected by the
    // composition model. This makes rollout lossless while still reordering
    // every recognized family the model understands.
    for (const sections of buckets.values()) ordered.push(...sections);
    ordered.push(...unknown);
    page.sections = ordered;
  }
  return siteSchema.parse(next);
}

function mergeThemeKeepingBrand(site: Site, composition: WebsiteComposition) {
  const existingColors = structuredClone(site.theme.brand.colors);
  const theme = structuredClone(composition.preset.theme);
  theme.brand.colors = existingColors;
  return theme;
}

function familyFromId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(f => normalized === `${f}.placeholder` || normalized.startsWith(`${f}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find(f => upper.includes(`-${FAMILY_CODES[f]}-`));
}

export function currentVariant(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? value as SectionVariant : 1;
}
