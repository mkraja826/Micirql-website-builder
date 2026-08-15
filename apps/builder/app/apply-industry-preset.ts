import { siteSchema, type Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import type { IndustryDesignPreset } from "./industry-design-preset-data";

export function applyIndustryPreset(site: Site, preset: IndustryDesignPreset): Site {
  const next = structuredClone(site);
  const existingColors = structuredClone(next.theme.brand.colors);
  next.theme = structuredClone(preset.theme);
  // The uploaded/logo-derived palette is authoritative. Design directions may
  // change layout, typography, density, shape and motion, but must not silently
  // replace the user's brand colors.
  next.theme.brand.colors = existingColors;
  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (!family) continue;
      const variant = preset.variants[family] ?? sectionVariantFromComponentId(section.component.componentId);
      section.component.componentId = sectionDesignId(preset.theme.family, family, variant);
    }
  }
  return siteSchema.parse(next);
}

function sectionFamilyFromComponentId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function sectionVariantFromComponentId(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? value as SectionVariant : 1;
}
