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
  "mi-dental-tools-drawer",
  "mi-dental-modern-instruments",
  "mi-dental-treatment-tray",
  "mi-dental-workstation-tool",
  "mi-dental-colourful-tools",
  "mi-dental-high-tech-tools",
  "mi-dental-blue-equipment",
  "mi-dental-tools-green",
  "mi-dental-modern-office",
  "mi-dental-steel-tools",
  "mi-dental-models-blue",
  "mi-dental-clinic-toolset",
  "mi-dental-chair-equipment",
  "mi-dental-instrument-console",
  "mi-dental-consultation-model",
  "mi-dental-friendly-consultation",
  "mi-dental-chairside-conversation",
  "mi-dental-positive-checkup",
  "mi-dental-treatment-explanation",
  "mi-dental-reception-consultation",
] as const;

export const DENTAL_HERO_ASSETS_BY_IMAGE_STRATEGY = {
  documentary: [
    "mi-dental-documentary-clinic",
    "mi-dental-reception-consultation",
    "mi-dental-clinic-toolset",
    "mi-dental-chair-equipment",
    "mi-dental-high-tech-tools",
  ],
  "editorial-crop": [
    "mi-dental-editorial-pattern",
    "mi-dental-consultation-model",
    "mi-dental-treatment-explanation",
    "mi-dental-reception-consultation",
    "mi-dental-blue-equipment",
    "mi-dental-steel-tools",
    "mi-dental-models-blue",
  ],
  immersive: [
    "mi-dental-chairside-conversation",
    "mi-dental-friendly-consultation",
    "mi-dental-treatment-explanation",
    "mi-dental-smile-contour",
    "mi-dental-workstation-tool",
  ],
  "product-detail": [
    "mi-dental-precision-instruments",
    "mi-dental-modern-instruments",
  ],
  "people-led": [
    "mi-dental-friendly-consultation",
    "mi-dental-positive-checkup",
    "mi-dental-chairside-conversation",
    "mi-dental-reception-consultation",
    "mi-dental-welcoming-clinic",
    "mi-dental-modern-office",
  ],
  restrained: [
    "mi-dental-calm-clinic",
    "mi-dental-positive-checkup",
    "mi-dental-welcoming-clinic",
    "mi-dental-treatment-tray",
    "mi-dental-tools-drawer",
    "mi-dental-instrument-console",
  ],
} as const satisfies Record<ImageStrategy, readonly string[]>;

const DENTAL_HOME_HERO_ASSET_BY_RECIPE = {
  precision: "mi-dental-calm-clinic",
  "calm-clarity": "mi-dental-positive-checkup",
  "editorial-authority": "mi-dental-editorial-pattern",
  "quiet-luxury": "mi-dental-smile-contour",
  "modern-assurance": "mi-dental-precision-instruments",
  "human-connection": "mi-dental-friendly-consultation",
  "future-ready": "mi-dental-modern-instruments",
  "story-led": "mi-dental-treatment-explanation",
  "bold-momentum": "mi-dental-blue-equipment",
  "local-character": "mi-dental-documentary-clinic",
  "structured-confidence": "mi-dental-clinic-toolset",
  "clear-path": "mi-dental-treatment-tray",
  "field-journal": "mi-dental-chair-equipment",
  "premium-welcome": "mi-dental-reception-consultation",
  "contemporary-grid": "mi-dental-high-tech-tools",
  "warm-authority": "mi-dental-consultation-model",
  "evidence-first": "mi-dental-tools-drawer",
  "immersive-narrative": "mi-dental-chairside-conversation",
  "vibrant-practice": "mi-dental-modern-office",
  "gentle-confidence": "mi-dental-welcoming-clinic",
} as const;

const DENTAL_SUPPORTING_ASSET_IDS_BY_FAMILY = {
  services: [
    "mi-dental-tools-drawer",
    "mi-dental-modern-instruments",
    "mi-dental-treatment-tray",
    "mi-dental-workstation-tool",
    "mi-dental-colourful-tools",
    "mi-dental-blue-equipment",
    "mi-dental-tools-green",
    "mi-dental-steel-tools",
    "mi-dental-models-blue",
    "mi-dental-clinic-toolset",
    "mi-dental-chair-equipment",
    "mi-dental-instrument-console",
    "mi-dental-precision-instruments",
    "mi-dental-high-tech-tools",
  ],
  features: [
    "mi-dental-consultation-model",
    "mi-dental-friendly-consultation",
    "mi-dental-chairside-conversation",
    "mi-dental-positive-checkup",
    "mi-dental-treatment-explanation",
    "mi-dental-reception-consultation",
    "mi-dental-modern-office",
    "mi-dental-welcoming-clinic",
    "mi-dental-calm-clinic",
    "mi-dental-documentary-clinic",
  ],
  about: [
    "mi-dental-reception-consultation",
    "mi-dental-consultation-model",
    "mi-dental-friendly-consultation",
    "mi-dental-positive-checkup",
    "mi-dental-treatment-explanation",
    "mi-dental-chairside-conversation",
    "mi-dental-welcoming-clinic",
    "mi-dental-modern-office",
    "mi-dental-calm-clinic",
    "mi-dental-documentary-clinic",
  ],
} as const satisfies Record<
  "about" | "features" | "services",
  readonly string[]
>;

type DentalSupportingFamily =
  keyof typeof DENTAL_SUPPORTING_ASSET_IDS_BY_FAMILY;

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
  const assetIds = DENTAL_HERO_ASSET_IDS;
  const homeAssetId =
    DENTAL_HOME_HERO_ASSET_BY_RECIPE[
      preset.recipeId as keyof typeof DENTAL_HOME_HERO_ASSET_BY_RECIPE
    ];
  const candidateOffset = homeAssetId
    ? assetIds.indexOf(homeAssetId)
    : Math.max(0, preset.rankSeed - 1) % assetIds.length;
  const pageHeroAssetIds = new Map<string, string>();
  const reservedHeroAssetIds = new Set<string>();
  for (const [pageIndex, page] of next.pages.entries()) {
    const start = dentalPageMediaSlot(page.path, pageIndex) + candidateOffset;
    const assetId = nextAvailableDentalAssetId(
      assetIds,
      start,
      reservedHeroAssetIds,
    );
    pageHeroAssetIds.set(page.id, assetId);
    reservedHeroAssetIds.add(assetId);
  }
  const siteAssetUseCounts = new Map<string, number>();

  for (const [pageIndex, page] of next.pages.entries()) {
    const usedAssetIds = new Set<string>();
    const assetId = pageHeroAssetIds.get(page.id) ?? assetIds[0];
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
      if (family === "hero") {
        if (shouldApplyDentalHero(section.props.image)) {
          section.props.image = dentalAssetReference(asset);
        }
        const currentAssetId = imageAssetId(section.props.image);
        if (currentAssetId) {
          usedAssetIds.add(currentAssetId);
          incrementAssetUse(siteAssetUseCounts, currentAssetId);
        }
        continue;
      }
      if (
        section.hidden ||
        !isDentalSupportingFamily(family) ||
        !Array.isArray(section.props.items)
      ) {
        continue;
      }
      const familyOffset =
        family === "services" ? 3 : family === "features" ? 9 : 14;
      section.props.items = section.props.items.map((item, itemIndex) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return item;
        }
        const record = item as Record<string, unknown>;
        if (hasRenderableImage(record.image)) {
          const currentAssetId = imageAssetId(record.image);
          if (currentAssetId) {
            usedAssetIds.add(currentAssetId);
            incrementAssetUse(siteAssetUseCounts, currentAssetId);
          }
          return record;
        }
        const supportingAsset = nextBalancedDentalAsset(
          DENTAL_SUPPORTING_ASSET_IDS_BY_FAMILY[family],
          assetIds,
          candidateOffset + pageIndex * 5 + familyOffset + itemIndex,
          usedAssetIds,
          reservedHeroAssetIds,
          siteAssetUseCounts,
        );
        usedAssetIds.add(supportingAsset.id);
        incrementAssetUse(siteAssetUseCounts, supportingAsset.id);
        return { ...record, image: dentalAssetReference(supportingAsset) };
      });
    }
  }
  return siteSchema.parse(next);
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
    heroAssets.length > 1 &&
    new Set(heroAssets.map(({ assetId }) => assetId)).size !== heroAssets.length
  ) {
    issues.push({
      code: "DENTAL_HERO_MEDIA_REPEATED",
      message:
        "The required dental pages must not reuse one hero image across the site.",
      severity: "error",
    });
  }
  const heroAssetIds = new Set(heroAssets.map(({ assetId }) => assetId));
  const supportingAssetUseCounts = new Map<string, number>();
  for (const page of site.pages) {
    const pageSources = new Set<string>();
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (
        section.hidden ||
        !family ||
        !["about", "services", "features"].includes(family) ||
        !Array.isArray(section.props.items)
      ) {
        continue;
      }
      const items = section.props.items.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      );
      const sources = items.flatMap((item) => {
        const source = imageSource(item.image);
        return source ? [source] : [];
      });
      const minimum = Math.min(items.length, family === "services" ? 3 : 2);
      if (sources.length < minimum) {
        issues.push({
          code: "DENTAL_SUPPORTING_MEDIA_SPARSE",
          message: `The ${page.name} ${family} section needs at least ${minimum} supporting images.`,
          severity: "error",
        });
      }
      for (const source of sources) {
        if (pageSources.has(source)) {
          issues.push({
            code: "DENTAL_SUPPORTING_MEDIA_REPEATED",
            message: `The ${page.name} page repeats a supporting image within its content.`,
            severity: "error",
          });
          break;
        }
        pageSources.add(source);
      }
      for (const item of items) {
        const assetId = imageAssetId(item.image);
        if (!assetId) continue;
        supportingAssetUseCounts.set(
          assetId,
          (supportingAssetUseCounts.get(assetId) ?? 0) + 1,
        );
        if (heroAssetIds.has(assetId)) {
          issues.push({
            code: "DENTAL_MEDIA_ROLE_REUSED",
            message: `The ${page.name} page reuses a site hero image as supporting media.`,
            severity: "error",
          });
        }
      }
    }
  }
  for (const [assetId, count] of supportingAssetUseCounts) {
    if (count <= 2) continue;
    issues.push({
      code: "DENTAL_SUPPORTING_MEDIA_OVERUSED",
      message: `Supporting asset ${assetId} appears ${count} times across the site; certified Dental sites may use it at most twice.`,
      severity: "error",
    });
  }
  return issues;
}

function nextAvailableDentalAssetId(
  assetIds: readonly string[],
  start: number,
  excludedAssetIds: ReadonlySet<string>,
): string {
  for (let probe = 0; probe < assetIds.length; probe += 1) {
    const assetId = assetIds[(start + probe) % assetIds.length];
    const asset = assetId ? demoAssetById(assetId) : undefined;
    if (
      asset &&
      asset.active &&
      asset.license === "licensed" &&
      !excludedAssetIds.has(asset.id)
    ) {
      return asset.id;
    }
  }
  throw new Error("No unused certified dental hero asset is available.");
}

function nextBalancedDentalAsset(
  preferredAssetIds: readonly string[],
  fallbackAssetIds: readonly string[],
  start: number,
  pageAssetIds: ReadonlySet<string>,
  reservedHeroAssetIds: ReadonlySet<string>,
  siteAssetUseCounts: ReadonlyMap<string, number>,
) {
  for (const candidates of [preferredAssetIds, fallbackAssetIds]) {
    let selected: NonNullable<ReturnType<typeof demoAssetById>> | undefined;
    let selectedUseCount = Number.POSITIVE_INFINITY;
    for (let probe = 0; probe < candidates.length; probe += 1) {
      const assetId = candidates[(start + probe) % candidates.length];
      const asset = assetId ? demoAssetById(assetId) : undefined;
      if (
        !asset ||
        !asset.active ||
        asset.license !== "licensed" ||
        pageAssetIds.has(asset.id) ||
        reservedHeroAssetIds.has(asset.id)
      ) {
        continue;
      }
      const useCount = siteAssetUseCounts.get(asset.id) ?? 0;
      if (useCount < selectedUseCount) {
        selected = asset;
        selectedUseCount = useCount;
      }
    }
    if (selected) return selected;
  }
  throw new Error("No unused certified dental supporting asset is available.");
}

function incrementAssetUse(counts: Map<string, number>, assetId: string) {
  counts.set(assetId, (counts.get(assetId) ?? 0) + 1);
}

function isDentalSupportingFamily(
  family: SectionFamily | undefined,
): family is DentalSupportingFamily {
  return family === "about" || family === "features" || family === "services";
}

function dentalAssetReference(
  asset: NonNullable<ReturnType<typeof demoAssetById>>,
) {
  return {
    assetId: asset.id,
    src: asset.originalUrl,
    alt: asset.alt,
    focalPoint: asset.focalPoint,
    license: asset.license,
    ...(asset.sourceReference
      ? { sourceReference: asset.sourceReference }
      : {}),
  };
}

function hasRenderableImage(value: unknown) {
  return Boolean(imageSource(value) || imageAssetId(value));
}

function imageAssetId(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const assetId = (value as Record<string, unknown>).assetId;
  return typeof assetId === "string" && assetId.trim()
    ? assetId.trim()
    : undefined;
}

function imageSource(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const image = value as Record<string, unknown>;
  const source =
    typeof image.src === "string"
      ? image.src
      : typeof image.originalUrl === "string"
        ? image.originalUrl
        : undefined;
  return source?.trim() || undefined;
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
