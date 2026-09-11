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

type Palette = (typeof PALETTES)[keyof typeof PALETTES];

const ART_DIRECTION_PALETTES: Record<string, Palette> = {
  editorial: { background: "#f4efe6", surface: "#fffaf2", surfaceStrong: "#ded0bf", text: "#1e2726", textMuted: "#69706c", accent: "#0f5b55", accentContrast: "#ffffff", border: "#d6cabc" },
  cinematic: { background: "#121416", surface: "#1a1e21", surfaceStrong: "#2a3035", text: "#f5f0e8", textMuted: "#b0b2b2", accent: "#d6a85f", accentContrast: "#17120b", border: "#343a3e" },
  "quiet-luxury": { background: "#f2eee8", surface: "#faf7f2", surfaceStrong: "#ddd2c8", text: "#241c20", textMuted: "#746971", accent: "#6c3145", accentContrast: "#ffffff", border: "#d8ccc5" },
  "warm-modern": { background: "#f6ede7", surface: "#fff8f3", surfaceStrong: "#e8cdbd", text: "#2f241f", textMuted: "#77685f", accent: "#9a4f36", accentContrast: "#ffffff", border: "#dfc7bb" },
  "typography-led": { background: "#f6f7f8", surface: "#ffffff", surfaceStrong: "#dfe4ea", text: "#111318", textMuted: "#606775", accent: "#2455a6", accentContrast: "#ffffff", border: "#d4d9e0" },
  "conversion-focused": { background: "#eef5f7", surface: "#ffffff", surfaceStrong: "#c9dde4", text: "#10212a", textMuted: "#5b6d76", accent: "#0a6b78", accentContrast: "#ffffff", border: "#c7d8dd" },
  "gallery-led": { background: "#f7efee", surface: "#fff9f8", surfaceStrong: "#e4c9c8", text: "#2a1b20", textMuted: "#746168", accent: "#8b3f55", accentContrast: "#ffffff", border: "#ddc7c8" },
  "immersive-dark": { background: "#08131b", surface: "#10202b", surfaceStrong: "#1c3441", text: "#eef7f5", textMuted: "#9fb3b8", accent: "#7fd1c5", accentContrast: "#071310", border: "#24404d" },
  "framed-minimal": { background: "#f8f7f3", surface: "#ffffff", surfaceStrong: "#e6e3db", text: "#181816", textMuted: "#676661", accent: "#31312d", accentContrast: "#ffffff", border: "#d9d6ce" },
  "soft-editorial": { background: "#f6f0f1", surface: "#fff9fa", surfaceStrong: "#ead9de", text: "#2b2025", textMuted: "#76666d", accent: "#7e4960", accentContrast: "#ffffff", border: "#dfd0d5" },
  "clinical-refined": { background: "#eef6f8", surface: "#fbfeff", surfaceStrong: "#cfe2e8", text: "#11242c", textMuted: "#60727a", accent: "#176c86", accentContrast: "#ffffff", border: "#c8dce2" },
  "human-narrative": { background: "#f6f1e9", surface: "#fffaf3", surfaceStrong: "#e5d6c8", text: "#30231f", textMuted: "#77665e", accent: "#a0543c", accentContrast: "#ffffff", border: "#ddcfc3" },
  "modern-heritage": { background: "#f3ece2", surface: "#fbf6ef", surfaceStrong: "#ddcbb6", text: "#2b201b", textMuted: "#746259", accent: "#7a3d37", accentContrast: "#ffffff", border: "#d5c4b1" },
  "bold-contrast": { background: "#f4f1ea", surface: "#ffffff", surfaceStrong: "#ded6c7", text: "#121212", textMuted: "#5e5a52", accent: "#b5442d", accentContrast: "#ffffff", border: "#d4cec2" },
  "calm-monochrome": { background: "#eef0ef", surface: "#fafbfa", surfaceStrong: "#d5d9d7", text: "#1f2523", textMuted: "#656d69", accent: "#4b625b", accentContrast: "#ffffff", border: "#ccd1ce" },
  "precision-grid": { background: "#edf3f8", surface: "#fafdff", surfaceStrong: "#cbdbe8", text: "#102231", textMuted: "#5d7080", accent: "#195b96", accentContrast: "#ffffff", border: "#c7d5e0" },
  "organic-premium": { background: "#eef1e7", surface: "#fafcf6", surfaceStrong: "#d4dcc5", text: "#243022", textMuted: "#687361", accent: "#496b43", accentContrast: "#ffffff", border: "#cbd3bf" },
  "statement-first": { background: "#f7f3eb", surface: "#fffdf8", surfaceStrong: "#e7d9ca", text: "#171515", textMuted: "#685f5a", accent: "#9f3e32", accentContrast: "#ffffff", border: "#dcd2c7" },
  "layered-depth": { background: "#eef0f5", surface: "#f9faff", surfaceStrong: "#d5d9e5", text: "#1c2330", textMuted: "#667082", accent: "#52627f", accentContrast: "#ffffff", border: "#cfd4df" },
  "direct-modern": { background: "#f0f3f5", surface: "#ffffff", surfaceStrong: "#d5dde3", text: "#172028", textMuted: "#616e78", accent: "#2d5f82", accentContrast: "#ffffff", border: "#cfd7dd" },
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
  const color = ART_DIRECTION_PALETTES[art.visualStyle] ?? PALETTES[intent.paletteMood];
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
