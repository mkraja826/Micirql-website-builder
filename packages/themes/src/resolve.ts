import type { ThemeFamily, ThemeModifier } from "@micirql/schema";
import { THEME_FAMILIES } from "./families";
import type { ResolvedTheme, ThemeRequest, ThemeTokens } from "./types";

const TYPE_HIERARCHIES: Record<
  ThemeFamily,
  {
    displayWeight: string;
    headingWeight: string;
    displayLeading: string;
    headingLeading: string;
    headingTracking: string;
  }
> = {
  minimalist: {
    displayWeight: "680",
    headingWeight: "650",
    displayLeading: "0.98",
    headingLeading: "1.1",
    headingTracking: "-0.02em",
  },
  corporate: {
    displayWeight: "760",
    headingWeight: "720",
    displayLeading: "0.96",
    headingLeading: "1.06",
    headingTracking: "-0.025em",
  },
  luxury: {
    displayWeight: "440",
    headingWeight: "480",
    displayLeading: "0.94",
    headingLeading: "1.02",
    headingTracking: "-0.04em",
  },
  editorial: {
    displayWeight: "540",
    headingWeight: "600",
    displayLeading: "0.92",
    headingLeading: "1.02",
    headingTracking: "-0.035em",
  },
  glass: {
    displayWeight: "720",
    headingWeight: "680",
    displayLeading: "0.98",
    headingLeading: "1.08",
    headingTracking: "-0.03em",
  },
  maximalist: {
    displayWeight: "900",
    headingWeight: "820",
    displayLeading: "0.86",
    headingLeading: "0.98",
    headingTracking: "-0.045em",
  },
  organic: {
    displayWeight: "650",
    headingWeight: "620",
    displayLeading: "1",
    headingLeading: "1.1",
    headingTracking: "-0.02em",
  },
  futuristic: {
    displayWeight: "760",
    headingWeight: "700",
    displayLeading: "0.92",
    headingLeading: "1.02",
    headingTracking: "-0.035em",
  },
  playful: {
    displayWeight: "780",
    headingWeight: "720",
    displayLeading: "0.94",
    headingLeading: "1.04",
    headingTracking: "-0.035em",
  },
  cinematic: {
    displayWeight: "840",
    headingWeight: "740",
    displayLeading: "0.88",
    headingLeading: "1",
    headingTracking: "-0.04em",
  },
};

function applyModifier(
  tokens: ThemeTokens,
  modifier: ThemeModifier,
): ThemeTokens {
  switch (modifier) {
    case "liquid":
      return {
        ...tokens,
        radiusControl: "1.5rem",
        radiusCard: "2.5rem",
        motionDistance: "18px",
        imageRadius: "2.5rem",
      };
    case "rounded":
      return {
        ...tokens,
        radiusControl: "1rem",
        radiusCard: "1.5rem",
        imageRadius: "1.5rem",
      };
    case "sharp":
      return {
        ...tokens,
        radiusControl: "0.125rem",
        radiusCard: "0.125rem",
        imageRadius: "0px",
      };
    case "motion-rich":
      return {
        ...tokens,
        motionFast: "150ms",
        motionStandard: "340ms",
        motionDistance: "24px",
      };
    case "motion-subtle":
      return {
        ...tokens,
        motionFast: "120ms",
        motionStandard: "200ms",
        motionDistance: "8px",
      };
    case "3d-depth":
      return {
        ...tokens,
        shadowCard: "0 28px 80px rgb(0 0 0 / .18)",
        shadowControl: "0 10px 30px rgb(0 0 0 / .1)",
      };
    case "neon-glow":
      return {
        ...tokens,
        shadowCard:
          "0 0 64px color-mix(in srgb, var(--mi-color-accent) 18%, transparent)",
        shadowControl:
          "0 0 28px color-mix(in srgb, var(--mi-color-accent) 20%, transparent)",
      };
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

function applyExperience(
  tokens: ThemeTokens,
  request: ThemeRequest,
): ThemeTokens {
  const density = request.density ?? "comfortable";
  const shape = request.shape ?? "balanced";
  const motion = request.motion ?? "standard";
  const densityTokens: Partial<ThemeTokens> =
    density === "compact"
      ? { sectionSpace: "clamp(3rem, 6vw, 5rem)" }
      : density === "spacious"
        ? { sectionSpace: "clamp(5rem, 10vw, 9rem)" }
        : {};
  const shapeTokens: Partial<ThemeTokens> =
    shape === "sharp"
      ? {
          radiusControl: "0.2rem",
          radiusCard: "0.35rem",
          imageRadius: "0.2rem",
        }
      : shape === "soft"
        ? {
            radiusControl: "1.1rem",
            radiusCard: "1.75rem",
            imageRadius: "1.75rem",
          }
        : {};
  const motionTokens: Partial<ThemeTokens> =
    motion === "none"
      ? { motionFast: "0ms", motionStandard: "0ms", motionDistance: "0px" }
      : motion === "subtle"
        ? {
            motionFast: "120ms",
            motionStandard: "200ms",
            motionDistance: "8px",
          }
        : motion === "rich"
          ? {
              motionFast: "160ms",
              motionStandard: "360ms",
              motionDistance: "24px",
            }
          : {};
  return { ...tokens, ...densityTokens, ...shapeTokens, ...motionTokens };
}

function toCssVariables(
  request: ThemeRequest,
  tokens: ThemeTokens,
): Record<string, string> {
  const { colors, typography } = request;
  const type = TYPE_HIERARCHIES[request.family];
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
    "--mi-display-weight": type.displayWeight,
    "--mi-heading-weight": type.headingWeight,
    "--mi-display-tracking": tokens.displayTracking,
    "--mi-heading-tracking": type.headingTracking,
    "--mi-display-leading": type.displayLeading,
    "--mi-heading-leading": type.headingLeading,
    "--mi-body-leading": tokens.bodyLeading,
    "--mi-motion-fast": tokens.motionFast,
    "--mi-motion-standard": tokens.motionStandard,
    "--mi-motion-distance": tokens.motionDistance,
    "--mi-image-radius": tokens.imageRadius,
  };
}

export function resolveTheme(request: ThemeRequest): ResolvedTheme {
  const modifiers = [...new Set(request.modifiers ?? [])].slice(0, 3);
  const base = THEME_FAMILIES[request.family];
  const tokens = applyExperience(
    modifiers.reduce(applyModifier, base),
    request,
  );

  return {
    family: request.family,
    modifiers,
    tokens,
    cssVariables: toCssVariables(request, tokens),
  };
}

export function themeVariablesToStyle(
  variables: Record<string, string>,
): Record<string, string> {
  return { ...variables };
}
