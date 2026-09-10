import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import type { ThemeIntent, ThemeTokens } from "./schema";

const TYPOGRAPHY = {
  editorial: { displayFamily: "Georgia, 'Times New Roman', serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.035em", bodyTracking: "0em", headingScale: "expressive" as const },
  modern: { displayFamily: "Arial, Helvetica, sans-serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 600, bodyWeight: 400, headingTracking: "-0.04em", bodyTracking: "-0.005em", headingScale: "balanced" as const },
  human: { displayFamily: "Georgia, 'Times New Roman', serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.02em", bodyTracking: "0.005em", headingScale: "balanced" as const },
  technical: { displayFamily: "Arial, Helvetica, sans-serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 700, bodyWeight: 400, headingTracking: "-0.03em", bodyTracking: "0em", headingScale: "compact" as const },
  luxury: { displayFamily: "Georgia, 'Times New Roman', serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.045em", bodyTracking: "0.01em", headingScale: "expressive" as const },
};

const PALETTES = {
  "warm-light": { background: "#f5f0e8", surface: "#fbf8f2", surfaceStrong: "#e9dfd0", text: "#211f1b", textMuted: "#6c655c", accent: "#315f58", accentContrast: "#ffffff", border: "#d9d0c4" },
  "cool-light": { background: "#f2f5f4", surface: "#ffffff", surfaceStrong: "#dfe8e6", text: "#18201f", textMuted: "#64706e", accent: "#2e6560", accentContrast: "#ffffff", border: "#d7e0de" },
  "deep-dark": { background: "#0f1514", surface: "#151d1b", surfaceStrong: "#202b28", text: "#f3f1ea", textMuted: "#a8b0ac", accent: "#b9d0c2", accentContrast: "#101513", border: "#2b3834" },
  neutral: { background: "#f5f5f2", surface: "#ffffff", surfaceStrong: "#e7e7e1", text: "#1f211f", textMuted: "#686d68", accent: "#363d39", accentContrast: "#ffffff", border: "#d9dcd7" },
  earthy: { background: "#f1ece4", surface: "#f8f4ed", surfaceStrong: "#ded2c1", text: "#2a241e", textMuted: "#75695d", accent: "#765b43", accentContrast: "#ffffff", border: "#d3c7b8" },
};

export function inferThemeIntent(brief: InterpretedBrief, art: ArtDirection): ThemeIntent {
  const signal = `${art.visualStyle} ${art.typography.personality} ${art.mood.join(" ")} ${brief.positioning.brandTraits.value.join(" ")}`.toLowerCase();
  const typographyMood: ThemeIntent["typographyMood"] = signal.includes("luxury") ? "luxury" : signal.includes("editorial") ? "editorial" : signal.includes("technical") || signal.includes("precision") ? "technical" : signal.includes("warm") || signal.includes("human") ? "human" : "modern";
  const paletteMood: ThemeIntent["paletteMood"] = art.color.contrastMode === "dark" ? "deep-dark" : signal.includes("warm") || signal.includes("calm") || signal.includes("luxury") ? "warm-light" : signal.includes("earth") || signal.includes("natural") ? "earthy" : signal.includes("clinical") || signal.includes("clean") ? "cool-light" : "neutral";
  const accentMood: ThemeIntent["accentMood"] = art.color.accentBehavior.toLowerCase().includes("vivid") ? "vivid" : art.color.accentBehavior.toLowerCase().includes("restrain") ? "restrained" : "confident";
  const radiusMood: ThemeIntent["radiusMood"] = art.layout.geometry.toLowerCase().includes("sharp") ? "sharp" : signal.includes("soft") || signal.includes("warm") ? "soft" : "subtle";
  const surfaceMood: ThemeIntent["surfaceMood"] = signal.includes("editorial") ? "editorial" : signal.includes("layer") ? "layered" : signal.includes("quiet") || signal.includes("luxury") ? "quiet" : "flat";
  return { typographyMood, paletteMood, accentMood, radiusMood, surfaceMood };
}

export function compileThemeTokens(brief: InterpretedBrief, art: ArtDirection): ThemeTokens {
  const intent = inferThemeIntent(brief, art);
  const density = art.layout.density;
  const typography = TYPOGRAPHY[intent.typographyMood];
  const color = PALETTES[intent.paletteMood];
  const radius = intent.radiusMood === "sharp" ? "none" : intent.radiusMood === "soft" ? "soft" : "subtle";
  const sectionY = density === "low" ? 120 : density === "high" ? 72 : 96;
  const contentGap = density === "low" ? 48 : density === "high" ? 24 : 36;
  const durationMs = art.motion.intensity === "none" ? 0 : art.motion.intensity === "moderate" ? 420 : 280;

  return {
    version: "1.0",
    typography,
    color,
    spacing: { base: 8, sectionY, contentGap, compactGap: 16, maxWidth: 1180 },
    shape: { radius, borderWeight: 1 },
    surface: { treatment: intent.surfaceMood, shadow: intent.surfaceMood === "layered" ? "subtle" : "none" },
    density,
    motion: { intensity: art.motion.intensity, durationMs, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  };
}

export function themeTokensToCssVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    "--theme-bg": tokens.color.background,
    "--theme-surface": tokens.color.surface,
    "--theme-surface-strong": tokens.color.surfaceStrong,
    "--theme-text": tokens.color.text,
    "--theme-text-muted": tokens.color.textMuted,
    "--theme-accent": tokens.color.accent,
    "--theme-accent-contrast": tokens.color.accentContrast,
    "--theme-border": tokens.color.border,
    "--theme-display-font": tokens.typography.displayFamily,
    "--theme-body-font": tokens.typography.bodyFamily,
    "--theme-section-y": `${tokens.spacing.sectionY}px`,
    "--theme-content-gap": `${tokens.spacing.contentGap}px`,
    "--theme-max-width": `${tokens.spacing.maxWidth}px`,
    "--theme-motion-duration": `${tokens.motion.durationMs}ms`,
    "--theme-motion-easing": tokens.motion.easing,
  };
}
