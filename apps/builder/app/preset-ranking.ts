import type { Domain, ImageStrategy } from "@micirql/schema";
import {
  DESIGN_REVIEW_COUNT,
  isExplicitDentalSubtype,
  isDentalSubtype,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "./industry-design-preset-data";

export type OnboardingProfile = {
  domain?: Domain | null;
  industry?: string | null;
  subindustry?: string | null;
  goals?: string[] | null;
  style_tags?: string[] | null;
  styleTags?: string[] | null;
  required_capabilities?: string[] | null;
  requiredCapabilities?: string[] | null;
  services?: string[] | null;
  notes?: string | null;
};

export type RankedPreset = {
  preset: IndustryDesignPreset;
  score: number;
  reasons: string[];
  breakdown: {
    dentalFit: number;
    conversionFit: number;
    registryQuality: number;
    visualDirection: number;
    densityFit: number;
    imageryFit: number;
  };
};

export function rankPresets(profile: OnboardingProfile): RankedPreset[] {
  const domain = resolveProfileDomain(profile);
  if (domain !== "clinic" || !isDentalProfile(profile)) return [];
  const pool = listIndustryDesignPresets("clinic", profile.subindustry);
  const goals = norms(profile.goals);
  const styles = norms(profile.style_tags ?? profile.styleTags);
  const capabilities = norms(profile.required_capabilities ?? profile.requiredCapabilities);
  const notes = norm(profile.notes);
  const requestedDensity = inferDensity(styles, notes);
  const requestedImagery = inferImagery(styles, notes);

  return pool
    .map((preset) => {
      const dentalFit = 30;
      const conversionFit = scoreConversion(preset, goals, capabilities);
      const registryQuality = clamp((preset.gate.score / 100) * 15, 0, 15);
      const visualDirection = scoreVisualDirection(preset, styles);
      const densityFit = requestedDensity
        ? preset.theme.brand.density === requestedDensity ? 10 : 3
        : 7;
      const imageryFit = requestedImagery
        ? preset.imageStrategy === requestedImagery ? 10 : relatedImagery(preset.imageStrategy, requestedImagery) ? 6 : 2
        : 7;
      const breakdown = { dentalFit, conversionFit, registryQuality, visualDirection, densityFit, imageryFit };
      const score = round(Object.values(breakdown).reduce((sum, value) => sum + value, 0));
      const reasons = [
        "Certified clinic/dental composition",
        conversionFit >= 16 ? "Strong goal and appointment-flow fit" : "Preserves the required dental conversion flow",
        visualDirection >= 11 ? "Matches the requested visual direction" : "Uses a compatible dental visual system",
        densityFit === 10 ? "Matches the requested content density" : undefined,
        imageryFit === 10 ? "Matches the requested imagery direction" : undefined,
      ].filter((value): value is string => Boolean(value));
      return { preset, score, reasons, breakdown };
    })
    .sort((left, right) => right.score - left.score || left.preset.rankSeed - right.preset.rankSeed);
}

export function applyAiCandidateOrder(
  ranked: RankedPreset[],
  candidateIds: unknown,
): RankedPreset[] {
  if (!Array.isArray(candidateIds) || candidateIds.length !== DESIGN_REVIEW_COUNT) return ranked;
  if (!candidateIds.every((value): value is string => typeof value === "string")) return ranked;
  const allowed = new Map(ranked.map((item) => [item.preset.id, item]));
  if (new Set(candidateIds).size !== DESIGN_REVIEW_COUNT) return ranked;
  if (candidateIds.some((id) => !allowed.has(id))) return ranked;
  return candidateIds.map((id) => allowed.get(id)!);
}

export function resolveProfileDomain(profile: OnboardingProfile): Domain | undefined {
  if (profile.domain) return profile.domain;
  const text = [norm(profile.industry), norm(profile.subindustry), ...norms(profile.services)].join(" ");
  if (isExplicitDentalSubtype(text)) return "clinic";
  if (/\b(real estate|property|realtor)\b/.test(text)) return "real-estate";
  if (/\b(restaurant|cafe|dining|food|hospitality|hotel)\b/.test(text)) return "restaurant";
  if (/\b(construction|contractor|builder|renovation)\b/.test(text)) return "construction";
  if (/\b(saas|software|technology|app)\b/.test(text)) return "saas";
  if (/\b(education|school|training|course)\b/.test(text)) return "education";
  if (/\b(portfolio|creative|artist|designer)\b/.test(text)) return "portfolio";
  if (/\b(professional|corporate|consult|accounting|legal)\b/.test(text)) return "corporate";
  return undefined;
}

function isDentalProfile(profile: OnboardingProfile): boolean {
  const industry = norm(profile.industry);
  const subtype = norm(profile.subindustry);
  const services = norms(profile.services).join(" ");
  if (!industry && !subtype && profile.domain === "clinic") return true;
  const combined = [industry, subtype, services].join(" ");
  return isExplicitDentalSubtype(combined)
    && isDentalSubtype(profile.subindustry);
}

function scoreConversion(preset: IndustryDesignPreset, goals: string[], capabilities: string[]): number {
  let score = 11;
  const actionIndex = Math.min(preset.sectionOrder.indexOf("cta"), preset.sectionOrder.indexOf("contact"));
  if (actionIndex >= 0 && actionIndex <= 9) score += 3;
  if (goals.some((goal) => /book|appointment|lead|contact|enquir/.test(goal))) score += 3;
  if (goals.some((goal) => /trust|educat|explain/.test(goal)) && preset.sectionOrder.indexOf("about") <= 6) score += 2;
  if (capabilities.some((capability) => /booking|contact|lead/.test(capability))) score += 1;
  return clamp(score, 0, 20);
}

function scoreVisualDirection(preset: IndustryDesignPreset, requested: string[]): number {
  if (!requested.length) return 10;
  const tags = new Set(preset.styleTags.map(norm));
  const matches = requested.filter((style) => tags.has(style) || [...tags].some((tag) => tag.includes(style) || style.includes(tag))).length;
  return clamp(5 + matches * 5, 0, 15);
}

function inferDensity(styles: string[], notes: string): "compact" | "comfortable" | "spacious" | undefined {
  const text = styles.concat(notes).join(" ");
  if (/\b(compact|dense|information-rich)\b/.test(text)) return "compact";
  if (/\b(spacious|airy|luxury|minimal)\b/.test(text)) return "spacious";
  if (/\b(balanced|comfortable|friendly)\b/.test(text)) return "comfortable";
  return undefined;
}

function inferImagery(styles: string[], notes: string): ImageStrategy | undefined {
  const text = styles.concat(notes).join(" ");
  if (/\b(people|human|team|patient)\b/.test(text)) return "people-led";
  if (/\b(documentary|authentic|local)\b/.test(text)) return "documentary";
  if (/\b(immersive|cinematic|large image)\b/.test(text)) return "immersive";
  if (/\b(editorial|magazine)\b/.test(text)) return "editorial-crop";
  if (/\b(technology|equipment|detail)\b/.test(text)) return "product-detail";
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
