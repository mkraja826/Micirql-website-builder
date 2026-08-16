export type SemanticPaletteRole = "background" | "surface" | "primary" | "secondary" | "accent";

export type PaletteStrategy = {
  id: string;
  name: string;
  description: string;
  roles: {
    page: SemanticPaletteRole;
    navbar: SemanticPaletteRole;
    hero: SemanticPaletteRole;
    sectionA: SemanticPaletteRole;
    sectionB: SemanticPaletteRole;
    card: SemanticPaletteRole;
    cta: SemanticPaletteRole;
    primaryCta: SemanticPaletteRole;
    contact: SemanticPaletteRole;
    footer: SemanticPaletteRole;
  };
};

/** Values are semantic brand-token references, never arbitrary generated colors. */
export const PALETTE_STRATEGIES: PaletteStrategy[] = [
  {
    id: "light-corporate",
    name: "Light Corporate",
    description: "Neutral canvas with controlled brand emphasis.",
    roles: { page: "background", navbar: "background", hero: "surface", sectionA: "background", sectionB: "surface", card: "background", cta: "surface", primaryCta: "primary", contact: "background", footer: "secondary" },
  },
  {
    id: "brand-heavy",
    name: "Brand Heavy",
    description: "Strong branded hero and conversion bands with calmer reading sections.",
    roles: { page: "background", navbar: "background", hero: "primary", sectionA: "background", sectionB: "surface", card: "background", cta: "primary", primaryCta: "accent", contact: "surface", footer: "secondary" },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Quiet reading canvas with oversized brand accents and dark typography.",
    roles: { page: "surface", navbar: "surface", hero: "surface", sectionA: "surface", sectionB: "background", card: "background", cta: "secondary", primaryCta: "primary", contact: "background", footer: "secondary" },
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Dark branded shell with bright brand accents and elevated content cards.",
    roles: { page: "secondary", navbar: "secondary", hero: "secondary", sectionA: "secondary", sectionB: "background", card: "surface", cta: "primary", primaryCta: "accent", contact: "secondary", footer: "secondary" },
  },
  {
    id: "color-block",
    name: "Color Block",
    description: "Alternating brand, neutral and dark sections for strong visual rhythm.",
    roles: { page: "background", navbar: "background", hero: "primary", sectionA: "surface", sectionB: "secondary", card: "background", cta: "accent", primaryCta: "secondary", contact: "surface", footer: "secondary" },
  },
];
