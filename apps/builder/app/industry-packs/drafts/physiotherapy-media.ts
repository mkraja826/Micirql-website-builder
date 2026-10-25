import {
  siteSchema,
  type CompositionGateIssue,
  type Site,
} from "@micirql/schema";
import { demoAssetById } from "../../demo-assets";
import { PHYSIOTHERAPY_DRAFT_MEDIA_IDS } from "./physiotherapy-media-assets";

const REQUIRED_HERO_PATHS = [
  "/",
  "/therapies",
  "/conditions",
  "/therapists",
  "/about",
  "/contact",
] as const;
const SUPPORTING_FAMILIES = new Set([
  "about",
  "services",
  "features",
  "process",
]);
const HERO_ONLY_PATHS = new Set(["/therapists", "/contact"]);

/** Draft media binding deliberately uses 12 role-tagged assets. It is not a
 * production certification: visual review across all future candidates is
 * still required before this hook may enter the runtime registry. */
export function applyPhysiotherapyDraftMedia(site: Site, seed = 0): Site {
  const next = structuredClone(site);
  const offset = normalizeOffset(seed, PHYSIOTHERAPY_DRAFT_MEDIA_IDS.length);
  const reservedHeroIds = REQUIRED_HERO_PATHS.map(
    (_, index) =>
      PHYSIOTHERAPY_DRAFT_MEDIA_IDS[
        normalizeOffset(offset + index, PHYSIOTHERAPY_DRAFT_MEDIA_IDS.length)
      ]!,
  );
  const supportingIds = PHYSIOTHERAPY_DRAFT_MEDIA_IDS.filter(
    (assetId) => !reservedHeroIds.includes(assetId),
  );

  for (const [pageIndex, page] of next.pages.entries()) {
    const usedKeys = new Set<string>();
    const hero = page.sections.find(
      (section) => sectionFamily(section.component.componentId) === "hero",
    );
    const heroAsset = requiredAsset(
      reservedHeroIds[
        REQUIRED_HERO_PATHS.indexOf(
          page.path as (typeof REQUIRED_HERO_PATHS)[number],
        )
      ] ?? reservedHeroIds[pageIndex % reservedHeroIds.length]!,
    );
    if (hero && shouldApplyDraftMedia(hero.props.image)) {
      hero.props.image = assetReference(heroAsset);
    }
    const heroKey = imageKey(hero?.props.image);
    if (heroKey) usedKeys.add(heroKey);

    const pageMaximum = page.path === "/" ? 7 : 4;
    let mediaCount = heroKey ? 1 : 0;
    let supportingIndex = 0;
    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);
      if (
        section.hidden ||
        HERO_ONLY_PATHS.has(page.path) ||
        !SUPPORTING_FAMILIES.has(family) ||
        !Array.isArray(section.props.items)
      ) {
        continue;
      }
      section.props.items = section.props.items.map((item) => {
        if (!isRecord(item)) return item;
        const existingKey = imageKey(item.image);
        if (existingKey) {
          usedKeys.add(existingKey);
          mediaCount += 1;
          return item;
        }
        if (mediaCount >= pageMaximum) return item;
        const asset = nextUnusedAsset(
          supportingIds,
          pageIndex * 3 + supportingIndex,
          usedKeys,
        );
        supportingIndex += 1;
        const reference = assetReference(asset);
        usedKeys.add(imageKey(reference)!);
        mediaCount += 1;
        return { ...item, image: reference };
      });
    }
  }
  return siteSchema.parse(next);
}

export function physiotherapyDraftMediaIssues(
  site: Site,
): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  const siteAssetIds = new Set<string>();
  const heroAssetIds: string[] = [];
  const nonHeroDraftAssetIds = new Set<string>();

  for (const page of site.pages) {
    const pageReferences = page.sections.flatMap((section) => {
      if (section.hidden) return [];
      const family = sectionFamily(section.component.componentId);
      const references = imageReferences(section.props);
      if (family !== "hero") {
        for (const reference of references) {
          if (PHYSIOTHERAPY_DRAFT_MEDIA_IDS.includes(reference.assetId)) {
            nonHeroDraftAssetIds.add(reference.assetId);
          }
        }
      }
      if (
        (family === "team" || family === "testimonials") &&
        references.some((reference) =>
          PHYSIOTHERAPY_DRAFT_MEDIA_IDS.includes(reference.assetId),
        )
      ) {
        issues.push({
          code: "PHYSIOTHERAPY_STOCK_IMPERSONATION_RISK",
          message: `${page.path} uses illustrative stock media in the ${family} section, where it could imply clinic staff or patient evidence.`,
          severity: "error",
        });
      }
      return references;
    });

    const keys = pageReferences.map((reference) => reference.assetId);
    if (new Set(keys).size !== keys.length) {
      issues.push({
        code: "PHYSIOTHERAPY_PAGE_MEDIA_REPEATED",
        message: `${page.path} repeats an image within the same page.`,
        severity: "error",
      });
    }
    for (const reference of pageReferences) {
      siteAssetIds.add(reference.assetId);
      const asset = demoAssetById(reference.assetId);
      if (
        !asset ||
        !asset.active ||
        asset.license !== "licensed" ||
        !asset.sourceReference?.startsWith("https://www.pexels.com/") ||
        !asset.subtypes.includes("physiotherapy") ||
        !reference.alt.trim()
      ) {
        issues.push({
          code: "PHYSIOTHERAPY_MEDIA_NOT_CERTIFIED",
          message: `${page.path} contains media without active physiotherapy provenance and meaningful alternative text.`,
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
          code: "PHYSIOTHERAPY_HERO_MEDIA_MISSING",
          message: `${page.path} does not have a licensed hero image.`,
          severity: "error",
        });
      } else {
        heroAssetIds.push(heroReference.assetId);
      }
    }

    if (page.path === "/") {
      if (pageReferences.length < 5) {
        issues.push({
          code: "PHYSIOTHERAPY_HOME_MEDIA_SPARSE",
          message:
            "The physiotherapy home page needs at least five meaningful images.",
          severity: "error",
        });
      }
      if (pageReferences.length > 8) {
        issues.push({
          code: "PHYSIOTHERAPY_HOME_MEDIA_DENSE",
          message:
            "The physiotherapy home page must stay within eight meaningful images.",
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
      code: "PHYSIOTHERAPY_HERO_MEDIA_REPEATED",
      message: "Each required physiotherapy page needs a distinct hero image.",
      severity: "error",
    });
  }
  if (heroAssetIds.some((assetId) => nonHeroDraftAssetIds.has(assetId))) {
    issues.push({
      code: "PHYSIOTHERAPY_HERO_MEDIA_REUSED",
      message:
        "A physiotherapy hero image is reused as supporting content elsewhere in the site.",
      severity: "error",
    });
  }
  if (siteAssetIds.size < 10 || siteAssetIds.size > 14) {
    issues.push({
      code: "PHYSIOTHERAPY_SITE_MEDIA_RANGE",
      message: `The physiotherapy site uses ${siteAssetIds.size} distinct images; the draft contract requires 10–14.`,
      severity: "error",
    });
  }
  return deduplicate(issues);
}

function nextUnusedAsset(
  assetIds: readonly string[],
  start: number,
  usedKeys: ReadonlySet<string>,
) {
  for (let probe = 0; probe < assetIds.length; probe += 1) {
    const id = assetIds[normalizeOffset(start + probe, assetIds.length)]!;
    const asset = requiredAsset(id);
    if (!usedKeys.has(asset.id)) return asset;
  }
  throw new Error("No unused physiotherapy draft media remains for this page.");
}

function requiredAsset(assetId: string) {
  const asset = demoAssetById(assetId);
  if (!asset) throw new Error(`Missing physiotherapy draft asset ${assetId}.`);
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

function shouldApplyDraftMedia(value: unknown) {
  if (!value) return true;
  if (typeof value === "string") return false;
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

function imageKey(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return (
    text(value.assetId) ||
    text(value.src) ||
    text(value.originalUrl) ||
    undefined
  );
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
