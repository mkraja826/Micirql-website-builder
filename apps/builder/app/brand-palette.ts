export type BrandPaletteRoles = {
  primary?: string;
  secondary?: string;
  accent?: string;
  surface?: string;
  border?: string;
};

/**
 * Assign logo-extracted colors by visual role rather than array position.
 * This prevents a pale logo tint from becoming the site's secondary brand
 * color while a strong dark brand color is discarded.
 */
export function mapLogoPalette(colors: readonly string[]): BrandPaletteRoles {
  const valid = [...new Set(colors.filter(isHex))].slice(0, 8);
  if (!valid.length) return {};

  const scored = valid.map((hex) => ({ hex, ...metrics(hex) }));
  const vivid = [...scored].sort((a, b) => b.chroma - a.chroma || Math.abs(a.luminance - 0.5) - Math.abs(b.luminance - 0.5));
  const dark = [...scored].filter((item) => item.luminance < 0.42).sort((a, b) => a.luminance - b.luminance || b.chroma - a.chroma);
  const light = [...scored].filter((item) => item.luminance > 0.72).sort((a, b) => b.luminance - a.luminance);

  const primary = vivid[0]?.hex ?? valid[0];
  const accent = vivid.find((item) => item.hex !== primary)?.hex;
  const secondary = dark.find((item) => item.hex !== primary && item.hex !== accent)?.hex
    ?? dark.find((item) => item.hex !== primary)?.hex;
  const surface = light.find((item) => ![primary, accent, secondary].includes(item.hex))?.hex;
  const border = scored
    .filter((item) => ![primary, accent, secondary, surface].includes(item.hex))
    .sort((a, b) => Math.abs(a.luminance - 0.62) - Math.abs(b.luminance - 0.62))[0]?.hex;

  return {
    ...(primary ? { primary } : {}),
    ...(secondary ? { secondary } : {}),
    ...(accent ? { accent } : {}),
    ...(surface ? { surface } : {}),
    ...(border ? { border } : {}),
  };
}

function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function metrics(hex: string) {
  const value = hex.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return {
    luminance: 0.2126 * r + 0.7152 * g + 0.0722 * b,
    chroma: max - min,
  };
}
