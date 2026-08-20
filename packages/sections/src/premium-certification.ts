import type { SectionFamily, SectionVariant } from "./catalog";

export type SectionCertificationTier = "premium" | "standard" | "draft";

export type SectionVariantCertification = {
  family: SectionFamily;
  variant: SectionVariant;
  tier: SectionCertificationTier;
  approvedForGeneration: boolean;
  reason: string;
};

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

export function certifiedVariantsFor(family: SectionFamily): readonly SectionVariant[] {
  return PREMIUM_VARIANTS[family];
}

export function isPremiumCertifiedVariant(family: SectionFamily, variant: SectionVariant): boolean {
  return PREMIUM_VARIANTS[family].includes(variant);
}

export function resolvePremiumCertifiedVariant(family: SectionFamily, requested: SectionVariant): SectionVariant {
  const approved = PREMIUM_VARIANTS[family];
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
  };
}
