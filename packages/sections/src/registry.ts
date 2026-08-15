import type { DesignRegistryEntry } from "@micirql/registry";
import type { Domain, ThemeFamily, ThemeModifier } from "@micirql/schema";
import { seedSectionCatalog, type SectionFamily } from "./catalog";

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
  testimonials: { clinic: 100, hospitality: 98, real-estate: 96, restaurant: 94, education: 94 },
  gallery: { hospitality: 100, restaurant: 100, real-estate: 98, portfolio: 98, clinic: 92 },
  team: { clinic: 100, corporate: 98, education: 98, real-estate: 94 },
  cta: { "landing-page": 100, saas: 98, clinic: 96, real-estate: 96 },
  contact: { clinic: 100, real-estate: 100, corporate: 98, construction: 98, hospitality: 98 },
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
  return Object.fromEntries(
    DOMAINS.map((domain) => [domain, FAMILY_DOMAIN_BONUS[family]?.[domain] ?? 88]),
  ) as Record<Domain, number>;
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
  quality: {
    mobile: 90,
    performance: 90,
    accessibility: 90,
    visual: 0,
    conversion: ["hero", "cta", "contact"].includes(seed.family) ? 0 : undefined,
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
  previews: {
    thumbnail: `https://preview.micirql.invalid/sections/${seed.id}/thumbnail.webp`,
  },
  usage: { selected: 0, published: 0, replaced: 0 },
}));

export const SEED_REGISTRY_ENTRY_COUNT = seedSectionRegistryEntries.length;
