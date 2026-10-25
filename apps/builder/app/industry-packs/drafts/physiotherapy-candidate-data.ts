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
import type { CandidateVisualIdentity, IndustryPackCandidate } from "../types";
import type { IndustryDesignCatalog } from "../design-distinctness";
import {
  PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS,
  PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION,
  type PhysiotherapyCandidateBlueprint,
} from "./physiotherapy-candidate-blueprints";
import {
  PHYSIOTHERAPY_DRAFT_CATALOG_VERSION,
  PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
  PHYSIOTHERAPY_DRAFT_PROTOTYPE_VARIANTS,
  PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
  physiotherapyDraftPack,
} from "./physiotherapy";

export type PhysiotherapyDraftCandidate = IndustryPackCandidate & {
  candidateStatus: "draft-unregistered";
  blueprintVersion: typeof PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION;
  homeFlow: readonly SectionFamily[];
  navigationComposition: string;
  openingComposition: string;
  cardSystem: string;
  processVisualization: string;
  surfaceRhythm: string;
  conversionPattern: string;
  imageTreatment: string;
  mobileReflow: string;
  requiredFacts: readonly ("location" | "opening-hours")[];
};

const OPTIONAL_EVIDENCE_FAMILIES = [
  "about",
  "testimonials",
  "gallery",
  "team",
] as const satisfies readonly SectionFamily[];

const THEME_MODIFIERS: Record<ThemeFamily, readonly ThemeModifier[]> = {
  minimalist: ["light", "sharp", "motion-subtle"],
  corporate: ["light", "geometric", "motion-subtle"],
  luxury: ["photography-led", "rounded", "motion-subtle"],
  editorial: ["photography-led", "sharp", "texture-grain"],
  glass: ["gradient", "3d-depth", "motion-subtle"],
  maximalist: ["gradient", "motion-rich", "texture-grain"],
  organic: ["rounded", "liquid", "illustrative"],
  futuristic: ["dark", "neon-glow", "geometric"],
  playful: ["rounded", "illustrative", "motion-rich"],
  cinematic: ["photography-led", "sharp", "motion-subtle"],
};

const TYPOGRAPHY: Record<TypographyStrategy, BrandTokens["typography"]> = {
  "corporate-sans": {
    display: "Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
  },
  "humanist-sans": {
    display: "Manrope, Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
    body: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
    ui: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
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
    display: "Impact, Haettenschweiler, Arial Narrow Bold, sans-serif",
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
  cinematic: "editorial",
};

export const PHYSIOTHERAPY_DRAFT_CANDIDATES =
  PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS.map(
    candidateFromBlueprint,
  ) satisfies readonly PhysiotherapyDraftCandidate[];

/**
 * Archived staging catalog retained for audit and regression evidence. The
 * certified pack derives immutable candidate identities from this data through
 * its own registry/runtime boundary; these historical records deliberately keep
 * their original failing release gates.
 */
export const physiotherapyDraftCandidateCatalog = {
  id: physiotherapyDraftPack.identity.id,
  designGrammar: physiotherapyDraftPack.designGrammar,
  listCandidates: listPhysiotherapyDraftCandidates,
} satisfies IndustryDesignCatalog;

export function listPhysiotherapyDraftCandidates(): PhysiotherapyDraftCandidate[] {
  return PHYSIOTHERAPY_DRAFT_CANDIDATES.map((candidate) => ({
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
  blueprint: PhysiotherapyCandidateBlueprint,
): PhysiotherapyDraftCandidate {
  const sectionOrder = sectionOrderFor(blueprint);
  const visualIdentity: CandidateVisualIdentity = {
    id: `physiotherapy-${blueprint.recipeId}-visual-v1`,
    visualThesis: blueprint.thesis,
    heroComposition: blueprint.heroComposition,
    openingRhythm: ["hero", ...blueprint.homeFlow.slice(0, 3)],
    conversionJourney: [...blueprint.homeFlow],
    surfaceLanguage: [
      blueprint.navigationComposition,
      blueprint.openingComposition,
      blueprint.cardSystem,
      blueprint.processVisualization,
      blueprint.surfaceRhythm,
      blueprint.conversionPattern,
      blueprint.imageTreatment,
    ],
    signatureMotifs: [...blueprint.motifs],
  };

  return {
    id: blueprint.id,
    catalogVersion: PHYSIOTHERAPY_DRAFT_CATALOG_VERSION,
    recipeId: blueprint.recipeId,
    visualIdentity,
    name: blueprint.name,
    description: blueprint.thesis,
    domain: "clinic",
    subtype: "physiotherapy",
    archetype: "healthcare-clinic",
    theme: themeFor(blueprint),
    variants: variantsFor(blueprint.variantSeed),
    sectionOrder,
    paletteStrategy: PALETTE_STRATEGY[blueprint.themeFamily],
    typographyStrategy: blueprint.typographyStrategy,
    imageStrategy: blueprint.imageStrategy,
    styleTags: [
      "physiotherapy",
      `candidate:${blueprint.recipeId}`,
      ...blueprint.motifs,
    ],
    rankSeed: blueprint.variantSeed,
    requiredPagePaths: PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
    requiredActions: PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
    gate: {
      passed: false,
      score: 0,
      issues: [
        {
          code: "PHYSIOTHERAPY_DRAFT_CANDIDATE_UNCERTIFIED",
          message:
            "This archived staging candidate is not a certified runtime record; use the promoted Physiotherapy catalog for production generation.",
          severity: "error",
        },
      ],
    },
    candidateStatus: "draft-unregistered",
    blueprintVersion: PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION,
    homeFlow: [...blueprint.homeFlow],
    navigationComposition: blueprint.navigationComposition,
    openingComposition: blueprint.openingComposition,
    cardSystem: blueprint.cardSystem,
    processVisualization: blueprint.processVisualization,
    surfaceRhythm: blueprint.surfaceRhythm,
    conversionPattern: blueprint.conversionPattern,
    imageTreatment: blueprint.imageTreatment,
    mobileReflow: blueprint.mobileReflow,
    requiredFacts: [...blueprint.requiredFacts],
  };
}

function sectionOrderFor(
  blueprint: PhysiotherapyCandidateBlueprint,
): SectionFamily[] {
  const offset =
    (blueprint.variantSeed - 1) % OPTIONAL_EVIDENCE_FAMILIES.length;
  const optional = [
    ...OPTIONAL_EVIDENCE_FAMILIES.slice(offset),
    ...OPTIONAL_EVIDENCE_FAMILIES.slice(0, offset),
  ];
  return ["navbar", "hero", ...blueprint.homeFlow, ...optional, "footer"];
}

function variantsFor(seed: number): Record<SectionFamily, SectionVariant> {
  if (seed === 1) return { ...PHYSIOTHERAPY_DRAFT_PROTOTYPE_VARIANTS };
  const row = (seed - 1) % 5;
  const group = Math.floor((seed - 1) / 5);
  return Object.fromEntries(
    SECTION_FAMILIES.map((family, familyIndex) => [
      family,
      (((row +
        (familyIndex + 1) * (group + 1) +
        Math.floor(familyIndex / 3) * seed) %
        5) +
        1) as SectionVariant,
    ]),
  ) as Record<SectionFamily, SectionVariant>;
}

function themeFor(blueprint: PhysiotherapyCandidateBlueprint): ThemeConfig {
  const family = blueprint.themeFamily;
  const isCompact = family === "corporate";
  const isSpacious = ["minimalist", "luxury", "cinematic"].includes(family);
  const isSoft = ["organic", "playful", "luxury", "glass"].includes(family);
  const isRich = ["maximalist", "playful"].includes(family);
  return {
    family,
    modifiers:
      blueprint.recipeId === "movement-pathway"
        ? ["light", "rounded", "motion-subtle"]
        : [...THEME_MODIFIERS[family]],
    brand: {
      colors: {
        primary: blueprint.palette.primary,
        secondary: blueprint.palette.secondary,
        accent: blueprint.palette.accent,
        background: blueprint.palette.background,
        surface: blueprint.palette.surface,
        textPrimary: blueprint.palette.secondary,
        textSecondary: "#526474",
        border: "#CBD8E1",
        success: "#168A4A",
        warning: "#9A5B00",
        error: "#B42318",
      },
      typography: { ...TYPOGRAPHY[blueprint.typographyStrategy] },
      density: isCompact ? "compact" : isSpacious ? "spacious" : "comfortable",
      shape: isSoft ? "soft" : family === "editorial" ? "sharp" : "balanced",
      motion: isRich ? "rich" : "subtle",
    },
  };
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
