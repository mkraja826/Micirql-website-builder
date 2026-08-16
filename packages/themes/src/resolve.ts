import type { ThemeModifier } from "@micirql/schema";
import { THEME_FAMILIES } from "./families";
import type { ResolvedTheme, ThemeRequest, ThemeTokens } from "./types";

function applyModifier(tokens: ThemeTokens, modifier: ThemeModifier): ThemeTokens {
  switch (modifier) {
    case "liquid":
      return { ...tokens, radiusControl: "1.5rem", radiusCard: "2.5rem", motionDistance: "18px", imageRadius: "2.5rem" };
    case "rounded":
      return { ...tokens, radiusControl: "1rem", radiusCard: "1.5rem", imageRadius: "1.5rem" };
    case "sharp":
      return { ...tokens, radiusControl: "0.125rem", radiusCard: "0.125rem", imageRadius: "0px" };
    case "motion-rich":
      return { ...tokens, motionFast: "150ms", motionStandard: "340ms", motionDistance: "24px" };
    case "motion-subtle":
      return { ...tokens, motionFast: "120ms", motionStandard: "200ms", motionDistance: "8px" };
    case "3d-depth":
      return { ...tokens, shadowCard: "0 28px 80px rgb(0 0 0 / .18)", shadowControl: "0 10px 30px rgb(0 0 0 / .1)" };
    case "neon-glow":
      return { ...tokens, shadowCard: "0 0 64px color-mix(in srgb, var(--mi-color-accent) 18%, transparent)", shadowControl: "0 0 28px color-mix(in srgb, var(--mi-color-accent) 20%, transparent)" };
    case "texture-grain":
      return { ...tokens, surfaceOpacity: ".96" };
    case "geometric":
      return { ...tokens, radiusCard: "0.5rem", imageRadius: "0.5rem" };
    case "dark":
    case "light":
    case "monochrome":
    case "gradient":
    case "illustrative":
    case "photography-led":
      return tokens;
  }
}

function applyDensity(tokens: ThemeTokens, density: ThemeRequest["density"]): ThemeTokens {
  if (density === "compact") return { ...tokens, sectionSpace: "clamp(3rem, 6vw, 5rem)", bodyLeading: "1.55" };
  if (density === "spacious") return { ...tokens, sectionSpace: "clamp(6rem, 11vw, 10rem)", bodyLeading: "1.75" };
  return { ...tokens, sectionSpace: "clamp(4.5rem, 8vw, 7rem)", bodyLeading: "1.65" };
}

function applyShape(tokens: ThemeTokens, shape: ThemeRequest["shape"]): ThemeTokens {
  if (shape === "sharp") return { ...tokens, radiusControl: "0.2rem", radiusCard: "0.25rem", imageRadius: "0.25rem" };
  if (shape === "soft") return { ...tokens, radiusControl: "1rem", radiusCard: "1.75rem", imageRadius: "1.75rem" };
  return { ...tokens, radiusControl: "0.65rem", radiusCard: "1rem", imageRadius: "1rem" };
}

function toCssVariables(request: ThemeRequest, tokens: ThemeTokens): Record<string, string> {
  const { colors, typography } = request;
  return {
    "--mi-color-primary": colors.primary,
    "--mi-color-primary-contrast": colors.primaryContrast,
    "--mi-color-secondary": colors.secondary,
    "--mi-color-secondary-contrast": colors.secondaryContrast,
    "--mi-color-accent": colors.accent,
    "--mi-color-surface": colors.surface,
    "--mi-color-surface-elevated": colors.surfaceElevated,
    "--mi-color-text": colors.text,
    "--mi-color-text-muted": colors.textMuted,
    "--mi-color-border": colors.border,
    "--mi-color-danger": colors.danger,
    "--mi-color-success": colors.success,
    "--mi-color-warning": colors.warning,
    "--mi-font-display": typography.display,
    "--mi-font-body": typography.body,
    "--mi-radius-control": tokens.radiusControl,
    "--mi-radius-card": tokens.radiusCard,
    "--mi-shadow-control": tokens.shadowControl,
    "--mi-shadow-card": tokens.shadowCard,
    "--mi-border-width": tokens.borderWidth,
    "--mi-surface-opacity": tokens.surfaceOpacity,
    "--mi-backdrop-blur": tokens.blur,
    "--mi-section-space": tokens.sectionSpace,
    "--mi-control-weight": tokens.controlWeight,
    "--mi-display-tracking": tokens.displayTracking,
    "--mi-body-leading": tokens.bodyLeading,
    "--mi-motion-fast": tokens.motionFast,
    "--mi-motion-standard": tokens.motionStandard,
    "--mi-motion-distance": tokens.motionDistance,
    "--mi-image-radius": tokens.imageRadius
  };
}

export function resolveTheme(request: ThemeRequest): ResolvedTheme {
  const modifiers = [...new Set(request.modifiers ?? [])].slice(0, 3);
  const base = THEME_FAMILIES[request.family];
  const modified = modifiers.reduce(applyModifier, base);
  const densityApplied = applyDensity(modified, request.density ?? "comfortable");
  const tokens = applyShape(densityApplied, request.shape ?? "balanced");

  return {
    family: request.family,
    modifiers,
    tokens,
    cssVariables: toCssVariables(request, tokens)
  };
}

export function themeVariablesToStyle(variables: Record<string, string>): Record<string, string> {
  return { ...variables };
}
