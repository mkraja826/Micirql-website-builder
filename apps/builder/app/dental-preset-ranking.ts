import type { ImageStrategy } from "@micirql/schema";
import {
  DENTAL_SUBTYPE,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "./industry-design-preset-data";
import type {
  IndustryPackRankedCandidate,
  IndustryPackRankingProfile,
} from "./industry-packs/runtime/types";

/** Dental owns its ranking vocabulary and weighting. Other packs must provide
 * their own scorer instead of inheriting dental-fit assumptions. */
export function rankDentalPresetCandidates(
  profile: IndustryPackRankingProfile,
): IndustryPackRankedCandidate<IndustryDesignPreset>[] {
  const pool = listIndustryDesignPresets("clinic", DENTAL_SUBTYPE);
  const goals = norms(profile.goals);
  const styles = norms(profile.style_tags ?? profile.styleTags);
  const capabilities = norms(
    profile.required_capabilities ?? profile.requiredCapabilities,
  );
  const notes = norm(profile.notes);
  const requestedDensity = inferDensity(styles, notes);
  const requestedImagery = inferImagery(styles, notes);

  return pool
    .map((candidate) => {
      const industryFit = 30;
      const conversionFit = scoreConversion(candidate, goals, capabilities);
      const registryQuality = clamp((candidate.gate.score / 100) * 15, 0, 15);
      const visualDirection = scoreVisualDirection(candidate, styles);
      const densityFit = requestedDensity
        ? candidate.theme.brand.density === requestedDensity
          ? 10
          : 3
        : 7;
      const imageryFit = requestedImagery
        ? candidate.imageStrategy === requestedImagery
          ? 10
          : relatedImagery(candidate.imageStrategy, requestedImagery)
            ? 6
            : 2
        : 7;
      const breakdown = {
        industryFit,
        conversionFit,
        registryQuality,
        visualDirection,
        densityFit,
        imageryFit,
      };
      const score = round(
        Object.values(breakdown).reduce((sum, value) => sum + value, 0),
      );
      const reasons = [
        "Certified clinic/dental composition",
        conversionFit >= 16
          ? "Strong goal and appointment-flow fit"
          : "Preserves the required dental conversion flow",
        visualDirection >= 11
          ? "Matches the requested visual direction"
          : "Uses a compatible dental visual system",
        densityFit === 10
          ? "Matches the requested content density"
          : undefined,
        imageryFit === 10
          ? "Matches the requested imagery direction"
          : undefined,
      ].filter((value): value is string => Boolean(value));
      return { candidate, score, reasons, breakdown };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.rankSeed - right.candidate.rankSeed,
    );
}

function scoreConversion(
  candidate: IndustryDesignPreset,
  goals: string[],
  capabilities: string[],
): number {
  let score = 11;
  const actionIndex = Math.min(
    candidate.sectionOrder.indexOf("cta"),
    candidate.sectionOrder.indexOf("contact"),
  );
  if (actionIndex >= 0 && actionIndex <= 9) score += 3;
  if (goals.some((goal) => /book|appointment|lead|contact|enquir/.test(goal)))
    score += 3;
  if (
    goals.some((goal) => /trust|educat|explain/.test(goal)) &&
    candidate.sectionOrder.indexOf("about") <= 6
  )
    score += 2;
  if (capabilities.some((capability) => /booking|contact|lead/.test(capability)))
    score += 1;
  return clamp(score, 0, 20);
}

function scoreVisualDirection(
  candidate: IndustryDesignPreset,
  requested: string[],
): number {
  if (!requested.length) return 10;
  const tags = new Set(candidate.styleTags.map(norm));
  const matches = requested.filter(
    (style) =>
      tags.has(style) ||
      [...tags].some((tag) => tag.includes(style) || style.includes(tag)),
  ).length;
  return clamp(5 + matches * 5, 0, 15);
}

function inferDensity(
  styles: string[],
  notes: string,
): "compact" | "comfortable" | "spacious" | undefined {
  const text = styles.concat(notes).join(" ");
  if (/\b(compact|dense|information-rich)\b/.test(text)) return "compact";
  if (/\b(spacious|airy|luxury|minimal)\b/.test(text)) return "spacious";
  if (/\b(balanced|comfortable|friendly)\b/.test(text))
    return "comfortable";
  return undefined;
}

function inferImagery(
  styles: string[],
  notes: string,
): ImageStrategy | undefined {
  const text = styles.concat(notes).join(" ");
  if (/\b(people|human|team|patient)\b/.test(text)) return "people-led";
  if (/\b(documentary|authentic|local)\b/.test(text)) return "documentary";
  if (/\b(immersive|cinematic|large image)\b/.test(text)) return "immersive";
  if (/\b(editorial|magazine)\b/.test(text)) return "editorial-crop";
  if (/\b(technology|equipment|detail)\b/.test(text))
    return "product-detail";
  if (/\b(restrained|minimal|quiet)\b/.test(text)) return "restrained";
  return undefined;
}

function relatedImagery(left: ImageStrategy, right: ImageStrategy): boolean {
  const groups: ImageStrategy[][] = [
    ["people-led", "documentary"],
    ["immersive", "editorial-crop"],
    ["product-detail", "restrained"],
  ];
  return groups.some((group) => group.includes(left) && group.includes(right));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function norm(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function norms(value: unknown) {
  return Array.isArray(value) ? value.map(norm).filter(Boolean) : [];
}
