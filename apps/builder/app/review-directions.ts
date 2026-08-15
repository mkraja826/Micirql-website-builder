import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import { applyIndustryPreset } from "./apply-industry-preset";
import { rankPresets, type OnboardingProfile } from "./preset-ranking";

export type ReviewDirection = {
  id: string;
  name: string;
  description: string;
  reasons: string[];
  site: Site;
  themeFamily: string;
  variantSeed: number;
};

export function buildReviewDirections(site: Site, profile: OnboardingProfile, count = 20): ReviewDirection[] {
  const ranked = rankPresets(profile);
  const out: ReviewDirection[] = [];
  const seen = new Set<string>();

  for (let round = 0; out.length < count && round < 8; round += 1) {
    for (const item of ranked) {
      if (out.length >= count) break;
      const base = applyIndustryPreset(site, item.preset);
      const varied = varySectionLayouts(base, round);
      const signature = varied.pages.flatMap((page) => page.sections.map((section) => section.component.componentId)).join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);
      const suffix = round === 0 ? "" : ` · Direction ${round + 1}`;
      out.push({
        id: `${item.preset.id}-${round + 1}`,
        name: `${item.preset.name}${suffix}`,
        description: item.preset.description,
        reasons: item.reasons,
        site: varied,
        themeFamily: item.preset.theme.family,
        variantSeed: round,
      });
    }
  }

  return out.slice(0, count);
}

function varySectionLayouts(site: Site, seed: number): Site {
  if (seed === 0) return site;
  const next = structuredClone(site);
  for (const page of next.pages) {
    page.sections.forEach((section, index) => {
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (!family) return;
      const current = sectionVariantFromComponentId(section.component.componentId);
      const offset = ((seed + index * 2) % 5) as number;
      const variant = ((((current - 1 + offset) % 5) + 1) as SectionVariant);
      section.component.componentId = sectionDesignId(next.theme.family, family, variant);
    });
  }
  return next;
}

function sectionFamilyFromComponentId(componentId: string): SectionFamily | undefined {
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function sectionVariantFromComponentId(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? value as SectionVariant : 1;
}
