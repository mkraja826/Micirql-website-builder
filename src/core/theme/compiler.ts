import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import type { ThemeIntent, ThemeTokens } from "./schema";

const TYPOGRAPHY = {
  editorial: { displayFamily: "Georgia, 'Times New Roman', serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.035em", bodyTracking: "0em", headingScale: "expressive" as const },
  modern: { displayFamily: "Arial, Helvetica, sans-serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 600, bodyWeight: 400, headingTracking: "-0.04em", bodyTracking: "-0.005em", headingScale: "balanced" as const },
  human: { displayFamily: "Georgia, 'Times New Roman', serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.02em", bodyTracking: "0.005em", headingScale: "balanced" as const },
  technical: { displayFamily: "'Arial Narrow', Arial, Helvetica, sans-serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 700, bodyWeight: 400, headingTracking: "-0.045em", bodyTracking: ".015em", headingScale: "compact" as const },
  luxury: { displayFamily: "'Times New Roman', Georgia, serif", bodyFamily: "Arial, Helvetica, sans-serif", displayWeight: 400, bodyWeight: 400, headingTracking: "-0.055em", bodyTracking: "0.012em", headingScale: "expressive" as const },
};

const PALETTES = {
  "warm-light": { background: "#f5f0e8", surface: "#fbf8f2", surfaceStrong: "#e9dfd0", text: "#211f1b", textMuted: "#6c655c", accent: "#315f58", accentContrast: "#ffffff", border: "#d9d0c4" },
  "cool-light": { background: "#edf4f2", surface: "#f9fcfb", surfaceStrong: "#cfdeda", text: "#12201e", textMuted: "#5d6e6a", accent: "#146c63", accentContrast: "#ffffff", border: "#c9d8d4" },
  "deep-dark": { background: "#0b1110", surface: "#111a18", surfaceStrong: "#1c2925", text: "#f5f0e7", textMuted: "#aab4af", accent: "#b8d8ca", accentContrast: "#0b1110", border: "#2a3935" },
  neutral: { background: "#f3f3ef", surface: "#ffffff", surfaceStrong: "#dedfd8", text: "#171a18", textMuted: "#656a66", accent: "#2d3934", accentContrast: "#ffffff", border: "#d2d5d0" },
  earthy: { background: "#eee7dc", surface: "#f7f1e8", surfaceStrong: "#d7c8b2", text: "#2b2118", textMuted: "#746456", accent: "#875f3e", accentContrast: "#ffffff", border: "#cdbda8" },
};

export function inferThemeIntent(brief: InterpretedBrief, art: ArtDirection): ThemeIntent {
  const signal = `${art.visualStyle} ${art.typography.personality} ${art.mood.join(" ")} ${brief.positioning.brandTraits.value.join(" ")}`.toLowerCase();
  const typographyMood: ThemeIntent["typographyMood"] = signal.includes("luxury") || signal.includes("heritage") ? "luxury" : signal.includes("editorial") || signal.includes("narrative") ? "editorial" : signal.includes("technical") || signal.includes("precision") || signal.includes("grid") || signal.includes("direct") ? "technical" : signal.includes("warm") || signal.includes("human") || signal.includes("organic") ? "human" : "modern";
  const paletteMood: ThemeIntent["paletteMood"] = art.color.contrastMode === "dark" ? "deep-dark" : signal.includes("organic") || signal.includes("earth") || signal.includes("heritage") ? "earthy" : signal.includes("clinical") || signal.includes("precision") || signal.includes("monochrome") ? "cool-light" : signal.includes("warm") || signal.includes("calm") || signal.includes("luxury") || signal.includes("editorial") ? "warm-light" : "neutral";
  const accentMood: ThemeIntent["accentMood"] = art.color.accentBehavior.toLowerCase().includes("vivid") ? "vivid" : art.color.accentBehavior.toLowerCase().includes("restrain") ? "restrained" : "confident";
  const radiusMood: ThemeIntent["radiusMood"] = art.layout.geometry.toLowerCase().includes("sharp") || signal.includes("grid") || signal.includes("poster") || signal.includes("contrast") ? "sharp" : signal.includes("soft") || signal.includes("warm") || signal.includes("organic") ? "soft" : "subtle";
  const surfaceMood: ThemeIntent["surfaceMood"] = signal.includes("layer") ? "layered" : signal.includes("editorial") || signal.includes("heritage") ? "editorial" : signal.includes("quiet") || signal.includes("luxury") || signal.includes("monochrome") ? "quiet" : "flat";
  return { typographyMood, paletteMood, accentMood, radiusMood, surfaceMood };
}

export function compileThemeTokens(brief: InterpretedBrief, art: ArtDirection): ThemeTokens {
  const intent = inferThemeIntent(brief, art);
  const density = art.layout.density;
  const typography = TYPOGRAPHY[intent.typographyMood];
  const color = PALETTES[intent.paletteMood];
  const radius = intent.radiusMood === "sharp" ? "none" : intent.radiusMood === "soft" ? "soft" : "subtle";
  const sectionY = density === "low" ? 132 : density === "high" ? 64 : 94;
  const contentGap = density === "low" ? 52 : density === "high" ? 20 : 34;
  const maxWidth = art.visualStyle === "statement-first" || art.visualStyle === "bold-contrast" ? 1320 : art.visualStyle === "precision-grid" || art.visualStyle === "direct-modern" ? 1080 : 1180;
  const durationMs = art.motion.intensity === "none" ? 0 : art.motion.intensity === "moderate" ? 420 : 280;

  return {
    version: "1.0",
    typography,
    color,
    spacing: { base: 8, sectionY, contentGap, compactGap: 16, maxWidth },
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
