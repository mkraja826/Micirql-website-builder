export type PaletteStrategy = {
  id: string;
  name: string;
  description: string;
  roles: {
    page: string;
    hero: string;
    sectionA: string;
    sectionB: string;
    card: string;
    primaryCta: string;
    footer: string;
  };
};

/** Values are semantic brand-token references, never arbitrary generated colors. */
export const PALETTE_STRATEGIES: PaletteStrategy[] = [
  {
    id: "light-corporate",
    name: "Light Corporate",
    description: "Neutral canvas with controlled brand emphasis.",
    roles: { page: "background", hero: "surface", sectionA: "background", sectionB: "surface", card: "background", primaryCta: "primary", footer: "secondary" },
  },
  {
    id: "brand-heavy",
    name: "Brand Heavy",
    description: "Strong branded hero and conversion bands with calmer reading sections.",
    roles: { page: "background", hero: "primary", sectionA: "background", sectionB: "surface", card: "background", primaryCta: "accent", footer: "secondary" },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Quiet reading canvas with oversized brand accents and dark typography.",
    roles: { page: "surface", hero: "surface", sectionA: "surface", sectionB: "background", card: "background", primaryCta: "primary", footer: "secondary" },
  },
  {
    id: "dark-premium",
    name: "Dark Premium",
    description: "Dark branded shell with bright brand accents and elevated content cards.",
    roles: { page: "secondary", hero: "secondary", sectionA: "secondary", sectionB: "background", card: "surface", primaryCta: "primary", footer: "secondary" },
  },
  {
    id: "color-block",
    name: "Color Block",
    description: "Alternating brand, neutral and dark sections for strong visual rhythm.",
    roles: { page: "background", hero: "primary", sectionA: "surface", sectionB: "secondary", card: "background", primaryCta: "accent", footer: "secondary" },
  },
];
