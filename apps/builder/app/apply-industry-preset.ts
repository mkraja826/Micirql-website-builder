import {
  siteSchema,
  type CompositionGateIssue,
  type ImageStrategy,
  type Site,
} from "@micirql/schema";
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

const DENTAL_HERO_ASSET_IDS = [
  "mi-dental-calm-clinic",
  "mi-dental-smile-contour",
  "mi-dental-precision-instruments",
  "mi-dental-editorial-pattern",
  "mi-dental-documentary-clinic",
  "mi-dental-welcoming-clinic",
] as const;

export const DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY = {
  documentary: dentalHeroAssetSequence("mi-dental-documentary-clinic"),
  "editorial-crop": dentalHeroAssetSequence("mi-dental-editorial-pattern"),
  immersive: dentalHeroAssetSequence("mi-dental-smile-contour"),
  "product-detail": dentalHeroAssetSequence("mi-dental-precision-instruments"),
  "people-led": dentalHeroAssetSequence("mi-dental-welcoming-clinic"),
  restrained: dentalHeroAssetSequence("mi-dental-calm-clinic"),
} as const satisfies Record<ImageStrategy, readonly string[]>;

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
  const assetIds = DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY[preset.imageStrategy];
  for (const [pageIndex, page] of next.pages.entries()) {
    const assetId =
      assetIds[dentalPageMediaSlot(page.path, pageIndex) % assetIds.length] ??
      assetIds[0];
    if (!assetId) {
      throw new Error(
        `No certified dental media is configured for ${preset.imageStrategy}.`,
      );
    }
    const asset = demoAssetById(assetId);
    if (!asset) {
      throw new Error(`Missing certified dental hero asset ${assetId}.`);
    }
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

function dentalHeroAssetSequence(primaryAssetId: string) {
  return [
    primaryAssetId,
    ...DENTAL_HERO_ASSET_IDS.filter(
      (candidate) => candidate !== primaryAssetId,
    ),
  ];
}

export function certifiedDentalMediaIssues(site: Site): CompositionGateIssue[] {
  const requiredPaths = new Set([
    "/",
    "/services",
    "/doctors",
    "/about",
    "/contact",
  ]);
  const heroAssets = site.pages
    .filter((page) => requiredPaths.has(page.path))
    .map((page) => {
      const hero = page.sections.find(
        (section) =>
          sectionFamilyFromComponentId(section.component.componentId) ===
          "hero",
      );
      const image =
        hero?.props.image &&
        typeof hero.props.image === "object" &&
        !Array.isArray(hero.props.image)
          ? (hero.props.image as Record<string, unknown>)
          : undefined;
      const assetId =
        typeof image?.assetId === "string" ? image.assetId.trim() : "";
      return { page, assetId, asset: demoAssetById(assetId) };
    });
  const issues: CompositionGateIssue[] = [];
  for (const { page, assetId, asset } of heroAssets) {
    if (
      !assetId ||
      !asset?.active ||
      asset.license !== "licensed" ||
      !asset.sourceReference?.startsWith("https://www.pexels.com/")
    ) {
      issues.push({
        code: "DENTAL_HERO_MEDIA_NOT_CERTIFIED",
        message: `The ${page.name} hero does not use an active, licensed dental media asset with provenance.`,
        severity: "error",
      });
    }
  }
  if (
    heroAssets.length === requiredPaths.size &&
    new Set(heroAssets.map(({ assetId }) => assetId)).size !== heroAssets.length
  ) {
    issues.push({
      code: "DENTAL_HERO_MEDIA_REPEATED",
      message:
        "The required dental pages must not reuse one hero image across the site.",
      severity: "error",
    });
  }
  return issues;
}

function dentalPageMediaSlot(path: string, fallbackIndex: number): number {
  const normalized = path.trim().toLowerCase().replace(/\/$/, "") || "/";
  if (normalized === "/") return 0;
  if (/service|treatment/.test(normalized)) return 1;
  if (/doctor|team|people|staff/.test(normalized)) return 2;
  if (/about|story/.test(normalized)) return 3;
  if (/contact|appointment|book|enquir/.test(normalized)) return 4;
  return fallbackIndex;
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
