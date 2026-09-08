import {
  resolveIndustryDesignPack,
  type IndustryCompositionRecipe,
  type IndustryDesignPack,
  type IndustryPalette,
  type IndustrySubindustry,
  type IndustryTypography,
} from "@micirql/design-engine";

export type IndustryPackSelectionInput = {
  industry?: string | null | undefined;
  subindustry?: string | null | undefined;
  goals?: string[] | null | undefined;
  styleTags?: string[] | null | undefined;
  services?: string[] | null | undefined;
};

export type IndustryPackSelection = {
  pack: IndustryDesignPack;
  subindustry: IndustrySubindustry | null;
  palette: IndustryPalette;
  typography: IndustryTypography;
  recipe: IndustryCompositionRecipe;
  reasons: string[];
};

const MIN_BODY_TEXT_CONTRAST = 4.5;
const MIN_ACCENT_DISTINCTION = 1.5;

export function selectIndustryPack(input: IndustryPackSelectionInput): IndustryPackSelection | null {
  const pack = resolveIndustryDesignPack(input.industry ?? undefined, input.subindustry ?? undefined);
  if (!pack) return null;

  const text = normalize([
    input.industry,
    input.subindustry,
    ...(input.goals ?? []),
    ...(input.styleTags ?? []),
    ...(input.services ?? []),
  ]);

  const subindustry = chooseSubindustry(pack, text);
  const personality = normalize(input.styleTags ?? []);
  const compatiblePalettes = pack.palettes.filter(isPaletteCompatible);

  const palette = chooseByScore(
    compatiblePalettes,
    (candidate) => scorePreferred(candidate.id, subindustry?.preferredPaletteIds)
      + scoreTerms(candidate.personality, `${text} ${personality}`),
  );

  const typography = chooseByScore(
    pack.typography,
    (candidate) => scorePreferred(candidate.id, subindustry?.preferredTypographyIds) + scoreTerms(candidate.mood, `${text} ${personality}`),
  ) ?? pack.typography[0];

  const recipe = chooseByScore(
    pack.compositionRecipes,
    (candidate) => scorePreferred(candidate.id, subindustry?.preferredRecipeIds) + scoreTerms([...candidate.goals, ...candidate.personalities], `${text} ${personality}`),
  ) ?? pack.compositionRecipes[0];

  if (!palette || !typography || !recipe) return null;

  const reasons = [
    `Resolved ${pack.label} industry pack`,
    subindustry ? `Matched ${subindustry.label} sub-industry` : `Used ${pack.label} general fallback`,
    `Selected ${palette.label} certified palette`,
    `Selected ${typography.label} typography system`,
    `Selected ${recipe.label} composition recipe`,
  ];

  return { pack, subindustry, palette, typography, recipe, reasons };
}

function chooseSubindustry(pack: IndustryDesignPack, text: string): IndustrySubindustry | null {
  let best: { candidate: IndustrySubindustry; score: number } | null = null;
  for (const candidate of pack.subindustries) {
    const score = candidate.keywords.reduce((total, keyword) => total + (text.includes(keyword.toLowerCase()) ? Math.max(10, keyword.length) : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { candidate, score };
  }
  return best?.candidate ?? null;
}

function chooseByScore<T>(items: T[], scorer: (item: T) => number): T | undefined {
  return items
    .map((item, index) => ({ item, index, score: scorer(item) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.item;
}

function scorePreferred(id: string, preferred?: string[] | null) {
  if (!preferred?.length) return 0;
  const index = preferred.indexOf(id);
  return index < 0 ? 0 : Math.max(10, 50 - index * 10);
}

function scoreTerms(terms: string[], text: string) {
  const normalized = text.toLowerCase();
  return terms.reduce((score, term) => score + (normalized.includes(term.toLowerCase()) ? 12 : 0), 0);
}

function normalize(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(" ").toLowerCase();
}

function isPaletteCompatible(palette: IndustryPalette) {
  const primaryText = parseHex(palette.colors.text);
  const secondaryText = parseHex(palette.colors.mutedText);
  const accent = parseHex(palette.colors.accent);
  const compiledBackground = parseHex(palette.colors.surfaceAlt);
  const compiledSurface = parseHex(palette.colors.surface);
  if (!primaryText || !secondaryText || !accent || !compiledBackground || !compiledSurface) return false;

  const bodyTextCompatible = [
    contrastRatio(primaryText, compiledBackground),
    contrastRatio(primaryText, compiledSurface),
    contrastRatio(secondaryText, compiledBackground),
    contrastRatio(secondaryText, compiledSurface),
  ].every((ratio) => ratio >= MIN_BODY_TEXT_CONTRAST);
  const accentCompatible = contrastRatio(accent, compiledBackground) >= MIN_ACCENT_DISTINCTION
    && contrastRatio(accent, compiledSurface) >= MIN_ACCENT_DISTINCTION;

  return bodyTextCompatible && accentCompatible;
}

type Rgb = { r: number; g: number; b: number };
function parseHex(value: string): Rgb | null {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i);
  const hex = match?.[1];
  if (!hex) return null;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}
function contrastRatio(a: Rgb, b: Rgb) {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}
function luminance({ r, g, b }: Rgb) {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}
