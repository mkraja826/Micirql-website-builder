import { siteSchema, type Site } from "@micirql/schema";

type Palette = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
};

const PALETTES: Record<string, Palette> = {
  "dental-clinical-blue": { primary: "#173F5F", secondary: "#DCEAF1", accent: "#4E91AD", background: "#F7FAFC", surface: "#FFFFFF", textPrimary: "#102A3A", textSecondary: "#58707D", border: "#D4E0E6" },
  "dental-navy-premium": { primary: "#151A22", secondary: "#E7DED0", accent: "#B58D57", background: "#F5F0E8", surface: "#FFFCF7", textPrimary: "#1C1A18", textSecondary: "#6F675E", border: "#D8CDBD" },
  "dental-warm-ivory": { primary: "#342E2A", secondary: "#EDE2D2", accent: "#A97852", background: "#FBF7F0", surface: "#FFFDF9", textPrimary: "#302925", textSecondary: "#776A61", border: "#E1D5C7" },
  "dental-lavender-cosmetic": { primary: "#66536F", secondary: "#EEE5EF", accent: "#B17D9C", background: "#FCF8FB", surface: "#FFFFFF", textPrimary: "#322B34", textSecondary: "#756A78", border: "#E4D9E4" },
  "dental-emerald-implant": { primary: "#173E3C", secondary: "#DCEBE7", accent: "#4A9D8A", background: "#F5FAF8", surface: "#FFFFFF", textPrimary: "#17302E", textSecondary: "#58716D", border: "#CFE0DB" },
  "dental-sky-family": { primary: "#2E6685", secondary: "#E2F1F7", accent: "#EAAE6B", background: "#F8FCFE", surface: "#FFFFFF", textPrimary: "#243A46", textSecondary: "#607783", border: "#D7E7EE" },
  "dental-aqua-trust": { primary: "#176B70", secondary: "#DDF1EF", accent: "#F0A96B", background: "#F5FBFA", surface: "#FFFFFF", textPrimary: "#18383A", textSecondary: "#5D7677", border: "#CFE5E2" },
};

/**
 * Reassert the palette family owned by a certified layout after generic AI/brand
 * passes have run. A real uploaded logo may influence the accent, but it does
 * not replace the blueprint's tonal architecture.
 */
export function applyLockedBlueprintPalette(site: Site): Site {
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  const locked = home?.sections.find((section) => section.props?.layoutVisualLock === true && Array.isArray(section.props?.layoutPaletteIds));
  if (!locked) return site;

  const ids = (locked.props?.layoutPaletteIds as unknown[]).filter((value): value is string => typeof value === "string");
  const paletteId = ids.find((id) => PALETTES[id]);
  const palette = paletteId ? PALETTES[paletteId] : undefined;
  if (!palette) return site;

  const brand = next.theme.brand;
  const previousPrimary = brand.colors.primary;
  const hasCustomerLogo = Boolean(brand.logoAssetId || brand.logoOriginalAssetId);
  brand.colors = {
    ...brand.colors,
    ...palette,
    ...(hasCustomerLogo && isHex(previousPrimary) ? { accent: previousPrimary } : {}),
  };

  const prior = brand.intelligence?.recommendations ?? [];
  if (brand.intelligence) {
    brand.intelligence.recommendations = [
      `Blueprint palette locked: ${paletteId}`,
      hasCustomerLogo ? "Customer logo color retained as a controlled accent." : "Certified palette used without logo override.",
      ...prior.filter((item) => !item.startsWith("Blueprint palette locked:")),
    ].slice(0, 12);
  }

  return siteSchema.parse(next);
}

function isHex(value: string) { return /^#[0-9a-f]{6}$/i.test(value.trim()); }
