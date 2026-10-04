import { siteSchema, type Site } from "@micirql/schema";
import {
  DENTAL_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  sectionDesignId,
  type SectionFamily,
  type SectionVariant,
} from "@micirql/sections";
import { applyBrandInput } from "./brand-provenance";
import type { IndustryDesignPreset } from "./industry-design-preset-data";

export function applyIndustryPreset(site: Site, preset: IndustryDesignPreset): Site {
  const next = structuredClone(site);
  const currentLogoAssetId = next.theme.brand.logoAssetId;
  next.theme = applyBrandInput(
    preset.theme,
    next.generation?.brandInput,
    next.generation?.brandProvenance,
  );
  if (currentLogoAssetId && !next.theme.brand.logoAssetId) {
    next.theme.brand.logoAssetId = currentLogoAssetId;
  }

  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (!family) continue;
      const variant = preset.variants[family] ?? sectionVariantFromComponentId(section.component.componentId);
      section.component = {
        componentId: sectionDesignId(preset.theme.family, family, variant),
        version: DENTAL_COMPONENT_VERSION,
      };
    }
    page.sections = orderSections(page.sections, preset.sectionOrder);
  }
  return siteSchema.parse(next);
}

function orderSections<T extends Site["pages"][number]["sections"][number]>(
  sections: T[],
  order: SectionFamily[],
): T[] {
  const rank = new Map(order.map((family, index) => [family, index]));
  return sections
    .map((section, originalIndex) => ({ section, originalIndex, family: sectionFamilyFromComponentId(section.component.componentId) }))
    .sort((left, right) => sectionRank(left.family, left.originalIndex, rank) - sectionRank(right.family, right.originalIndex, rank))
    .map(({ section }) => section);
}

function sectionRank(
  family: SectionFamily | undefined,
  originalIndex: number,
  order: Map<SectionFamily, number>,
): number {
  if (family === "navbar") return -1000;
  if (family === "footer") return 10000;
  if (!family) return 9000 + originalIndex;
  return order.get(family) ?? 8000 + originalIndex;
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
