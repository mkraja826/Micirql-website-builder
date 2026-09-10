export type ThemeTokens = {
  version: "1.0";
  typography: {
    displayFamily: string;
    bodyFamily: string;
    displayWeight: number;
    bodyWeight: number;
    headingTracking: string;
    bodyTracking: string;
    headingScale: "compact" | "balanced" | "expressive";
  };
  color: {
    background: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    textMuted: string;
    accent: string;
    accentContrast: string;
    border: string;
  };
  spacing: {
    base: number;
    sectionY: number;
    contentGap: number;
    compactGap: number;
    maxWidth: number;
  };
  shape: {
    radius: "none" | "subtle" | "soft" | "rounded";
    borderWeight: number;
  };
  surface: {
    treatment: "flat" | "quiet" | "layered" | "editorial";
    shadow: "none" | "subtle";
  };
  density: "low" | "medium" | "high";
  motion: {
    intensity: "none" | "subtle" | "moderate";
    durationMs: number;
    easing: string;
  };
};

export type ThemeIntent = {
  typographyMood: "editorial" | "modern" | "human" | "technical" | "luxury";
  paletteMood: "warm-light" | "cool-light" | "deep-dark" | "neutral" | "earthy";
  accentMood: "restrained" | "confident" | "vivid";
  radiusMood: "sharp" | "subtle" | "soft";
  surfaceMood: "flat" | "quiet" | "layered" | "editorial";
};
