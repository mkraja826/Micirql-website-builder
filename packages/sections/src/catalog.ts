import type { ThemeFamily } from "@micirql/schema";

export const SECTION_FAMILIES = [
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "process",
  "testimonials",
  "gallery",
  "team",
  "cta",
  "contact",
  "footer",
] as const;

export type SectionFamily = (typeof SECTION_FAMILIES)[number];
export type SectionVariant = 1 | 2 | 3 | 4 | 5;

/** Layout variants covered by the dental flagship viewport, interaction and
 * rendered-diversity protocol. Only entries in this list may be selected. */
export const DENTAL_CERTIFIED_VARIANTS = [1, 2, 3, 4, 5] as const satisfies readonly SectionVariant[];
export const DENTAL_COMPONENT_VERSION = "1.1.0";

/**
 * Industry-neutral names for the production section registry. The legacy
 * dental exports stay stable because the dental pack's release evidence is
 * pinned to them; another industry still needs its own pack-level visual gate.
 */
export const CERTIFIED_SECTION_VARIANTS = DENTAL_CERTIFIED_VARIANTS;
export const CERTIFIED_SECTION_COMPONENT_VERSION = DENTAL_COMPONENT_VERSION;

export const THEME_CODES: Record<ThemeFamily, string> = {
  minimalist: "MIN",
  corporate: "COR",
  luxury: "LUX",
  editorial: "EDT",
  glass: "GLS",
  maximalist: "MAX",
  organic: "ORG",
  futuristic: "FUT",
  playful: "PLY",
  cinematic: "CIN",
};

export const FAMILY_CODES: Record<SectionFamily, string> = {
  navbar: "NAV",
  hero: "HERO",
  about: "ABOUT",
  services: "SERV",
  features: "FEAT",
  process: "PROC",
  testimonials: "TEST",
  gallery: "GALL",
  team: "TEAM",
  cta: "CTA",
  contact: "CONT",
  footer: "FOOT",
};

export const LAYOUT_VARIANTS = {
  1: "stacked",
  2: "split",
  3: "centered",
  4: "editorial",
  5: "immersive",
} as const;

export function sectionDesignId(theme: ThemeFamily, family: SectionFamily, variant: SectionVariant): string {
  return `${THEME_CODES[theme]}-${FAMILY_CODES[family]}-${String(variant).padStart(3, "0")}`;
}

export const THEME_FAMILIES: ThemeFamily[] = [
  "minimalist",
  "corporate",
  "luxury",
  "editorial",
  "glass",
  "maximalist",
  "organic",
  "futuristic",
  "playful",
  "cinematic",
];

export const seedSectionCatalog = THEME_FAMILIES.flatMap((theme) =>
  SECTION_FAMILIES.flatMap((family) =>
    ([1, 2, 3, 4, 5] as const).map((variant) => ({
      id: sectionDesignId(theme, family, variant),
      theme,
      family,
      variant,
      layout: LAYOUT_VARIANTS[variant],
      version: DENTAL_COMPONENT_VERSION,
      status: DENTAL_CERTIFIED_VARIANTS.includes(variant)
        ? ("production" as const)
        : ("draft" as const),
    })),
  ),
);

export const dentalCertifiedSectionCatalog = seedSectionCatalog.filter(
  (entry) => entry.status === "production",
);

const dentalCertifiedIds = new Set(
  dentalCertifiedSectionCatalog.map((entry) => `${entry.id}@${entry.version}`),
);

export function isDentalCertifiedSection(componentId: string, version = DENTAL_COMPONENT_VERSION): boolean {
  return dentalCertifiedIds.has(`${componentId}@${version}`);
}

export const certifiedSectionCatalog = dentalCertifiedSectionCatalog;

export function isCertifiedSectionComponent(
  componentId: string,
  version = CERTIFIED_SECTION_COMPONENT_VERSION,
): boolean {
  return isDentalCertifiedSection(componentId, version);
}

export const SEED_SECTION_COUNT = seedSectionCatalog.length;
export const DENTAL_CERTIFIED_SECTION_COUNT = dentalCertifiedSectionCatalog.length;
export const CERTIFIED_SECTION_COUNT = DENTAL_CERTIFIED_SECTION_COUNT;
