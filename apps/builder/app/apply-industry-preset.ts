import { siteSchema, type ImageStrategy, type Site } from "@micirql/schema";
import {
  DENTAL_COMPONENT_VERSION,
  FAMILY_CODES,
  SECTION_FAMILIES,
  sectionDesignId,
  type SectionFamily,
  type SectionVariant,
} from "@micirql/sections";
import { applyBrandInput } from "./brand-provenance";
import { demoAssetById } from "./demo-assets";
import type { IndustryDesignPreset } from "./industry-design-preset-data";

export const DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY = {
  documentary: "mi-dental-documentary-clinic",
  "editorial-crop": "mi-dental-editorial-pattern",
  immersive: "mi-dental-smile-contour",
  "product-detail": "mi-dental-precision-instruments",
  "people-led": "mi-dental-welcoming-clinic",
  restrained: "mi-dental-calm-clinic",
} as const satisfies Record<ImageStrategy, string>;

type ApplyIndustryPresetOptions = {
  applyCertifiedMedia?: boolean;
};

export function applyIndustryPreset(
  site: Site,
  preset: IndustryDesignPreset,
  options: ApplyIndustryPresetOptions = {},
): Site {
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
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (!family) continue;
      const variant =
        preset.variants[family] ??
        sectionVariantFromComponentId(section.component.componentId);
      section.component = {
        componentId: sectionDesignId(preset.theme.family, family, variant),
        version: DENTAL_COMPONENT_VERSION,
      };
    }
    page.sections = orderSections(page.sections, preset.sectionOrder);
  }
  return options.applyCertifiedMedia === false
    ? siteSchema.parse(next)
    : applyCertifiedDentalMedia(next, preset);
}

export function applyCertifiedDentalMedia(
  site: Site,
  preset: IndustryDesignPreset,
): Site {
  const next = structuredClone(site);
  const assetId = DENTAL_HERO_ASSET_BY_IMAGE_STRATEGY[preset.imageStrategy];
  const asset = demoAssetById(assetId);
  if (!asset) {
    throw new Error(`Missing certified dental hero asset ${assetId}.`);
  }
  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (family !== "hero" || !shouldApplyDentalHero(section.props.image)) {
        continue;
      }
      section.props.image = {
        assetId,
        src: asset.originalUrl,
        alt: asset.alt,
        focalPoint: asset.focalPoint,
        license: asset.license,
        ...(asset.sourceReference
          ? { sourceReference: asset.sourceReference }
          : {}),
      };
    }
  }
  return siteSchema.parse(next);
}

function shouldApplyDentalHero(value: unknown): boolean {
  if (typeof value === "string") return false;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const image = value as Record<string, unknown>;
  const assetId =
    typeof image.assetId === "string" && image.assetId.trim()
      ? image.assetId.trim()
      : undefined;
  if (assetId) {
    const registered = demoAssetById(assetId);
    return registered?.source === "micirql-placeholder";
  }
  const source =
    typeof image.src === "string" && image.src.trim()
      ? image.src
      : typeof image.originalUrl === "string" && image.originalUrl.trim()
        ? image.originalUrl
        : undefined;
  return Boolean(source && isLegacyDentalPlaceholder(source));
}

function isLegacyDentalPlaceholder(source: string): boolean {
  return source.startsWith("/assets/placeholders/dental-");
}

function orderSections<T extends Site["pages"][number]["sections"][number]>(
  sections: T[],
  order: SectionFamily[],
): T[] {
  const rank = new Map(order.map((family, index) => [family, index]));
  return sections
    .map((section, originalIndex) => ({
      section,
      originalIndex,
      family: sectionFamilyFromComponentId(section.component.componentId),
    }))
    .sort(
      (left, right) =>
        sectionRank(left.family, left.originalIndex, rank) -
        sectionRank(right.family, right.originalIndex, rank),
    )
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

function sectionFamilyFromComponentId(
  componentId: string,
): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}

function sectionVariantFromComponentId(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? (value as SectionVariant) : 1;
}
