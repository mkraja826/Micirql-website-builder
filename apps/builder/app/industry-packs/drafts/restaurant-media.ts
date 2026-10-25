import {
  siteSchema,
  type CompositionGateIssue,
  type Site,
} from "@micirql/schema";
import { demoAssetById } from "../../demo-assets";
import {
  RESTAURANT_DRAFT_MEDIA_IDS,
  type RestaurantDraftMediaRole,
} from "./restaurant-media-assets";

const REQUIRED_HERO_PATHS = [
  "/",
  "/menu",
  "/visit",
  "/reservations",
  "/story",
  "/contact",
] as const;

const HERO_MEDIA_IDS = RESTAURANT_DRAFT_MEDIA_IDS.slice(0, 6);
const SUPPORTING_MEDIA_IDS = RESTAURANT_DRAFT_MEDIA_IDS.slice(6);
const SUPPORTING_COUNTS = new Map<string, number>([
  ["/", 5],
  ["/menu", 2],
  ["/visit", 2],
  ["/story", 1],
]);

const PROHIBITED_STOCK_FAMILIES = new Set(["services", "team", "testimonials"]);

const VISITOR_DISCLOSURE =
  "Preview imagery is illustrative and may not show this restaurant or its menu.";
const AUDIT_DISCLOSURE =
  "Illustrative stock photography for layout review; not a verified dish, portion, venue, amenity, ingredient, process, or staff image from this restaurant.";

/**
 * Applies a deterministic internal visual-QA pool. This is deliberately not a
 * production media selector: its visible disclosure prevents stock from being
 * mistaken for merchant evidence, and supplied non-placeholder media wins.
 */
export function applyRestaurantDraftMedia(site: Site, seed = 0): Site {
  const next = structuredClone(site);
  const heroOffset = normalizeOffset(seed, HERO_MEDIA_IDS.length);
  const supportOffset = normalizeOffset(seed * 3, SUPPORTING_MEDIA_IDS.length);
  let supportCursor = 0;

  for (const [pageIndex, page] of next.pages.entries()) {
    const hero = page.sections.find(
      (section) => sectionFamily(section.component.componentId) === "hero",
    );
    const heroAsset = requiredAsset(
      HERO_MEDIA_IDS[
        normalizeOffset(heroOffset + pageIndex, HERO_MEDIA_IDS.length)
      ]!,
    );
    if (hero && shouldApplyDraftMedia(hero.props.image)) {
      hero.props.image = assetReference(heroAsset);
      hero.props.description = appendVisitorDisclosure(hero.props.description);
    }

    const requestedSupporting = SUPPORTING_COUNTS.get(page.path) ?? 0;
    if (requestedSupporting === 0) continue;
    const gallery = page.sections.find(
      (section) => sectionFamily(section.component.componentId) === "gallery",
    );
    if (!gallery || hasNonDraftImage(gallery.props)) continue;

    const items = Array.from({ length: requestedSupporting }, (_, index) => {
      const asset = requiredAsset(
        SUPPORTING_MEDIA_IDS[
          normalizeOffset(
            supportOffset + supportCursor + index,
            SUPPORTING_MEDIA_IDS.length,
          )
        ]!,
      );
      return {
        title: asset.name,
        description: AUDIT_DISCLOSURE,
        image: assetReference(asset),
      };
    });
    supportCursor += requestedSupporting;
    gallery.hidden = false;
    gallery.props = {
      ...gallery.props,
      title: galleryTitle(page.path),
      description: VISITOR_DISCLOSURE,
      items,
    };
  }

  return siteSchema.parse(next);
}

export function restaurantDraftMediaIssues(site: Site): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  const siteAssetIds = new Set<string>();
  const heroAssetIds: string[] = [];
  const nonHeroDraftAssetIds = new Set<string>();

  for (const page of site.pages) {
    const visibleReferences: Array<{
      assetId: string;
      alt: string;
      family: string;
      disclosed: boolean;
    }> = [];

    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = sectionFamily(section.component.componentId);
      const disclosed = JSON.stringify(section.props)
        .toLowerCase()
        .includes("not a verified");
      for (const reference of imageReferences(section.props)) {
        visibleReferences.push({ ...reference, family, disclosed });
        if (
          family !== "hero" &&
          RESTAURANT_DRAFT_MEDIA_IDS.includes(reference.assetId)
        ) {
          nonHeroDraftAssetIds.add(reference.assetId);
        }
      }
    }

    const pageIds = visibleReferences.map((reference) => reference.assetId);
    if (new Set(pageIds).size !== pageIds.length) {
      issues.push({
        code: "RESTAURANT_PAGE_MEDIA_REPEATED",
        message: `${page.path} repeats an image within the page.`,
        severity: "error",
      });
    }

    for (const reference of visibleReferences) {
      siteAssetIds.add(reference.assetId);
      if (!RESTAURANT_DRAFT_MEDIA_IDS.includes(reference.assetId)) continue;
      const asset = demoAssetById(reference.assetId);
      if (
        !asset ||
        !asset.active ||
        asset.license !== "licensed" ||
        !asset.sourceReference?.startsWith("https://www.pexels.com/") ||
        !asset.domains.includes("restaurant") ||
        !asset.subtypes.includes("restaurant") ||
        !reference.alt.toLowerCase().includes("illustrative") ||
        !reference.alt.toLowerCase().includes("not a verified")
      ) {
        issues.push({
          code: "RESTAURANT_MEDIA_NOT_AUDITED",
          message: `${page.path} contains Restaurant draft media without active provenance, an illustrative label, or meaningful alternative text.`,
          severity: "error",
        });
      }
      if (PROHIBITED_STOCK_FAMILIES.has(reference.family)) {
        issues.push({
          code: "RESTAURANT_STOCK_EVIDENCE_RISK",
          message: `${page.path} uses illustrative stock media in ${reference.family}, where it could imply a real menu item, staff member, or customer proof.`,
          severity: "error",
        });
      }
      if (!reference.disclosed) {
        issues.push({
          code: "RESTAURANT_STOCK_DISCLOSURE_MISSING",
          message: `${page.path} does not visibly disclose that draft stock photography is illustrative rather than merchant evidence.`,
          severity: "error",
        });
      }
    }

    const hero = page.sections.find(
      (section) =>
        !section.hidden &&
        sectionFamily(section.component.componentId) === "hero",
    );
    const heroReference = imageReferences(hero?.props).at(0);
    if (
      REQUIRED_HERO_PATHS.includes(
        page.path as (typeof REQUIRED_HERO_PATHS)[number],
      )
    ) {
      if (!heroReference) {
        issues.push({
          code: "RESTAURANT_HERO_MEDIA_MISSING",
          message: `${page.path} does not have a hero image.`,
          severity: "error",
        });
      } else {
        heroAssetIds.push(heroReference.assetId);
      }
    }

    if (page.path === "/") {
      if (visibleReferences.length < 6) {
        issues.push({
          code: "RESTAURANT_HOME_MEDIA_SPARSE",
          message: "Restaurant Home needs at least six meaningful images.",
          severity: "error",
        });
      }
      if (visibleReferences.length > 9) {
        issues.push({
          code: "RESTAURANT_HOME_MEDIA_DENSE",
          message: "Restaurant Home must stay within nine meaningful images.",
          severity: "error",
        });
      }
    }
  }

  if (
    heroAssetIds.length !== REQUIRED_HERO_PATHS.length ||
    new Set(heroAssetIds).size !== heroAssetIds.length
  ) {
    issues.push({
      code: "RESTAURANT_HERO_MEDIA_REPEATED",
      message: "Every required Restaurant route needs a distinct hero image.",
      severity: "error",
    });
  }
  if (heroAssetIds.some((assetId) => nonHeroDraftAssetIds.has(assetId))) {
    issues.push({
      code: "RESTAURANT_HERO_MEDIA_REUSED",
      message:
        "A Restaurant hero image is reused as supporting content elsewhere.",
      severity: "error",
    });
  }
  if (siteAssetIds.size < 12 || siteAssetIds.size > 18) {
    issues.push({
      code: "RESTAURANT_SITE_MEDIA_RANGE",
      message: `The Restaurant site uses ${siteAssetIds.size} distinct images; the draft contract requires 12–18.`,
      severity: "error",
    });
  }

  return deduplicate(issues);
}

export function restaurantDraftMediaRole(
  assetId: string,
): RestaurantDraftMediaRole | undefined {
  const asset = demoAssetById(assetId);
  const role = asset?.tags.find((tag) =>
    [
      "dining-atmosphere",
      "table-setting",
      "illustrative-food",
      "ingredients",
      "illustrative-preparation",
    ].includes(tag),
  );
  return role as RestaurantDraftMediaRole | undefined;
}

function galleryTitle(path: string) {
  if (path === "/menu") return "Food imagery";
  if (path === "/visit") return "Atmosphere";
  if (path === "/story") return "Ingredients and craft";
  return "Food and atmosphere";
}

function appendVisitorDisclosure(value: unknown) {
  const current = text(value);
  if (current.toLowerCase().includes("imagery is illustrative")) return current;
  return current ? `${current} ${VISITOR_DISCLOSURE}` : VISITOR_DISCLOSURE;
}

function requiredAsset(assetId: string) {
  const asset = demoAssetById(assetId);
  if (!asset) throw new Error(`Missing Restaurant draft asset ${assetId}.`);
  return asset;
}

function assetReference(asset: ReturnType<typeof requiredAsset>) {
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

function hasNonDraftImage(value: unknown) {
  return imageReferences(value).some(
    (reference) => !RESTAURANT_DRAFT_MEDIA_IDS.includes(reference.assetId),
  );
}

function shouldApplyDraftMedia(value: unknown) {
  if (!value) return true;
  if (!isRecord(value)) return false;
  const assetId = text(value.assetId);
  if (!assetId) return false;
  return demoAssetById(assetId)?.source === "micirql-placeholder";
}

function imageReferences(
  value: unknown,
): Array<{ assetId: string; alt: string }> {
  if (Array.isArray(value)) return value.flatMap(imageReferences);
  if (!isRecord(value)) return [];
  const assetId = text(value.assetId);
  const source = text(value.src) || text(value.originalUrl);
  if (assetId && source) return [{ assetId, alt: text(value.alt) }];
  return Object.values(value).flatMap(imageReferences);
}

function sectionFamily(componentId: string): string {
  const legacy = componentId.toLowerCase().split(".")[0];
  if (legacy && legacy !== componentId.toLowerCase()) return legacy;
  const code = componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  return (
    {
      NAV: "navbar",
      HERO: "hero",
      ABOUT: "about",
      SERV: "services",
      FEAT: "features",
      PROC: "process",
      TEST: "testimonials",
      GALL: "gallery",
      TEAM: "team",
      CTA: "cta",
      CONT: "contact",
      FOOT: "footer",
    }[code ?? ""] ?? ""
  );
}

function normalizeOffset(value: number, length: number) {
  return ((Math.trunc(value) % length) + length) % length;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deduplicate(issues: CompositionGateIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
