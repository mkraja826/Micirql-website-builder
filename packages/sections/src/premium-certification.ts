import type { SectionFamily, SectionVariant } from "./catalog";

export type SectionCertificationTier = "premium" | "standard" | "draft";
export type SectionArtDirection = "quiet-premium" | "warm-modern" | "editorial-minimal" | "modern-premium" | "cinematic-bold";
export type SectionDensity = "compact" | "comfortable" | "spacious";
export type SectionSurfaceRole = "background" | "surface" | "primary" | "secondary" | "accent";
export type SectionContentRequirement = "heading" | "body" | "items" | "image" | "proof" | "action" | "contact-fields";

export type SectionVariantCompatibility = {
  artDirections: readonly SectionArtDirection[];
  densities: readonly SectionDensity[];
  surfaceRoles: readonly SectionSurfaceRole[];
  preferredPreviousFamilies: readonly SectionFamily[];
  preferredNextFamilies: readonly SectionFamily[];
  avoidAdjacentFamilies: readonly SectionFamily[];
  contentRequirements: readonly SectionContentRequirement[];
  responsiveCertified: boolean;
  accessibilityCertified: boolean;
};

export type SectionVariantCertification = {
  family: SectionFamily;
  variant: SectionVariant;
  tier: SectionCertificationTier;
  approvedForGeneration: boolean;
  reason: string;
  compatibility: SectionVariantCompatibility;
};

export type SectionCompatibilityContext = {
  artDirection?: SectionArtDirection;
  density?: SectionDensity;
  surfaceRole?: SectionSurfaceRole;
  previousFamily?: SectionFamily;
  nextFamily?: SectionFamily;
  availableContent?: readonly SectionContentRequirement[];
};

const ALL_DIRECTIONS: readonly SectionArtDirection[] = ["quiet-premium", "warm-modern", "editorial-minimal", "modern-premium", "cinematic-bold"];
const CALM_DIRECTIONS: readonly SectionArtDirection[] = ["quiet-premium", "warm-modern", "editorial-minimal", "modern-premium"];
const EDITORIAL_DIRECTIONS: readonly SectionArtDirection[] = ["quiet-premium", "editorial-minimal", "warm-modern"];
const ALL_DENSITIES: readonly SectionDensity[] = ["compact", "comfortable", "spacious"];
const PREMIUM_DENSITIES: readonly SectionDensity[] = ["comfortable", "spacious"];
const ALL_SURFACES: readonly SectionSurfaceRole[] = ["background", "surface", "primary", "secondary", "accent"];
const LIGHT_SURFACES: readonly SectionSurfaceRole[] = ["background", "surface", "secondary"];

const PREMIUM_VARIANTS: Record<SectionFamily, readonly SectionVariant[]> = {
  navbar: [1, 2, 3],
  hero: [2, 3, 4, 5],
  about: [2, 3, 4],
  services: [2, 3, 4],
  features: [2, 3, 4],
  process: [2, 3, 4],
  faq: [1, 2, 3, 4, 5],
  testimonials: [2, 3, 4],
  gallery: [3, 4, 5],
  team: [2, 3, 4],
  cta: [2, 3, 4, 5],
  contact: [1, 2, 3],
  footer: [1, 2, 3],
};

const FAMILY_REASON: Record<SectionFamily, string> = {
  navbar: "Clear navigation patterns with restrained hierarchy.",
  hero: "Strong opening hierarchy with split, centered, editorial or immersive composition.",
  about: "Balanced narrative layouts that avoid generic stacked presentation.",
  services: "Scannable service presentation with stronger visual hierarchy.",
  features: "Structured differentiation layouts with premium information rhythm.",
  process: "Clear sequential storytelling without default stacked treatment.",
  faq: "Accessible disclosure layouts with certified keyboard, deep-link and reduced-motion behavior.",
  testimonials: "Credibility-focused layouts with stronger proof presentation.",
  gallery: "Visual-first layouts suited to portfolio and evidence sections.",
  team: "Human-trust layouts with balanced profile presentation.",
  cta: "High-emphasis conversion layouts with deliberate action hierarchy.",
  contact: "Functional contact layouts optimized for clarity and completion.",
  footer: "Restrained footer layouts that preserve global hierarchy.",
};

const EMPTY_FAMILIES: readonly SectionFamily[] = [];

function baseCompatibility(family: SectionFamily, variant: SectionVariant): SectionVariantCompatibility {
  const editorial = variant === 4;
  const immersive = variant === 5;
  const centered = variant === 3;
  const split = variant === 2;

  const artDirections = immersive
    ? (["cinematic-bold", "quiet-premium", "modern-premium"] as const)
    : editorial
      ? EDITORIAL_DIRECTIONS
      : ALL_DIRECTIONS;

  const densities = immersive || editorial ? PREMIUM_DENSITIES : ALL_DENSITIES;
  const surfaceRoles = immersive
    ? (["primary", "secondary", "background"] as const)
    : family === "cta"
      ? (["primary", "secondary", "accent"] as const)
      : family === "contact" || family === "faq"
        ? LIGHT_SURFACES
        : ALL_SURFACES;

  const preferredPreviousFamilies: readonly SectionFamily[] = family === "hero"
    ? ["navbar"]
    : family === "cta"
      ? ["testimonials", "process", "features", "services", "gallery", "team", "faq"]
      : family === "contact"
        ? ["cta", "testimonials", "process", "faq"]
        : EMPTY_FAMILIES;

  const preferredNextFamilies: readonly SectionFamily[] = family === "hero"
    ? ["about", "services", "features", "gallery", "team"]
    : family === "cta"
      ? ["contact", "footer"]
      : family === "contact"
        ? ["footer"]
        : EMPTY_FAMILIES;

  const avoidAdjacentFamilies: readonly SectionFamily[] = family === "services" || family === "features" || family === "gallery" || family === "team" || family === "testimonials"
    ? [family]
    : family === "cta"
      ? ["cta"]
      : EMPTY_FAMILIES;

  const contentRequirements: readonly SectionContentRequirement[] = family === "hero"
    ? ["heading", "body", "action", ...(split || immersive ? (["image"] as const) : [])]
    : family === "services" || family === "features" || family === "process" || family === "team" || family === "gallery"
      ? ["heading", "items", ...(family === "gallery" || (family === "team" && immersive) ? (["image"] as const) : [])]
      : family === "testimonials"
        ? ["heading", "proof"]
        : family === "cta"
          ? ["heading", "action"]
          : family === "contact"
            ? ["heading", "contact-fields"]
            : family === "about" || family === "faq"
              ? ["heading", "body"]
              : [];

  return {
    artDirections,
    densities,
    surfaceRoles,
    preferredPreviousFamilies,
    preferredNextFamilies,
    avoidAdjacentFamilies,
    contentRequirements,
    responsiveCertified: true,
    accessibilityCertified: true,
  };
}

export function certifiedVariantsFor(family: SectionFamily): readonly SectionVariant[] {
  return PREMIUM_VARIANTS[family];
}

export function isPremiumCertifiedVariant(family: SectionFamily, variant: SectionVariant): boolean {
  return PREMIUM_VARIANTS[family].includes(variant);
}

export function sectionVariantCompatibility(family: SectionFamily, variant: SectionVariant): SectionVariantCompatibility {
  return baseCompatibility(family, variant);
}

export function isSectionVariantCompatible(family: SectionFamily, variant: SectionVariant, context: SectionCompatibilityContext = {}): boolean {
  if (!isPremiumCertifiedVariant(family, variant)) return false;
  const compatibility = sectionVariantCompatibility(family, variant);
  if (!compatibility.responsiveCertified || !compatibility.accessibilityCertified) return false;
  if (context.artDirection && !compatibility.artDirections.includes(context.artDirection)) return false;
  if (context.density && !compatibility.densities.includes(context.density)) return false;
  if (context.surfaceRole && !compatibility.surfaceRoles.includes(context.surfaceRole)) return false;
  if (context.previousFamily && compatibility.avoidAdjacentFamilies.includes(context.previousFamily)) return false;
  if (context.nextFamily && compatibility.avoidAdjacentFamilies.includes(context.nextFamily)) return false;
  if (context.availableContent) {
    const available = new Set(context.availableContent);
    if (compatibility.contentRequirements.some((requirement) => !available.has(requirement))) return false;
  }
  return true;
}

export function compatibleCertifiedVariantsFor(family: SectionFamily, context: SectionCompatibilityContext = {}): readonly SectionVariant[] {
  return PREMIUM_VARIANTS[family].filter((variant) => isSectionVariantCompatible(family, variant, context));
}

export function resolvePremiumCertifiedVariant(family: SectionFamily, requested: SectionVariant, context: SectionCompatibilityContext = {}): SectionVariant {
  const compatible = compatibleCertifiedVariantsFor(family, context);
  const approved = compatible.length ? compatible : PREMIUM_VARIANTS[family];
  if (approved.includes(requested)) return requested;
  return approved.reduce((best, candidate) =>
    Math.abs(candidate - requested) < Math.abs(best - requested) ? candidate : best,
  approved[0]!);
}

export function sectionVariantCertification(family: SectionFamily, variant: SectionVariant): SectionVariantCertification {
  const premium = isPremiumCertifiedVariant(family, variant);
  return {
    family,
    variant,
    tier: premium ? "premium" : "draft",
    approvedForGeneration: premium,
    reason: premium ? FAMILY_REASON[family] : `Variant ${variant} is not approved for premium automatic generation in the ${family} family.`,
    compatibility: sectionVariantCompatibility(family, variant),
  };
}
