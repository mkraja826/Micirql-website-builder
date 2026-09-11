import type { ArtDirection } from "../art-direction/schema";
import type { ThemeTokens } from "./schema";

export type SectionTone = "base" | "surface" | "strong" | "accent";
export type ChoreographedSectionType = "navbar" | "hero" | "services" | "about" | "cta" | "process" | "contact" | "footer";

type Choreography = Partial<Record<ChoreographedSectionType, SectionTone>>;

const CHOREOGRAPHIES: Record<string, Choreography> = {
  editorial: { hero: "base", services: "surface", about: "base", cta: "strong", process: "accent", contact: "surface" },
  cinematic: { hero: "base", services: "surface", about: "strong", cta: "accent", process: "strong", contact: "surface" },
  "quiet-luxury": { hero: "base", services: "surface", about: "base", cta: "strong", process: "surface", contact: "base" },
  "warm-modern": { hero: "base", services: "strong", about: "surface", cta: "accent", process: "surface", contact: "base" },
  "typography-led": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "base", contact: "surface" },
  "conversion-focused": { hero: "base", services: "surface", about: "base", cta: "accent", process: "strong", contact: "surface" },
  "gallery-led": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "surface", contact: "base" },
  "immersive-dark": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "surface", contact: "strong" },
  "framed-minimal": { hero: "base", services: "surface", about: "base", cta: "strong", process: "surface", contact: "base" },
  "soft-editorial": { hero: "base", services: "surface", about: "strong", cta: "surface", process: "accent", contact: "base" },
  "clinical-refined": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "surface", contact: "base" },
  "human-narrative": { hero: "base", services: "surface", about: "base", cta: "accent", process: "strong", contact: "surface" },
  "modern-heritage": { hero: "base", services: "strong", about: "surface", cta: "accent", process: "base", contact: "surface" },
  "bold-contrast": { hero: "base", services: "strong", about: "base", cta: "accent", process: "strong", contact: "surface" },
  "calm-monochrome": { hero: "base", services: "surface", about: "base", cta: "strong", process: "surface", contact: "base" },
  "precision-grid": { hero: "base", services: "strong", about: "surface", cta: "accent", process: "strong", contact: "base" },
  "organic-premium": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "surface", contact: "base" },
  "statement-first": { hero: "base", services: "surface", about: "base", cta: "accent", process: "strong", contact: "surface" },
  "layered-depth": { hero: "base", services: "strong", about: "surface", cta: "accent", process: "base", contact: "strong" },
  "direct-modern": { hero: "base", services: "surface", about: "strong", cta: "accent", process: "surface", contact: "base" },
};

function toneVariables(tokens: ThemeTokens, tone: SectionTone) {
  const c = tokens.color;

  if (tone === "accent") {
    return {
      background: c.accent,
      color: c.accentContrast,
      "--theme-bg": c.accent,
      "--theme-surface": c.accentContrast,
      "--theme-surface-strong": c.accentContrast,
      "--theme-text": c.accentContrast,
      "--theme-text-muted": c.accentContrast,
      "--theme-accent": c.accentContrast,
      "--theme-accent-contrast": c.accent,
      "--theme-border": c.accentContrast,
    };
  }

  if (tone === "strong") {
    return {
      background: c.surfaceStrong,
      color: c.text,
      "--theme-bg": c.surfaceStrong,
      "--theme-surface": c.surface,
      "--theme-surface-strong": c.background,
      "--theme-text": c.text,
      "--theme-text-muted": c.textMuted,
      "--theme-accent": c.accent,
      "--theme-accent-contrast": c.accentContrast,
      "--theme-border": c.border,
    };
  }

  if (tone === "surface") {
    return {
      background: c.surface,
      color: c.text,
      "--theme-bg": c.surface,
      "--theme-surface": c.background,
      "--theme-surface-strong": c.surfaceStrong,
      "--theme-text": c.text,
      "--theme-text-muted": c.textMuted,
      "--theme-accent": c.accent,
      "--theme-accent-contrast": c.accentContrast,
      "--theme-border": c.border,
    };
  }

  return {
    background: c.background,
    color: c.text,
    "--theme-bg": c.background,
    "--theme-surface": c.surface,
    "--theme-surface-strong": c.surfaceStrong,
    "--theme-text": c.text,
    "--theme-text-muted": c.textMuted,
    "--theme-accent": c.accent,
    "--theme-accent-contrast": c.accentContrast,
    "--theme-border": c.border,
  };
}

export function getSectionTone(direction: ArtDirection, sectionType: ChoreographedSectionType): SectionTone {
  return CHOREOGRAPHIES[direction.visualStyle]?.[sectionType] ?? "base";
}

export function getSectionColorStyle(tokens: ThemeTokens, direction: ArtDirection, sectionType: ChoreographedSectionType): Record<string, string> {
  return toneVariables(tokens, getSectionTone(direction, sectionType));
}
