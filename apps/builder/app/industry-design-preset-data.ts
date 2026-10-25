import type {
  BrandTokens,
  CompositionGateReport,
  CompositionIdentity,
  Domain,
  ImageStrategy,
  PaletteStrategy,
  ThemeConfig,
  ThemeFamily,
  ThemeModifier,
  TypographyStrategy,
  WebsiteArchetype,
} from "@micirql/schema";
import {
  DENTAL_COMPONENT_VERSION,
  SECTION_FAMILIES,
  isDentalCertifiedSection,
  sectionDesignId,
  type SectionFamily,
  type SectionVariant,
} from "@micirql/sections";
import type { IndustryPackCandidate } from "./industry-packs/types";

export const DESIGN_REVIEW_COUNT = 20;
export const DENTAL_CATALOG_VERSION = "dental-flagship-2026.10.14";
export const DENTAL_SUBTYPE = "dental" as const;
export const DENTAL_REQUIRED_PAGE_PATHS = [
  "/",
  "/services",
  "/doctors",
  "/about",
  "/contact",
] as const;
export const DENTAL_REQUIRED_ACTIONS = [
  "lead.create",
  "appointment.request",
] as const;
const DENTAL_OPTIONAL_EVIDENCE_FAMILIES: ReadonlySet<string> = new Set([
  "testimonials",
  "gallery",
  "team",
] satisfies readonly SectionFamily[]);

export type IndustryDesignPreset = Omit<
  IndustryPackCandidate,
  "domain" | "subtype" | "archetype"
> & {
  domain: "clinic";
  subtype: typeof DENTAL_SUBTYPE;
  archetype: Extract<WebsiteArchetype, "healthcare-clinic">;
};

type CompositionRecipe = {
  id: string;
  name: string;
  description: string;
  family: ThemeFamily;
  modifiers: ThemeModifier[];
  paletteStrategy: PaletteStrategy;
  typographyStrategy: TypographyStrategy;
  density: BrandTokens["density"];
  shape: BrandTokens["shape"];
  motion: BrandTokens["motion"];
  imageStrategy: ImageStrategy;
  styleTags: string[];
  variants: Record<SectionFamily, SectionVariant>;
  sectionOrder: SectionFamily[];
};

const baseColors = { success: "#168a4a", warning: "#9a5b00", error: "#b42318" };
const DENTAL_PALETTES: Record<PaletteStrategy, BrandTokens["colors"]> = {
  "light-corporate": {
    primary: "#0f766e",
    secondary: "#164e63",
    accent: "#14b8a6",
    background: "#fbfffe",
    surface: "#edf9f7",
    textPrimary: "#102a2a",
    textSecondary: "#476664",
    border: "#c8e0dc",
    ...baseColors,
  },
  "brand-heavy": {
    primary: "#155e75",
    secondary: "#0c3340",
    accent: "#0d9488",
    background: "#f7fbfc",
    surface: "#e8f4f5",
    textPrimary: "#0b2830",
    textSecondary: "#49666d",
    border: "#c7dcdf",
    ...baseColors,
  },
  editorial: {
    primary: "#315f5a",
    secondary: "#243b3a",
    accent: "#b26d48",
    background: "#fffdf8",
    surface: "#f4f0e7",
    textPrimary: "#272d2c",
    textSecondary: "#666f6d",
    border: "#ddd8cd",
    ...baseColors,
  },
  "dark-premium": {
    primary: "#7dd3c7",
    secondary: "#d9f2ee",
    accent: "#d4a76a",
    background: "#081b20",
    surface: "#102c33",
    textPrimary: "#f4fbfa",
    textSecondary: "#b7ccca",
    border: "#315058",
    success: "#66d19e",
    warning: "#f0bf72",
    error: "#ff9389",
  },
  "color-block": {
    primary: "#075985",
    secondary: "#0f766e",
    accent: "#c35f42",
    background: "#f8fcff",
    surface: "#e8f4f7",
    textPrimary: "#112d38",
    textSecondary: "#536c75",
    border: "#c9dce3",
    ...baseColors,
  },
  "soft-tint": {
    primary: "#237a73",
    secondary: "#466a79",
    accent: "#6f9f98",
    background: "#fbfefd",
    surface: "#eef7f5",
    textPrimary: "#1b3333",
    textSecondary: "#597070",
    border: "#d2e2df",
    ...baseColors,
  },
};

const TYPOGRAPHY: Record<TypographyStrategy, BrandTokens["typography"]> = {
  "corporate-sans": {
    display: "Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
  },
  "humanist-sans": {
    display: "Candara, Trebuchet MS, Segoe UI, sans-serif",
    body: "Candara, Trebuchet MS, Segoe UI, sans-serif",
    ui: "Segoe UI, Arial, sans-serif",
  },
  "editorial-serif": {
    display: "Charter, Iowan Old Style, Palatino Linotype, Georgia, serif",
    body: "Segoe UI, Arial, sans-serif",
    ui: "Segoe UI, Arial, sans-serif",
  },
  "geometric-modern": {
    display: "Century Gothic, Futura, Avenir Next, Arial, sans-serif",
    body: "Aptos, Segoe UI, Arial, sans-serif",
    ui: "Aptos, Segoe UI, Arial, sans-serif",
  },
  "luxury-serif": {
    display: "Bodoni MT, Bodoni 72, Didot, Times New Roman, serif",
    body: "Gill Sans, Candara, Segoe UI, sans-serif",
    ui: "Segoe UI, Arial, sans-serif",
  },
  technical: {
    display: "Bahnschrift, IBM Plex Sans, Segoe UI, sans-serif",
    body: "Bahnschrift, IBM Plex Sans, Segoe UI, sans-serif",
    ui: "Cascadia Mono, IBM Plex Mono, Consolas, monospace",
    mono: "Cascadia Mono, IBM Plex Mono, Consolas, monospace",
  },
  "friendly-rounded": {
    display: "Trebuchet MS, Arial Rounded MT Bold, Verdana, sans-serif",
    body: "Verdana, Trebuchet MS, Segoe UI, sans-serif",
    ui: "Verdana, Segoe UI, sans-serif",
  },
  "high-impact-display": {
    display: "Bahnschrift, Aptos Display, Segoe UI, sans-serif",
    body: "Aptos, Segoe UI, Arial, sans-serif",
    ui: "Aptos, Segoe UI, Arial, sans-serif",
  },
};

const FAMILY_MODIFIERS: Record<ThemeFamily, ThemeModifier[]> = {
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

const descriptions: Record<string, string> = {
  precision:
    "A disciplined dental journey from treatment clarity to appointment action.",
  "calm-clarity":
    "A spacious and reassuring clinic narrative for patients who value a gentle experience.",
  "editorial-authority":
    "An expert-led dental story with treatment education and restrained clinical proof.",
  "quiet-luxury":
    "A refined clinic experience with generous space and discreet conversion cues.",
  "modern-assurance":
    "A polished dental system balancing modern technology, clarity and reassurance.",
  "human-connection":
    "A warm, people-first dental story focused on comfort and easy contact.",
  "future-ready":
    "A technology-forward clinic composition that avoids unsupported treatment claims.",
  "story-led":
    "A cinematic patient journey built from factual clinic details and approved dental media.",
  "bold-momentum":
    "A decisive modular dental layout for services and direct appointment conversion.",
  "local-character":
    "A welcoming neighbourhood dental composition grounded in place, people and access.",
  "structured-confidence":
    "A compact clinical grid foregrounding treatments, process and appointment readiness.",
  "clear-path":
    "A conversion-focused dental sequence with an explicit step-by-step visit journey.",
  "field-journal":
    "A documentary clinic profile that introduces the practice before treatment choices.",
  "premium-welcome":
    "An immersive clinic opening that moves from atmosphere to appointment action.",
  "contemporary-grid":
    "A modular dental system with layered surfaces and flexible treatment storytelling.",
  "warm-authority":
    "An approachable dental composition balancing expertise, empathy and clear next steps.",
  "evidence-first":
    "A rigorous dental layout prioritising verified practice facts and treatment information.",
  "immersive-narrative":
    "Large-scale approved dental media and paced storytelling for a memorable introduction.",
  "vibrant-practice":
    "An expressive clinic composition with energetic hierarchy and a grounded care journey.",
  "gentle-confidence":
    "A friendly dental composition for clear services, calm expectations and easy contact.",
};

const o = (...families: SectionFamily[]) => families;
const v = (seed: number): Record<SectionFamily, SectionVariant> => {
  const row = seed % 5;
  const column = Math.floor(seed / 5);
  return Object.fromEntries(
    SECTION_FAMILIES.map((family, familyIndex) => [
      family,
      (((row + ((familyIndex % 4) + 1) * column + familyIndex * 2) % 5) +
        1) as SectionVariant,
    ]),
  ) as Record<SectionFamily, SectionVariant>;
};
const recipe = (
  id: string,
  name: string,
  family: ThemeFamily,
  variants: Record<SectionFamily, SectionVariant>,
  paletteStrategy: PaletteStrategy,
  typographyStrategy: TypographyStrategy,
  density: BrandTokens["density"],
  imageStrategy: ImageStrategy,
  styleTags: string[],
  sectionOrder: SectionFamily[],
  motion: BrandTokens["motion"] = "subtle",
): CompositionRecipe => ({
  id,
  name,
  description: descriptions[id] ?? name,
  family,
  modifiers: [...FAMILY_MODIFIERS[family]],
  paletteStrategy,
  typographyStrategy,
  density,
  shape: ["minimalist", "corporate", "editorial", "futuristic"].includes(family)
    ? "sharp"
    : family === "organic" || family === "playful" || family === "glass"
      ? "soft"
      : "balanced",
  motion,
  imageStrategy,
  styleTags,
  variants,
  sectionOrder,
});

const DENTAL_CONVERSION_FAMILIES: ReadonlySet<SectionFamily> = new Set([
  "services",
  "features",
  "process",
  "about",
  "cta",
  "contact",
]);

function visualIdentityForRecipe(item: CompositionRecipe) {
  const visibleSequence = item.sectionOrder.filter(
    (family) =>
      family !== "navbar" &&
      family !== "footer" &&
      !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(family),
  );
  return {
    id: `${DENTAL_SUBTYPE}-${item.id}-visual-v1`,
    visualThesis: item.description,
    heroComposition: `hero-variant-${item.variants.hero}`,
    openingRhythm: visibleSequence.slice(0, 4),
    conversionJourney: item.sectionOrder.filter((family) =>
      DENTAL_CONVERSION_FAMILIES.has(family),
    ),
    surfaceLanguage: [
      `theme:${item.family}`,
      `shape:${item.shape}`,
      `density:${item.density}`,
      `motion:${item.motion}`,
      ...item.modifiers.map((modifier) => `modifier:${modifier}`),
    ],
    signatureMotifs: item.styleTags.map((tag) => tag.trim().toLowerCase()),
  };
}

export const COMPOSITION_RECIPES: readonly CompositionRecipe[] = [
  recipe(
    "precision",
    "Precision",
    "corporate",
    v(0),
    "light-corporate",
    "corporate-sans",
    "compact",
    "restrained",
    ["professional", "trust", "clear"],
    o(
      "navbar",
      "hero",
      "services",
      "features",
      "process",
      "testimonials",
      "team",
      "gallery",
      "about",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "calm-clarity",
    "Calm Clarity",
    "minimalist",
    v(1),
    "soft-tint",
    "humanist-sans",
    "comfortable",
    "people-led",
    ["minimal", "friendly", "calm"],
    o(
      "navbar",
      "hero",
      "about",
      "services",
      "process",
      "features",
      "team",
      "testimonials",
      "gallery",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "editorial-authority",
    "Editorial Authority",
    "editorial",
    v(2),
    "editorial",
    "editorial-serif",
    "spacious",
    "editorial-crop",
    ["editorial", "premium", "authority"],
    o(
      "navbar",
      "hero",
      "about",
      "features",
      "services",
      "gallery",
      "process",
      "team",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "quiet-luxury",
    "Quiet Luxury",
    "luxury",
    v(3),
    "dark-premium",
    "luxury-serif",
    "spacious",
    "immersive",
    ["luxury", "premium", "exclusive"],
    o(
      "navbar",
      "hero",
      "gallery",
      "about",
      "services",
      "features",
      "team",
      "testimonials",
      "process",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "modern-assurance",
    "Modern Assurance",
    "glass",
    v(4),
    "soft-tint",
    "geometric-modern",
    "comfortable",
    "product-detail",
    ["modern", "premium", "technology"],
    o(
      "navbar",
      "hero",
      "features",
      "services",
      "about",
      "process",
      "gallery",
      "team",
      "testimonials",
      "contact",
      "cta",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "human-connection",
    "Human Connection",
    "organic",
    v(5),
    "soft-tint",
    "friendly-rounded",
    "comfortable",
    "people-led",
    ["friendly", "warm", "human"],
    o(
      "navbar",
      "hero",
      "about",
      "team",
      "services",
      "process",
      "testimonials",
      "features",
      "gallery",
      "cta",
      "contact",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "future-ready",
    "Future Ready",
    "futuristic",
    v(6),
    "brand-heavy",
    "technical",
    "comfortable",
    "product-detail",
    ["modern", "technology", "bold"],
    o(
      "navbar",
      "hero",
      "features",
      "process",
      "services",
      "gallery",
      "about",
      "team",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "story-led",
    "Story Led",
    "cinematic",
    v(7),
    "dark-premium",
    "high-impact-display",
    "spacious",
    "immersive",
    ["cinematic", "bold", "story"],
    o(
      "navbar",
      "hero",
      "about",
      "gallery",
      "services",
      "team",
      "features",
      "process",
      "testimonials",
      "contact",
      "cta",
      "footer",
    ),
  ),
  recipe(
    "bold-momentum",
    "Bold Momentum",
    "maximalist",
    v(8),
    "color-block",
    "high-impact-display",
    "comfortable",
    "editorial-crop",
    ["bold", "modern", "energetic"],
    o(
      "navbar",
      "hero",
      "services",
      "gallery",
      "features",
      "about",
      "process",
      "team",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "local-character",
    "Local Character",
    "playful",
    v(9),
    "color-block",
    "friendly-rounded",
    "comfortable",
    "documentary",
    ["local", "friendly", "trust"],
    o(
      "navbar",
      "hero",
      "gallery",
      "about",
      "services",
      "team",
      "testimonials",
      "process",
      "features",
      "contact",
      "cta",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "structured-confidence",
    "Structured Confidence",
    "corporate",
    v(10),
    "brand-heavy",
    "corporate-sans",
    "comfortable",
    "documentary",
    ["professional", "structured", "conversion"],
    o(
      "navbar",
      "hero",
      "services",
      "process",
      "features",
      "testimonials",
      "about",
      "team",
      "gallery",
      "contact",
      "cta",
      "footer",
    ),
  ),
  recipe(
    "clear-path",
    "Clear Path",
    "minimalist",
    v(11),
    "light-corporate",
    "geometric-modern",
    "compact",
    "restrained",
    ["minimal", "clear", "conversion"],
    o(
      "navbar",
      "hero",
      "process",
      "services",
      "cta",
      "features",
      "about",
      "team",
      "testimonials",
      "gallery",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "field-journal",
    "Field Journal",
    "editorial",
    v(12),
    "brand-heavy",
    "humanist-sans",
    "comfortable",
    "documentary",
    ["editorial", "story", "authentic"],
    o(
      "navbar",
      "hero",
      "gallery",
      "about",
      "team",
      "services",
      "process",
      "features",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "premium-welcome",
    "Premium Welcome",
    "luxury",
    v(13),
    "editorial",
    "editorial-serif",
    "comfortable",
    "editorial-crop",
    ["premium", "luxury", "immersive"],
    o(
      "navbar",
      "hero",
      "gallery",
      "services",
      "about",
      "features",
      "team",
      "process",
      "testimonials",
      "contact",
      "cta",
      "footer",
    ),
    "standard",
  ),
  recipe(
    "contemporary-grid",
    "Contemporary Grid",
    "glass",
    v(14),
    "color-block",
    "corporate-sans",
    "compact",
    "documentary",
    ["modern", "creative", "grid"],
    o(
      "navbar",
      "hero",
      "features",
      "gallery",
      "services",
      "team",
      "about",
      "process",
      "testimonials",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "warm-authority",
    "Warm Authority",
    "organic",
    v(15),
    "editorial",
    "editorial-serif",
    "spacious",
    "editorial-crop",
    ["warm", "premium", "trust"],
    o(
      "navbar",
      "hero",
      "about",
      "testimonials",
      "services",
      "team",
      "features",
      "gallery",
      "process",
      "cta",
      "contact",
      "footer",
    ),
  ),
  recipe(
    "evidence-first",
    "Evidence First",
    "futuristic",
    v(16),
    "light-corporate",
    "corporate-sans",
    "compact",
    "restrained",
    ["proof", "professional", "clear"],
    o(
      "navbar",
      "hero",
      "features",
      "services",
      "process",
      "about",
      "team",
      "gallery",
      "testimonials",
      "contact",
      "cta",
      "footer",
    ),
    "none",
  ),
  recipe(
    "immersive-narrative",
    "Immersive Narrative",
    "cinematic",
    v(17),
    "brand-heavy",
    "editorial-serif",
    "spacious",
    "people-led",
    ["cinematic", "premium", "immersive"],
    o(
      "navbar",
      "hero",
      "gallery",
      "features",
      "about",
      "team",
      "services",
      "testimonials",
      "process",
      "cta",
      "contact",
      "footer",
    ),
    "rich",
  ),
  recipe(
    "vibrant-practice",
    "Vibrant Practice",
    "maximalist",
    v(18),
    "brand-heavy",
    "geometric-modern",
    "spacious",
    "people-led",
    ["bold", "human", "distinctive"],
    o(
      "navbar",
      "hero",
      "team",
      "services",
      "features",
      "gallery",
      "about",
      "process",
      "testimonials",
      "contact",
      "cta",
      "footer",
    ),
    "rich",
  ),
  recipe(
    "gentle-confidence",
    "Gentle Confidence",
    "playful",
    v(19),
    "soft-tint",
    "humanist-sans",
    "spacious",
    "restrained",
    ["friendly", "calm", "accessible"],
    o(
      "navbar",
      "hero",
      "process",
      "about",
      "services",
      "team",
      "features",
      "testimonials",
      "gallery",
      "cta",
      "contact",
      "footer",
    ),
  ),
] as const;

export function listIndustryDesignPresets(
  domain: Domain,
  subtype?: string | null,
): IndustryDesignPreset[] {
  if (domain !== "clinic" || !isDentalSubtype(subtype)) return [];
  const candidates = COMPOSITION_RECIPES.map(
    (item, index) =>
      ({
        id: "clinic-dental-" + item.id,
        catalogVersion: DENTAL_CATALOG_VERSION,
        recipeId: item.id,
        visualIdentity: visualIdentityForRecipe(item),
        name: "Dental · " + item.name,
        description: item.description,
        domain: "clinic" as const,
        subtype: DENTAL_SUBTYPE,
        archetype: "healthcare-clinic" as const,
        theme: themeFor(item),
        variants: { ...item.variants },
        sectionOrder: [...item.sectionOrder],
        paletteStrategy: item.paletteStrategy,
        typographyStrategy: item.typographyStrategy,
        imageStrategy: item.imageStrategy,
        styleTags: [...item.styleTags],
        rankSeed: index + 1,
        requiredPagePaths: DENTAL_REQUIRED_PAGE_PATHS,
        requiredActions: DENTAL_REQUIRED_ACTIONS,
        gate: { passed: true, score: 92, issues: [] },
      }) satisfies IndustryDesignPreset,
  );
  const issues = validateCompositionCandidates(candidates);
  if (issues.length)
    throw new Error("Invalid dental composition catalog: " + issues.join(" "));
  return candidates;
}

export const INDUSTRY_DESIGN_PRESETS = listIndustryDesignPresets(
  "clinic",
  DENTAL_SUBTYPE,
);

export function compositionIdentityForPreset(
  candidate: IndustryDesignPreset,
): CompositionIdentity {
  return {
    id: candidate.id,
    catalogVersion: candidate.catalogVersion,
    archetype: candidate.archetype,
    domain: candidate.domain,
    subtype: candidate.subtype,
    recipeId: candidate.recipeId,
    sectionOrder: [...candidate.sectionOrder],
    components: SECTION_FAMILIES.map((family) => ({
      family,
      componentId: sectionDesignId(
        candidate.theme.family,
        family,
        candidate.variants[family],
      ),
      version: DENTAL_COMPONENT_VERSION,
    })),
    designSystem: candidate.theme.family,
    modifiers: [...candidate.theme.modifiers],
    paletteStrategy: candidate.paletteStrategy,
    typographyStrategy: candidate.typographyStrategy,
    density: candidate.theme.brand.density,
    imageStrategy: candidate.imageStrategy,
    motionStrategy: candidate.theme.brand.motion,
  };
}

export function compositionSignature(
  value: IndustryDesignPreset | CompositionIdentity,
): string {
  const identity =
    "theme" in value ? compositionIdentityForPreset(value) : value;
  return JSON.stringify({
    archetype: identity.archetype,
    domain: identity.domain,
    subtype: identity.subtype,
    sectionOrder: identity.sectionOrder,
    components: identity.components,
    designSystem: identity.designSystem,
    modifiers: identity.modifiers,
    paletteStrategy: identity.paletteStrategy,
    typographyStrategy: identity.typographyStrategy,
    density: identity.density,
    imageStrategy: identity.imageStrategy,
    motionStrategy: identity.motionStrategy,
  });
}

export function validateCompositionCandidates(
  candidates: IndustryDesignPreset[],
): string[] {
  const issues: string[] = [];
  if (candidates.length !== DESIGN_REVIEW_COUNT)
    issues.push(
      "Expected " +
        DESIGN_REVIEW_COUNT +
        " candidates, received " +
        candidates.length +
        ".",
    );
  if (
    candidates.some(
      (candidate) =>
        candidate.domain !== "clinic" || candidate.subtype !== DENTAL_SUBTYPE,
    )
  )
    issues.push("A candidate crossed the certified clinic/dental boundary.");
  if (
    candidates.some(
      (candidate) => candidate.catalogVersion !== DENTAL_CATALOG_VERSION,
    )
  )
    issues.push("Every candidate must use the active dental catalog version.");
  if (
    new Set(candidates.map((candidate) => candidate.id)).size !==
    candidates.length
  )
    issues.push("Candidate IDs must be unique.");
  if (new Set(candidates.map(compositionSignature)).size !== candidates.length)
    issues.push("Composition signatures must be unique.");
  if (
    new Set(candidates.map(compositionStructuralSignature)).size !==
    candidates.length
  )
    issues.push(
      "Composition structures must remain unique without relying on theme-prefixed component IDs.",
    );
  if (
    new Set(candidates.map(compositionAboveFoldSignature)).size !==
    candidates.length
  )
    issues.push(
      "Above-fold compositions must remain unique without relying on palette or typography tokens.",
    );
  for (const candidate of candidates) {
    const identity = compositionIdentityForPreset(candidate);
    const order = candidate.sectionOrder;
    if (order[0] !== "navbar" || order.at(-1) !== "footer")
      issues.push(
        candidate.id + " must begin with navbar and end with footer.",
      );
    for (const required of [
      "navbar",
      "hero",
      "services",
      "cta",
      "contact",
      "footer",
    ] as const)
      if (!order.includes(required))
        issues.push(
          candidate.id + " is missing required family " + required + ".",
        );
    if (
      new Set(order).size !== SECTION_FAMILIES.length ||
      order.length !== SECTION_FAMILIES.length
    )
      issues.push(
        candidate.id +
          " must order every approved section family exactly once.",
      );
    const uncertified = identity.components.filter(
      (component) =>
        !isDentalCertifiedSection(component.componentId, component.version),
    );
    if (uncertified.length)
      issues.push(
        candidate.id +
          " uses non-certified components: " +
          uncertified.map((item) => item.componentId).join(", ") +
          ".",
      );
    const layoutVariants = new Set(
      SECTION_FAMILIES.map((family) => candidate.variants[family]),
    );
    if (layoutVariants.size < 2)
      issues.push(
        candidate.id +
          " must mix certified layout variants per section instead of applying one global variant.",
      );
  }
  const catalogDepths = dentalComponentDepth(candidates);
  const minimums: Record<SectionFamily, number> = {
    navbar: 12,
    hero: 20,
    about: 10,
    services: 15,
    features: 15,
    process: 10,
    testimonials: 10,
    gallery: 10,
    team: 10,
    cta: 12,
    contact: 10,
    footer: 12,
  };
  for (const family of SECTION_FAMILIES)
    if (catalogDepths[family] < minimums[family])
      issues.push(
        family +
          " certified catalog depth is " +
          catalogDepths[family] +
          "; at least " +
          minimums[family] +
          " certified components are required.",
      );
  const structuralDepths = dentalStructuralDepth(candidates);
  for (const family of SECTION_FAMILIES)
    if (structuralDepths[family] < 5)
      issues.push(
        family +
          " structural depth is " +
          structuralDepths[family] +
          "; all five certified renderer layouts must be represented.",
      );
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const comparison = compareCompositionIdentities(
        compositionIdentityForPreset(candidates[left]!),
        compositionIdentityForPreset(candidates[right]!),
      );
      if (!comparison.materiallyDifferent)
        issues.push(
          candidates[left]!.id +
            " and " +
            candidates[right]!.id +
            " are not materially different (" +
            comparison.differingDimensions +
            " dimensions).",
        );
    }
  }
  return [...new Set(issues)];
}

export function validateCompositionSet(
  candidates: IndustryDesignPreset[],
  domain: Domain,
): string[] {
  return [
    ...(domain === "clinic"
      ? []
      : ["Only the clinic/dental pack is certified."]),
    ...validateCompositionCandidates(candidates),
  ];
}

export function dentalComponentDepth(
  candidates = INDUSTRY_DESIGN_PRESETS,
): Record<SectionFamily, number> {
  return Object.fromEntries(
    SECTION_FAMILIES.map((family) => [
      family,
      new Set(
        candidates.map((candidate) =>
          sectionDesignId(
            candidate.theme.family,
            family,
            candidate.variants[family],
          ),
        ),
      ).size,
    ]),
  ) as Record<SectionFamily, number>;
}

/**
 * Counts renderer/layout variants while deliberately ignoring theme-prefixed
 * aliases. This prevents ten differently named theme entries from being
 * reported as ten independent structures when they share one layout.
 */
export function dentalStructuralDepth(
  candidates = INDUSTRY_DESIGN_PRESETS,
): Record<SectionFamily, number> {
  return Object.fromEntries(
    SECTION_FAMILIES.map((family) => [
      family,
      new Set(candidates.map((candidate) => candidate.variants[family])).size,
    ]),
  ) as Record<SectionFamily, number>;
}

export function compositionStructuralSignature(
  value: IndustryDesignPreset | CompositionIdentity,
): string {
  const identity =
    "theme" in value ? compositionIdentityForPreset(value) : value;
  return JSON.stringify({
    sectionOrder: identity.sectionOrder.filter(
      (family) => !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(family),
    ),
    layouts: identity.components
      .filter(
        (component) => !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(component.family),
      )
      .map((component) => ({
        family: component.family,
        variant: componentLayoutVariant(component.componentId),
      })),
  });
}

/**
 * Describes the visitor's first impression without palette or font tokens.
 * Hidden evidence families and theme labels are deliberately excluded so this
 * gate cannot pass on metadata or sections visitors cannot see.
 */
export function compositionAboveFoldSignature(
  value: IndustryDesignPreset | CompositionIdentity,
): string {
  const identity =
    "theme" in value ? compositionIdentityForPreset(value) : value;
  const layouts = new Map(
    identity.components.map((component) => [
      component.family,
      componentLayoutVariant(component.componentId),
    ]),
  );
  const openingSequence = identity.sectionOrder
    .filter(
      (family) =>
        family !== "navbar" &&
        family !== "footer" &&
        !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(family),
    )
    .slice(0, 4);
  return JSON.stringify({
    navbar: layouts.get("navbar"),
    hero: layouts.get("hero"),
    openingSequence,
    openingLayouts: openingSequence.map((family) => layouts.get(family)),
  });
}

export function compareCompositionIdentities(
  left: CompositionIdentity,
  right: CompositionIdentity,
) {
  const visibleOrder = (identity: CompositionIdentity) =>
    identity.sectionOrder.filter(
      (family) => !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(family),
    );
  const orderDiffers =
    JSON.stringify(visibleOrder(left)) !== JSON.stringify(visibleOrder(right));
  const rightComponents = new Map(
    right.components.map((item) => [
      item.family,
      componentLayoutVariant(item.componentId),
    ]),
  );
  const componentDifferences = left.components.filter(
    (item) =>
      !DENTAL_OPTIONAL_EVIDENCE_FAMILIES.has(item.family) &&
      rightComponents.get(item.family) !==
        componentLayoutVariant(item.componentId),
  ).length;
  const visualValues = [
    left.designSystem !== right.designSystem,
    JSON.stringify(left.modifiers) !== JSON.stringify(right.modifiers),
    left.paletteStrategy !== right.paletteStrategy,
    left.typographyStrategy !== right.typographyStrategy,
    left.density !== right.density,
    left.imageStrategy !== right.imageStrategy,
    left.motionStrategy !== right.motionStrategy,
  ];
  const differingDimensions =
    Number(orderDiffers) +
    Number(componentDifferences > 0) +
    visualValues.filter(Boolean).length;
  const structuralDifference = orderDiffers || componentDifferences >= 2;
  const visualDifference = visualValues.some(Boolean);
  const aboveFoldDifference =
    compositionAboveFoldSignature(left) !==
    compositionAboveFoldSignature(right);
  return {
    differingDimensions,
    componentDifferences,
    structuralDifference,
    visualDifference,
    aboveFoldDifference,
    materiallyDifferent:
      differingDimensions >= 4 &&
      structuralDifference &&
      visualDifference &&
      aboveFoldDifference,
  };
}

function componentLayoutVariant(componentId: string): string {
  return componentId.match(/-(\d{3})$/)?.[1] ?? "unknown";
}

export function isDentalSubtype(value?: string | null): boolean {
  return isExplicitDentalSubtype(value);
}

export function isExplicitDentalSubtype(value?: string | null): boolean {
  return Boolean(
    value?.trim() &&
    /(?:^|[^a-z])(dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
      value,
    ),
  );
}

function themeFor(item: CompositionRecipe): ThemeConfig {
  return {
    family: item.family,
    modifiers: [...item.modifiers],
    brand: {
      colors: { ...DENTAL_PALETTES[item.paletteStrategy] },
      typography: { ...TYPOGRAPHY[item.typographyStrategy] },
      density: item.density,
      shape: item.shape,
      motion: item.motion,
    },
  };
}
