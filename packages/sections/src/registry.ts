import type { DesignRegistryEntry } from "@micirql/registry";
import type { Domain, ThemeFamily, ThemeModifier } from "@micirql/schema";
import { seedSectionCatalog, type SectionFamily, type SectionVariant } from "./catalog";

const DOMAINS: Domain[] = [
  "clinic",
  "landing-page",
  "real-estate",
  "restaurant",
  "corporate",
  "saas",
  "portfolio",
  "construction",
  "education",
  "hospitality",
];

const FAMILY_DOMAIN_BONUS: Partial<Record<SectionFamily, Partial<Record<Domain, number>>>> = {
  hero: { "landing-page": 100, saas: 96, clinic: 92, corporate: 92, hospitality: 92 },
  services: { clinic: 100, corporate: 98, construction: 98, hospitality: 94, education: 92 },
  features: { saas: 100, corporate: 96, education: 92, clinic: 90 },
  process: { construction: 100, clinic: 96, corporate: 94, education: 92 },
  testimonials: { clinic: 100, hospitality: 98, "real-estate": 96, restaurant: 94, education: 94 },
  gallery: { hospitality: 100, restaurant: 100, "real-estate": 98, portfolio: 98, clinic: 92 },
  team: { clinic: 100, corporate: 98, education: 98, "real-estate": 94 },
  cta: { "landing-page": 100, saas: 98, clinic: 96, "real-estate": 96 },
  contact: { clinic: 100, "real-estate": 100, corporate: 98, construction: 98, hospitality: 98 },
};

const THEME_MODIFIERS: Record<ThemeFamily, ThemeModifier[]> = {
  minimalist: ["light", "sharp", "motion-subtle"],
  corporate: ["light", "geometric", "motion-subtle"],
  luxury: ["photography-led", "motion-subtle", "rounded"],
  editorial: ["photography-led", "sharp", "texture-grain"],
  glass: ["gradient", "3d-depth", "motion-subtle"],
  maximalist: ["gradient", "motion-rich", "texture-grain"],
  organic: ["rounded", "liquid", "illustrative"],
  futuristic: ["dark", "neon-glow", "geometric"],
  playful: ["rounded", "illustrative", "motion-rich"],
  cinematic: ["dark", "photography-led", "motion-subtle"],
};

const FAMILY_CONTENT: Record<SectionFamily, DesignRegistryEntry["contentSchema"]> = {
  navbar: [
    { key: "brand", type: "string", required: true, recommendedMaxCharacters: 32 },
    { key: "items", type: "list", required: true },
    { key: "primaryAction", type: "action", required: false },
  ],
  hero: [
    { key: "eyebrow", type: "string", required: false, recommendedMaxCharacters: 28 },
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 72 },
    { key: "description", type: "rich-text", required: false, recommendedMaxCharacters: 180 },
    { key: "primaryAction", type: "action", required: false },
    { key: "secondaryAction", type: "action", required: false },
    { key: "image", type: "image", required: false },
  ],
  about: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "description", type: "rich-text", required: true, recommendedMaxCharacters: 320 },
    { key: "items", type: "list", required: false },
  ],
  services: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "description", type: "rich-text", required: false, recommendedMaxCharacters: 180 },
    { key: "items", type: "list", required: true },
  ],
  features: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "items", type: "list", required: true },
  ],
  process: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "items", type: "list", required: true },
  ],
  testimonials: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "items", type: "list", required: true },
  ],
  gallery: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "items", type: "list", required: true },
  ],
  team: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "items", type: "list", required: true },
  ],
  cta: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "description", type: "rich-text", required: false, recommendedMaxCharacters: 160 },
    { key: "primaryAction", type: "action", required: true },
  ],
  contact: [
    { key: "title", type: "string", required: true, recommendedMaxCharacters: 64 },
    { key: "description", type: "rich-text", required: false, recommendedMaxCharacters: 180 },
    { key: "primaryAction", type: "action", required: false },
  ],
  footer: [
    { key: "brand", type: "string", required: true, recommendedMaxCharacters: 32 },
    { key: "description", type: "rich-text", required: false, recommendedMaxCharacters: 140 },
    { key: "items", type: "list", required: true },
  ],
};

function domainCompatibility(family: SectionFamily): Record<Domain, number> {
  return Object.fromEntries(DOMAINS.map((domain) => [domain, FAMILY_DOMAIN_BONUS[family]?.[domain] ?? 88])) as Record<Domain, number>;
}

function capabilities(family: SectionFamily): Record<string, boolean> {
  return {
    headline: family !== "navbar" && family !== "footer",
    description: !["navbar", "features", "process", "testimonials", "gallery", "team"].includes(family),
    primaryCTA: ["navbar", "hero", "cta", "contact"].includes(family),
    secondaryCTA: family === "hero",
    image: ["hero", "about", "services", "gallery", "team", "testimonials"].includes(family),
    list: !["hero", "cta", "contact"].includes(family),
    functionalBinding: family === "contact" || family === "navbar" || family === "cta",
  };
}

function personalities(theme: ThemeFamily): string[] {
  const map: Record<ThemeFamily, string[]> = {
    minimalist: ["clean", "calm", "modern"],
    corporate: ["professional", "trustworthy", "structured"],
    luxury: ["premium", "refined", "exclusive"],
    editorial: ["authoritative", "content-led", "distinctive"],
    glass: ["modern", "innovative", "polished"],
    maximalist: ["bold", "expressive", "energetic"],
    organic: ["warm", "natural", "approachable"],
    futuristic: ["technical", "innovative", "advanced"],
    playful: ["friendly", "creative", "energetic"],
    cinematic: ["immersive", "premium", "dramatic"],
  };
  return map[theme];
}

function intelligence(family: SectionFamily, variant: SectionVariant): NonNullable<DesignRegistryEntry["intelligence"]> {
  const visualWeight = variant >= 4 ? "heavy" : variant === 3 ? "medium" : "light";
  const contentDensity = variant === 4 ? "high" : variant === 5 ? "low" : "medium";
  const base = {
    visualWeight,
    contentDensity,
    imageRequirement: "optional" as const,
    preferredImageRatios: [] as string[],
    idealPredecessors: [] as SectionFamily[],
    idealSuccessors: [] as SectionFamily[],
    avoidAdjacent: [] as SectionFamily[],
    maxRecommendedPerPage: 1,
    aiPriority: 60,
    mobileSuitability: variant === 5 ? 86 : variant === 4 ? 90 : 96,
    contentCapacity: {} as NonNullable<DesignRegistryEntry["intelligence"]>["contentCapacity"],
    conversionGoals: [] as string[],
    placementRoles: [] as NonNullable<DesignRegistryEntry["intelligence"]>["placementRoles"],
  };

  switch (family) {
    case "navbar": return { ...base, conversionGoals: ["navigation", "conversion"], placementRoles: ["opening"], aiPriority: 95, mobileSuitability: 98, contentDensity: "low", imageRequirement: "none", idealSuccessors: ["hero"] };
    case "hero": return { ...base, conversionGoals: ["lead-generation", "appointments", "sales", "awareness"], placementRoles: ["opening"], aiPriority: 100, imageRequirement: variant >= 2 ? "recommended" : "optional", preferredImageRatios: ["16:9", "4:3"], idealSuccessors: ["testimonials", "features", "services", "about"], avoidAdjacent: ["cta"], contentCapacity: { headlineMaxWords: 12, bodyMaxWords: 38, maxItems: 2 } };
    case "about": return { ...base, conversionGoals: ["trust", "authority", "education"], placementRoles: ["core-content", "early-proof"], aiPriority: 72, imageRequirement: variant === 2 || variant === 5 ? "recommended" : "optional", preferredImageRatios: ["4:5", "3:2"], idealPredecessors: ["hero", "services", "features"], idealSuccessors: ["team", "services", "process"], contentCapacity: { headlineMaxWords: 10, bodyMaxWords: 90, maxItems: 4 } };
    case "services": return { ...base, conversionGoals: ["sales", "appointments", "education", "discovery"], placementRoles: ["core-content"], aiPriority: 94, imageRequirement: variant >= 4 ? "recommended" : "optional", preferredImageRatios: ["4:3", "1:1"], idealPredecessors: ["hero", "features", "about"], idealSuccessors: ["process", "gallery", "testimonials"], avoidAdjacent: ["features"], contentCapacity: { headlineMaxWords: 9, bodyMaxWords: 34, minItems: 3, maxItems: 8 } };
    case "features": return { ...base, conversionGoals: ["trust", "differentiation", "education"], placementRoles: ["early-proof", "decision-support"], aiPriority: 84, imageRequirement: "none", idealPredecessors: ["hero", "about"], idealSuccessors: ["services", "process", "testimonials"], avoidAdjacent: ["services"], contentCapacity: { headlineMaxWords: 9, minItems: 3, maxItems: 6 } };
    case "process": return { ...base, conversionGoals: ["education", "trust", "appointments"], placementRoles: ["decision-support", "core-content"], aiPriority: 80, imageRequirement: "none", idealPredecessors: ["services", "about"], idealSuccessors: ["testimonials", "cta", "contact"], contentCapacity: { headlineMaxWords: 9, minItems: 3, maxItems: 6 } };
    case "testimonials": return { ...base, conversionGoals: ["trust", "appointments", "sales"], placementRoles: ["early-proof", "decision-support"], aiPriority: 91, imageRequirement: variant >= 4 ? "recommended" : "optional", preferredImageRatios: ["1:1"], idealPredecessors: ["hero", "services", "process", "gallery"], idealSuccessors: ["services", "cta", "contact"], avoidAdjacent: ["team"], contentCapacity: { headlineMaxWords: 8, minItems: 2, maxItems: 6 } };
    case "gallery": return { ...base, conversionGoals: ["trust", "portfolio", "visual-proof", "sales"], placementRoles: ["visual-break", "decision-support"], aiPriority: 86, imageRequirement: "required", preferredImageRatios: ["4:3", "3:2", "1:1"], idealPredecessors: ["services", "process", "about"], idealSuccessors: ["testimonials", "cta", "contact"], avoidAdjacent: ["gallery"], contentCapacity: { headlineMaxWords: 8, minItems: 4, maxItems: 12 } };
    case "team": return { ...base, conversionGoals: ["trust", "authority", "appointments"], placementRoles: ["early-proof", "core-content"], aiPriority: 80, imageRequirement: "recommended", preferredImageRatios: ["4:5", "1:1"], idealPredecessors: ["about", "services"], idealSuccessors: ["testimonials", "cta", "contact"], avoidAdjacent: ["testimonials"], contentCapacity: { headlineMaxWords: 8, minItems: 1, maxItems: 8 } };
    case "cta": return { ...base, conversionGoals: ["lead-generation", "appointments", "sales", "signup"], placementRoles: ["conversion", "closing"], aiPriority: 96, contentDensity: "low", imageRequirement: variant === 5 ? "recommended" : "none", idealPredecessors: ["testimonials", "process", "gallery", "services"], idealSuccessors: ["contact", "footer"], avoidAdjacent: ["hero", "cta"], contentCapacity: { headlineMaxWords: 10, bodyMaxWords: 28 } };
    case "contact": return { ...base, conversionGoals: ["lead-generation", "appointments", "enquiries"], placementRoles: ["conversion", "closing"], aiPriority: 98, imageRequirement: "none", idealPredecessors: ["cta", "testimonials", "process"], idealSuccessors: ["footer"], avoidAdjacent: ["contact"], contentCapacity: { headlineMaxWords: 8, bodyMaxWords: 30 } };
    case "footer": return { ...base, conversionGoals: ["navigation", "trust"], placementRoles: ["closing"], aiPriority: 100, mobileSuitability: 98, contentDensity: "medium", imageRequirement: "none", idealPredecessors: ["contact", "cta"], contentCapacity: { bodyMaxWords: 28, maxItems: 12 } };
  }
}

export const seedSectionRegistryEntries: DesignRegistryEntry[] = seedSectionCatalog.map((seed) => ({
  id: seed.id,
  family: seed.family,
  theme: seed.theme,
  version: seed.version,
  status: seed.status,
  displayName: `${seed.theme} ${seed.family} ${seed.variant}`,
  description: `${seed.layout} ${seed.family} composition for the ${seed.theme} theme family.`,
  tags: [seed.family, seed.theme, seed.layout, "mobile-first", "seed"],
  layoutTraits: [seed.layout, seed.variant === 5 ? "high-visual-weight" : "balanced"],
  brandPersonalities: personalities(seed.theme),
  modifiers: THEME_MODIFIERS[seed.theme],
  domainCompatibility: domainCompatibility(seed.family),
  capabilities: capabilities(seed.family),
  contentSchema: FAMILY_CONTENT[seed.family],
  intelligence: intelligence(seed.family, seed.variant),
  quality: {
    mobile: 90,
    performance: 90,
    accessibility: 90,
    visual: 0,
    ...(["hero", "cta", "contact"].includes(seed.family) ? { conversion: 0 } : {}),
  },
  technical: {
    clientJavascript: seed.family === "navbar" || seed.family === "contact" ? "low" : "none",
    animationCost: seed.variant === 5 ? "low" : "none",
    requiresBackend: seed.family === "contact",
    requiresThirdParty: false,
  },
  protocol: {
    passed: false,
    score: 0,
    checkedAt: new Date(0).toISOString(),
  },
  dependencies: ["@micirql/primitives", "@micirql/components"],
  previews: { thumbnail: `https://preview.micirql.invalid/sections/${seed.id}/thumbnail.webp` },
  usage: { selected: 0, published: 0, replaced: 0 },
}));

export const SEED_REGISTRY_ENTRY_COUNT = seedSectionRegistryEntries.length;
