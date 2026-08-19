import { siteSchema, type Site } from "@micirql/schema";
import {
  classifyMediaArtDirectionTokens,
  type MediaArtDirectionResult,
  type MediaArtDirectionSignature,
} from "./page-media-art-direction-quality";

export type MediaArtDirectionRepairResult = {
  site: Site;
  repaired: boolean;
  operations: string[];
};

/**
 * One bounded page-level art-direction repair. Only reusable media may move to
 * an already-qualified alternate. Customer identity/evidence media is immutable.
 */
export function repairPageMediaArtDirection(
  site: Site,
  quality: MediaArtDirectionResult,
  path = "/",
  attempt = 0,
): MediaArtDirectionRepairResult {
  if (attempt > 0 || quality.samples < 3) return { site, repaired: false, operations: [] };
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  if (!page) return { site, repaired: false, operations: [] };

  const usedUrls = new Set<string>();
  for (const section of page.sections) {
    const image = (section.props as Record<string, unknown>).image;
    if (image && typeof image === "object" && !Array.isArray(image)) {
      const src = (image as Record<string, unknown>).src;
      if (typeof src === "string") usedUrls.add(src);
    }
  }

  const operations: string[] = [];
  let replacements = 0;

  for (const section of page.sections) {
    if (replacements >= 2) break;
    const props = section.props as Record<string, unknown>;
    const intent = objectRecord(props.mediaSelectionIntent);
    if (!intent) continue;
    if (intent.source === "customer") continue;

    const currentSignature = classifyMediaArtDirectionTokens([
      ...stringArray(intent.selectedAssetTags),
      ...stringArray(intent.preferredTags),
      typeof intent.reason === "string" ? intent.reason : "",
    ].join(" "));
    if (!isOutlier(currentSignature, quality.dominant)) continue;

    const alternates = Array.isArray(props.qualifiedMediaAlternates)
      ? props.qualifiedMediaAlternates.map(objectRecord).filter((value): value is Record<string, unknown> => Boolean(value))
      : [];
    const currentImage = objectRecord(props.image);
    if (!currentImage) continue;
    const currentSrc = typeof currentImage.src === "string" ? currentImage.src : "";

    const ranked = alternates
      .filter((alternate) => typeof alternate.url === "string" && alternate.url !== currentSrc && !usedUrls.has(alternate.url))
      .map((alternate) => ({ alternate, match: dominantMatch(classifyMediaArtDirectionTokens(stringArray(alternate.tags).join(" ")), quality.dominant) }))
      .filter((entry) => entry.match >= 2)
      .sort((a, b) => b.match - a.match || numeric(b.alternate.score) - numeric(a.alternate.score));

    const chosen = ranked[0]?.alternate;
    if (!chosen || typeof chosen.url !== "string") continue;

    currentImage.src = chosen.url;
    if (typeof chosen.alt === "string" && chosen.alt.trim()) currentImage.alt = chosen.alt;
    usedUrls.delete(currentSrc);
    usedUrls.add(chosen.url);
    intent.selectedAssetTags = stringArray(chosen.tags);
    props.imageFocalPoint = stringArray(chosen.tags).some((tag) => /person|people|team|portrait|face/i.test(tag)) ? "face-safe" : "center";
    props.mediaArtDirectionRepair = {
      version: 1,
      operation: "reselect-outlier-to-dominant-family",
      dominant: { ...quality.dominant },
      from: currentSrc,
      to: chosen.url,
    };
    operations.push(`reselected ${section.id} to dominant media family`);
    replacements += 1;
  }

  if (!operations.length) return { site, repaired: false, operations: [] };
  return { site: siteSchema.parse(next), repaired: true, operations };
}

function isOutlier(signature: MediaArtDirectionSignature, dominant: MediaArtDirectionResult["dominant"]): boolean {
  let compared = 0;
  let mismatches = 0;
  for (const key of ["style", "temperature", "lighting"] as const) {
    if (!signature[key] || !dominant[key]) continue;
    compared += 1;
    if (signature[key] !== dominant[key]) mismatches += 1;
  }
  return compared >= 2 && mismatches >= 2;
}

function dominantMatch(signature: MediaArtDirectionSignature, dominant: MediaArtDirectionResult["dominant"]): number {
  let matches = 0;
  for (const key of ["style", "temperature", "lighting"] as const) {
    if (signature[key] && dominant[key] && signature[key] === dominant[key]) matches += 1;
  }
  return matches;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function numeric(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
