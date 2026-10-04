import {
  brandInputSchema,
  brandProvenanceSchema,
  type BrandInput,
  type BrandProvenance,
  type ThemeConfig,
} from "@micirql/schema";

export function provenanceForBrandInput(value: unknown): {
  input: BrandInput | undefined;
  provenance: BrandProvenance | undefined;
} {
  if (!value) return { input: undefined, provenance: undefined };
  const input = brandInputSchema.parse(value);
  const provenance = brandProvenanceSchema.parse({
    ...(input.logoAssetId ? { logo: "user-upload" } : {}),
    colors: {
      ...(input.colors.primary ? { primary: "user-supplied" } : {}),
      ...(input.colors.secondary ? { secondary: "user-supplied" } : {}),
      ...(input.colors.accent ? { accent: "user-supplied" } : {}),
    },
  });
  const hasInput = Boolean(input.logoAssetId || Object.values(input.colors).some(Boolean));
  return hasInput ? { input, provenance } : { input: undefined, provenance: undefined };
}

export function applyBrandInput(
  theme: ThemeConfig,
  input?: BrandInput,
  provenance?: BrandProvenance,
): ThemeConfig {
  const next = structuredClone(theme);
  if (!input || !provenance) return next;
  if (provenance.logo === "user-upload" && input.logoAssetId) next.brand.logoAssetId = input.logoAssetId;
  for (const role of ["primary", "secondary", "accent"] as const) {
    if (provenance.colors[role] === "user-supplied" && input.colors[role]) {
      next.brand.colors[role] = input.colors[role];
    }
  }

  if (Object.values(provenance.colors).some(Boolean)) {
    const anchor = input.colors.primary ?? input.colors.secondary ?? input.colors.accent ?? next.brand.colors.primary;
    const dark = relativeLuminance(next.brand.colors.background) < 0.25;
    if (dark) {
      next.brand.colors.background = mix(anchor, "#000000", 0.84);
      next.brand.colors.surface = mix(anchor, "#000000", 0.70);
      next.brand.colors.textPrimary = mix(anchor, "#ffffff", 0.94);
      next.brand.colors.textSecondary = mix(anchor, "#ffffff", 0.78);
      next.brand.colors.border = mix(anchor, "#ffffff", 0.28);
    } else {
      next.brand.colors.background = mix(anchor, "#ffffff", 0.97);
      next.brand.colors.surface = mix(anchor, "#ffffff", 0.91);
      next.brand.colors.textPrimary = mix(anchor, "#000000", 0.78);
      next.brand.colors.textSecondary = ensureContrast(
        mix(anchor, "#000000", 0.58),
        next.brand.colors.background,
        4.5,
      );
      next.brand.colors.border = mix(anchor, "#ffffff", 0.73);
    }
  }

  const issues = brandContrastIssues(next);
  if (issues.length) {
    const error = new Error("BRAND_CONTRAST_FAILED: " + issues.join(" ")) as Error & { code?: string };
    error.code = "BRAND_CONTRAST_FAILED";
    throw error;
  }
  return next;
}

export function brandContrastIssues(theme: ThemeConfig): string[] {
  const colors = theme.brand.colors;
  const pairs: Array<[string, string, string, number]> = [
    ["textPrimary", colors.textPrimary, colors.background, 4.5],
    ["textSecondary", colors.textSecondary, colors.background, 4.5],
    ["primary action", contrastFor(colors.primary), colors.primary, 4.5],
    ["secondary action", contrastFor(colors.secondary), colors.secondary, 4.5],
  ];
  return pairs
    .filter(([, foreground, background, minimum]) => contrastRatio(foreground, background) < minimum)
    .map(([label, foreground, background, minimum]) => label + " contrast " + contrastRatio(foreground, background).toFixed(2) + ":1 is below " + minimum + ":1.");
}

export function contrastRatio(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const light = Math.max(leftLuminance, rightLuminance);
  const dark = Math.min(leftLuminance, rightLuminance);
  return (light + 0.05) / (dark + 0.05);
}

function ensureContrast(color: string, background: string, minimum: number): string {
  if (contrastRatio(color, background) >= minimum) return color;
  return contrastRatio("#111111", background) >= minimum ? "#111111" : "#ffffff";
}

function contrastFor(color: string): string {
  return contrastRatio("#111111", color) >= contrastRatio("#ffffff", color) ? "#111111" : "#ffffff";
}

function relativeLuminance(color: string): number {
  const [red, green, blue] = rgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
}

function mix(color: string, target: string, targetWeight: number): string {
  const sourceRgb = rgb(color);
  const targetRgb = rgb(target);
  return "#" + sourceRgb.map((channel, index) => Math.round(channel * (1 - targetWeight) + targetRgb[index]! * targetWeight).toString(16).padStart(2, "0")).join("");
}

function rgb(color: string): [number, number, number] {
  const value = color.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(value)) throw new Error("Expected a six-digit hex color.");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}
