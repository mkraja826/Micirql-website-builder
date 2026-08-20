import type { ThemeFamily } from "@micirql/schema";

export const SECTION_FAMILIES = [
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "process",
  "faq",
  "testimonials",
  "gallery",
  "team",
  "cta",
  "contact",
  "footer",
] as const;

export type SectionFamily = (typeof SECTION_FAMILIES)[number];
export type SectionVariant = 1 | 2 | 3 | 4 | 5;

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
  faq: "FAQ",
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
      version: "1.0.0",
      status: "draft" as const,
    })),
  ),
);

export const SEED_SECTION_COUNT = seedSectionCatalog.length;
