import type {
  BrandTokens,
  PaletteStrategy,
  ThemeConfig,
  ThemeFamily,
  ThemeModifier,
  TypographyStrategy,
} from "@micirql/schema";
import {
  SECTION_FAMILIES,
  type SectionFamily,
  type SectionVariant,
} from "@micirql/sections";
import type { IndustryDesignCatalog } from "../design-distinctness";
import type { CandidateVisualIdentity, IndustryPackCandidate } from "../types";
import {
  RESTAURANT_CANDIDATE_BLUEPRINTS,
  RESTAURANT_CANDIDATE_BLUEPRINT_VERSION,
  type RestaurantCandidateBlueprint,
  type RestaurantCandidateRequiredFact,
} from "./restaurant-candidate-blueprints";
import {
  RESTAURANT_DRAFT_CATALOG_VERSION,
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_DRAFT_PROTOTYPE_VARIANTS,
  RESTAURANT_DRAFT_REQUIRED_ACTIONS,
  restaurantDraftPack,
} from "./restaurant";

export type RestaurantDraftCandidate = IndustryPackCandidate & {
  candidateStatus: "draft-unregistered";
  blueprintVersion: typeof RESTAURANT_CANDIDATE_BLUEPRINT_VERSION;
  homeFlow: readonly SectionFamily[];
  navigationComposition: string;
  openingComposition: string;
  menuComposition: string;
  venueProofModel: string;
  reservationPresentation: string;
  surfaceRhythm: string;
  imageTreatment: string;
  mobileReflow: string;
  requiredFacts: readonly RestaurantCandidateRequiredFact[];
};

// Restaurant owns these audited component tuples and signature orders rather
// than replaying another industry's generator. The absent process,
// testimonials and team families only enrich catalog comparison; applying a
// candidate never adds them to Restaurant Home or reorders an inner route.
const RESTAURANT_VARIANT_ROWS = [
  [4, 5, 2, 4, 5, 1, 3, 5, 1, 4, 5, 4],
  [3, 2, 3, 4, 4, 1, 2, 1, 5, 4, 1, 3],
  [1, 5, 3, 4, 5, 1, 4, 1, 4, 3, 4, 5],
  [5, 1, 5, 2, 3, 2, 1, 3, 2, 2, 1, 3],
  [4, 2, 1, 1, 5, 3, 3, 2, 2, 1, 5, 1],
  [3, 3, 5, 4, 1, 4, 1, 4, 3, 1, 2, 4],
  [2, 3, 4, 5, 3, 4, 4, 1, 1, 5, 1, 2],
  [2, 2, 4, 3, 1, 1, 2, 4, 3, 2, 5, 2],
  [5, 2, 2, 5, 5, 5, 3, 3, 5, 1, 5, 3],
  [5, 4, 3, 4, 3, 5, 3, 3, 4, 1, 4, 3],
  [2, 1, 4, 2, 4, 4, 2, 2, 5, 2, 1, 5],
  [1, 5, 3, 4, 5, 3, 3, 5, 4, 2, 2, 2],
  [1, 1, 1, 1, 2, 1, 4, 2, 1, 5, 4, 2],
  [1, 5, 2, 5, 3, 4, 1, 4, 3, 4, 4, 1],
  [5, 1, 3, 1, 3, 2, 1, 3, 4, 5, 5, 1],
  [3, 5, 5, 3, 1, 5, 4, 5, 1, 3, 3, 4],
  [1, 4, 5, 5, 2, 3, 2, 3, 5, 5, 4, 4],
  [4, 1, 4, 5, 1, 4, 3, 1, 4, 1, 1, 4],
  [4, 1, 5, 5, 5, 5, 4, 4, 3, 1, 5, 4],
  [4, 2, 3, 1, 1, 5, 5, 3, 4, 2, 2, 4],
] as const satisfies readonly (readonly SectionVariant[])[];

const RESTAURANT_SIGNATURE_ORDERS = [
  [
    "navbar",
    "hero",
    "testimonials",
    "team",
    "gallery",
    "services",
    "process",
    "about",
    "features",
    "contact",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "services",
    "features",
    "team",
    "gallery",
    "contact",
    "about",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "team",
    "gallery",
    "features",
    "testimonials",
    "about",
    "services",
    "cta",
    "contact",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "services",
    "about",
    "team",
    "gallery",
    "testimonials",
    "features",
    "contact",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "features",
    "gallery",
    "process",
    "services",
    "team",
    "about",
    "cta",
    "contact",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "gallery",
    "testimonials",
    "about",
    "services",
    "contact",
    "team",
    "features",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "process",
    "about",
    "gallery",
    "team",
    "services",
    "features",
    "contact",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "services",
    "gallery",
    "features",
    "contact",
    "team",
    "about",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "gallery",
    "services",
    "testimonials",
    "features",
    "process",
    "about",
    "contact",
    "team",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "services",
    "gallery",
    "testimonials",
    "team",
    "about",
    "contact",
    "features",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "team",
    "gallery",
    "process",
    "about",
    "features",
    "services",
    "contact",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "process",
    "about",
    "services",
    "gallery",
    "features",
    "cta",
    "team",
    "contact",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "team",
    "gallery",
    "services",
    "about",
    "contact",
    "cta",
    "features",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "team",
    "testimonials",
    "services",
    "process",
    "gallery",
    "contact",
    "features",
    "about",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "contact",
    "services",
    "features",
    "team",
    "gallery",
    "process",
    "testimonials",
    "about",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "team",
    "gallery",
    "process",
    "features",
    "services",
    "contact",
    "about",
    "cta",
    "testimonials",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "team",
    "features",
    "services",
    "testimonials",
    "contact",
    "gallery",
    "about",
    "cta",
    "process",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "process",
    "about",
    "gallery",
    "testimonials",
    "services",
    "team",
    "contact",
    "features",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "services",
    "features",
    "gallery",
    "about",
    "contact",
    "process",
    "team",
    "cta",
    "footer",
  ],
  [
    "navbar",
    "hero",
    "testimonials",
    "features",
    "team",
    "gallery",
    "about",
    "services",
    "contact",
    "cta",
    "process",
    "footer",
  ],
] as const satisfies readonly (readonly SectionFamily[])[];

const THEME_MODIFIERS: Record<ThemeFamily, readonly ThemeModifier[]> = {
  minimalist: ["light", "sharp", "motion-subtle"],
  corporate: ["light", "geometric", "motion-subtle"],
  luxury: ["photography-led", "sharp", "motion-subtle"],
  editorial: ["light", "photography-led", "texture-grain"],
  glass: ["gradient", "3d-depth", "motion-subtle"],
  maximalist: ["gradient", "motion-rich", "texture-grain"],
  organic: ["rounded", "photography-led", "motion-subtle"],
  futuristic: ["dark", "neon-glow", "geometric"],
  playful: ["rounded", "illustrative", "motion-rich"],
  cinematic: ["dark", "photography-led", "motion-subtle"],
};

const TYPOGRAPHY: Record<TypographyStrategy, BrandTokens["typography"]> = {
  "corporate-sans": {
    display:
      "Aptos Display, Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Aptos, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Aptos, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
  },
  "humanist-sans": {
    display: "Manrope, Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
  },
  "editorial-serif": {
    display: '"Source Serif 4", Charter, Georgia, serif',
    body: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
  },
  "geometric-modern": {
    display: "Century Gothic, Futura, Avenir Next, Arial, sans-serif",
    body: "Aptos, Segoe UI, Arial, sans-serif",
    ui: "Aptos, Segoe UI, Arial, sans-serif",
  },
  "luxury-serif": {
    display: "Bodoni 72, Didot, Bodoni MT, Georgia, serif",
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
    display:
      "Aptos Display, Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Aptos, Segoe UI, Arial, sans-serif",
    ui: "Aptos, Segoe UI, Arial, sans-serif",
  },
};

const PALETTE_STRATEGY: Record<ThemeFamily, PaletteStrategy> = {
  minimalist: "soft-tint",
  corporate: "light-corporate",
  luxury: "editorial",
  editorial: "editorial",
  glass: "soft-tint",
  maximalist: "color-block",
  organic: "soft-tint",
  futuristic: "brand-heavy",
  playful: "color-block",
  cinematic: "dark-premium",
};

export const RESTAURANT_DRAFT_CANDIDATES = RESTAURANT_CANDIDATE_BLUEPRINTS.map(
  candidateFromBlueprint,
) satisfies readonly RestaurantDraftCandidate[];

/**
 * Unregistered staging catalog for candidate rendering and design review. Its
 * deliberately failing gate prevents the Restaurant draft from entering the
 * certified registry or production generation flow.
 */
export const restaurantDraftCandidateCatalog = {
  id: restaurantDraftPack.identity.id,
  designGrammar: restaurantDraftPack.designGrammar,
  listCandidates: listRestaurantDraftCandidates,
} satisfies IndustryDesignCatalog;

export function listRestaurantDraftCandidates(): RestaurantDraftCandidate[] {
  return RESTAURANT_DRAFT_CANDIDATES.map((candidate) => ({
    ...candidate,
    visualIdentity: cloneVisualIdentity(candidate.visualIdentity),
    theme: {
      ...candidate.theme,
      modifiers: [...candidate.theme.modifiers],
      brand: {
        ...candidate.theme.brand,
        colors: { ...candidate.theme.brand.colors },
        typography: { ...candidate.theme.brand.typography },
      },
    },
    variants: { ...candidate.variants },
    sectionOrder: [...candidate.sectionOrder],
    styleTags: [...candidate.styleTags],
    requiredPagePaths: [...candidate.requiredPagePaths],
    requiredActions: [...candidate.requiredActions],
    gate: {
      ...candidate.gate,
      issues: candidate.gate.issues.map((issue) => ({ ...issue })),
    },
    homeFlow: [...candidate.homeFlow],
    requiredFacts: [...candidate.requiredFacts],
  }));
}

function candidateFromBlueprint(
  blueprint: RestaurantCandidateBlueprint,
): RestaurantDraftCandidate {
  const sectionOrder = sectionOrderFor(blueprint);
  const visualIdentity: CandidateVisualIdentity = {
    id: `restaurant-${blueprint.recipeId}-visual-v1`,
    visualThesis: blueprint.thesis,
    heroComposition: blueprint.heroComposition,
    openingRhythm: ["hero", ...blueprint.homeFlow.slice(0, 3)],
    conversionJourney: [...blueprint.homeFlow],
    surfaceLanguage: [
      blueprint.navigationComposition,
      blueprint.openingComposition,
      blueprint.menuComposition,
      blueprint.venueProofModel,
      blueprint.reservationPresentation,
      blueprint.surfaceRhythm,
      blueprint.imageTreatment,
      blueprint.mobileReflow,
    ],
    signatureMotifs: [...blueprint.motifs],
  };

  return {
    id: blueprint.id,
    catalogVersion: RESTAURANT_DRAFT_CATALOG_VERSION,
    recipeId: blueprint.recipeId,
    visualIdentity,
    name: blueprint.name,
    description: blueprint.thesis,
    domain: "restaurant",
    subtype: "restaurant",
    archetype: "restaurant-hospitality",
    theme: themeFor(blueprint),
    variants: variantsFor(blueprint.variantSeed),
    sectionOrder,
    paletteStrategy: PALETTE_STRATEGY[blueprint.themeFamily],
    typographyStrategy: blueprint.typographyStrategy,
    imageStrategy: blueprint.imageStrategy,
    styleTags: [
      "restaurant",
      `candidate:${blueprint.recipeId}`,
      ...blueprint.motifs,
    ],
    rankSeed: blueprint.variantSeed,
    requiredPagePaths: RESTAURANT_DRAFT_PAGE_PATHS,
    requiredActions: RESTAURANT_DRAFT_REQUIRED_ACTIONS,
    gate: {
      passed: false,
      score: 0,
      issues: [
        {
          code: "RESTAURANT_DRAFT_CANDIDATE_UNCERTIFIED",
          message:
            "This Restaurant staging candidate is not certified or registered for production generation.",
          severity: "error",
        },
      ],
    },
    candidateStatus: "draft-unregistered",
    blueprintVersion: RESTAURANT_CANDIDATE_BLUEPRINT_VERSION,
    homeFlow: [...blueprint.homeFlow],
    navigationComposition: blueprint.navigationComposition,
    openingComposition: blueprint.openingComposition,
    menuComposition: blueprint.menuComposition,
    venueProofModel: blueprint.venueProofModel,
    reservationPresentation: blueprint.reservationPresentation,
    surfaceRhythm: blueprint.surfaceRhythm,
    imageTreatment: blueprint.imageTreatment,
    mobileReflow: blueprint.mobileReflow,
    requiredFacts: [...blueprint.requiredFacts],
  };
}

function sectionOrderFor(
  blueprint: RestaurantCandidateBlueprint,
): SectionFamily[] {
  const order = RESTAURANT_SIGNATURE_ORDERS[blueprint.variantSeed - 1];
  if (!order)
    throw new Error(
      `Missing Restaurant signature order ${blueprint.variantSeed}.`,
    );
  const visibleHomeOrder = order.filter((family) =>
    blueprint.homeFlow.includes(
      family as RestaurantCandidateBlueprint["homeFlow"][number],
    ),
  );
  if (visibleHomeOrder.join(">") !== blueprint.homeFlow.join(">")) {
    throw new Error(
      `Restaurant signature order ${blueprint.variantSeed} changes Home choreography.`,
    );
  }
  return [...order];
}

function variantsFor(seed: number): Record<SectionFamily, SectionVariant> {
  if (seed === 1) return { ...RESTAURANT_DRAFT_PROTOTYPE_VARIANTS };
  const row = RESTAURANT_VARIANT_ROWS[seed - 1];
  if (!row) throw new Error(`Missing Restaurant component tuple ${seed}.`);
  return Object.fromEntries(
    SECTION_FAMILIES.map((family, familyIndex) => [family, row[familyIndex]!]),
  ) as Record<SectionFamily, SectionVariant>;
}

function themeFor(blueprint: RestaurantCandidateBlueprint): ThemeConfig {
  const family = blueprint.themeFamily;
  const isCompact = family === "corporate";
  const isSpacious = ["minimalist", "luxury", "cinematic"].includes(family);
  const isSoft = ["organic", "playful", "luxury", "glass"].includes(family);
  const isRich = ["maximalist", "playful"].includes(family);
  const isDarkPalette = isDarkHex(blueprint.palette.background);
  return {
    family,
    modifiers: [...THEME_MODIFIERS[family]],
    brand: {
      colors: {
        primary: blueprint.palette.primary,
        secondary: blueprint.palette.secondary,
        accent: blueprint.palette.accent,
        background: blueprint.palette.background,
        surface: blueprint.palette.surface,
        textPrimary: isDarkPalette ? "#FFF9F1" : blueprint.palette.secondary,
        textSecondary: blueprint.palette.textMuted,
        border: blueprint.palette.border,
        success: "#2F6B45",
        warning: "#8A5A18",
        error: "#B42318",
      },
      typography: { ...TYPOGRAPHY[blueprint.typographyStrategy] },
      density: isCompact ? "compact" : isSpacious ? "spacious" : "comfortable",
      shape:
        blueprint.recipeId === "table-story-editorial"
          ? "balanced"
          : isSoft
            ? "soft"
            : family === "editorial"
              ? "sharp"
              : "balanced",
      motion: isRich ? "rich" : "subtle",
    },
  };
}

function isDarkHex(value: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return false;
  const [red, green, blue] = match.slice(1).map((channel) => {
    const normalized = Number.parseInt(channel!, 16) / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722 < 0.22;
}

function cloneVisualIdentity(
  identity: CandidateVisualIdentity,
): CandidateVisualIdentity {
  return {
    ...identity,
    openingRhythm: [...identity.openingRhythm],
    conversionJourney: [...identity.conversionJourney],
    surfaceLanguage: [...identity.surfaceLanguage],
    signatureMotifs: [...identity.signatureMotifs],
  };
}
