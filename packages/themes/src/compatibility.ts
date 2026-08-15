import type { ThemeFamily, ThemeModifier } from "@micirql/schema";

const INCOMPATIBLE: Partial<Record<ThemeFamily, ThemeModifier[]>> = {
  corporate: ["neon-glow", "liquid"],
  luxury: ["neon-glow"],
  editorial: ["3d-depth", "neon-glow"],
  organic: ["neon-glow", "sharp"],
  playful: ["sharp"],
  cinematic: ["illustrative"]
};

export function validateThemeModifiers(
  family: ThemeFamily,
  modifiers: ThemeModifier[]
): { valid: boolean; rejected: ThemeModifier[] } {
  const blocked = new Set(INCOMPATIBLE[family] ?? []);
  const rejected = modifiers.filter((modifier) => blocked.has(modifier));
  return { valid: rejected.length === 0 && modifiers.length <= 3, rejected };
}

export function compatibleThemeModifiers(
  family: ThemeFamily,
  modifiers: ThemeModifier[]
): ThemeModifier[] {
  const blocked = new Set(INCOMPATIBLE[family] ?? []);
  return [...new Set(modifiers)].filter((modifier) => !blocked.has(modifier)).slice(0, 3);
}
