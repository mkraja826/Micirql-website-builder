import type { Site } from "@micirql/schema";

export type VisualCoherenceIssueCode =
  | "BRAND_COLOR_INVALID"
  | "TEXT_PRIMARY_BACKGROUND_LOW_CONTRAST"
  | "TEXT_PRIMARY_SURFACE_LOW_CONTRAST"
  | "TEXT_SECONDARY_BACKGROUND_LOW_CONTRAST"
  | "TEXT_SECONDARY_SURFACE_LOW_CONTRAST"
  | "ACCENT_BACKGROUND_INDISTINCT"
  | "ACCENT_SURFACE_INDISTINCT"
  | "ADJACENT_COMPONENT_REPEAT"
  | "PAGE_COMPONENT_MONOTONY";

export type VisualCoherenceIssue = {
  code: VisualCoherenceIssueCode;
  severity: "error" | "warning";
  penalty: number;
  message: string;
  pageId?: string;
  sectionId?: string;
};

export type VisualCoherenceResult = {
  score: number;
  ready: boolean;
  threshold: number;
  issues: VisualCoherenceIssue[];
  metrics: {
    textPrimaryBackgroundContrast: number | null;
    textPrimarySurfaceContrast: number | null;
    textSecondaryBackgroundContrast: number | null;
    textSecondarySurfaceContrast: number | null;
    accentBackgroundContrast: number | null;
    accentSurfaceContrast: number | null;
    repeatedAdjacentComponents: number;
    pagesWithMonotony: number;
  };
};

const READY_THRESHOLD = 88;
const BODY_TEXT_CONTRAST = 4.5;
const ACCENT_DISTINCTION = 1.5;

export function evaluateVisualCoherence(site: Site): VisualCoherenceResult {
  const issues: VisualCoherenceIssue[] = [];
  const colors = site.theme.brand.colors;
  const parsed = new Map<string, Rgb | null>();

  for (const [name, value] of Object.entries(colors)) {
    const rgb = parseColor(value);
    parsed.set(name, rgb);
    if (!rgb) {
      issues.push({
        code: "BRAND_COLOR_INVALID",
        severity: "error",
        penalty: 30,
        message: `Brand color ${name} must be a supported hex or rgb() value for visual QA.`,
      });
    }
  }

  const metric = (foreground: string, background: string) => {
    const fg = parsed.get(foreground) ?? null;
    const bg = parsed.get(background) ?? null;
    return fg && bg ? contrastRatio(fg, bg) : null;
  };

  const textPrimaryBackgroundContrast = metric("textPrimary", "background");
  const textPrimarySurfaceContrast = metric("textPrimary", "surface");
  const textSecondaryBackgroundContrast = metric("textSecondary", "background");
  const textSecondarySurfaceContrast = metric("textSecondary", "surface");
  const accentBackgroundContrast = metric("accent", "background");
  const accentSurfaceContrast = metric("accent", "surface");

  enforceContrast(issues, textPrimaryBackgroundContrast, BODY_TEXT_CONTRAST, "TEXT_PRIMARY_BACKGROUND_LOW_CONTRAST", "Primary text does not have enough contrast against the page background.");
  enforceContrast(issues, textPrimarySurfaceContrast, BODY_TEXT_CONTRAST, "TEXT_PRIMARY_SURFACE_LOW_CONTRAST", "Primary text does not have enough contrast against surface cards/panels.");
  enforceContrast(issues, textSecondaryBackgroundContrast, BODY_TEXT_CONTRAST, "TEXT_SECONDARY_BACKGROUND_LOW_CONTRAST", "Secondary text does not have enough contrast against the page background.");
  enforceContrast(issues, textSecondarySurfaceContrast, BODY_TEXT_CONTRAST, "TEXT_SECONDARY_SURFACE_LOW_CONTRAST", "Secondary text does not have enough contrast against surface cards/panels.");

  enforceAccentDistinction(issues, accentBackgroundContrast, "ACCENT_BACKGROUND_INDISTINCT", "Accent color is too close to the page background to create a deliberate hierarchy.");
  enforceAccentDistinction(issues, accentSurfaceContrast, "ACCENT_SURFACE_INDISTINCT", "Accent color is too close to the surface color to create a deliberate hierarchy.");

  let repeatedAdjacentComponents = 0;
  let pagesWithMonotony = 0;

  for (const page of site.pages) {
    const visible = page.sections.filter((section) => !section.hidden);
    for (let index = 1; index < visible.length; index += 1) {
      const current = visible[index];
      const previous = visible[index - 1];
      if (!current || !previous) continue;
      if (current.component.componentId === previous.component.componentId) {
        repeatedAdjacentComponents += 1;
        issues.push({
          code: "ADJACENT_COMPONENT_REPEAT",
          severity: "warning",
          penalty: 7,
          message: "Two adjacent sections use the exact same component variant, creating visible repetition.",
          pageId: page.id,
          sectionId: current.id,
        });
      }
    }

    const contentSections = visible.filter((section) => !isGlobalShell(section.component.componentId));
    if (contentSections.length >= 5) {
      const uniqueVariants = new Set(contentSections.map((section) => section.component.componentId)).size;
      if (uniqueVariants / contentSections.length < 0.6) {
        pagesWithMonotony += 1;
        issues.push({
          code: "PAGE_COMPONENT_MONOTONY",
          severity: "warning",
          penalty: 10,
          message: "This page reuses too few distinct component variants for its length.",
          pageId: page.id,
        });
      }
    }
  }

  const score = clamp(100 - issues.reduce((sum, issue) => sum + issue.penalty, 0), 0, 100);
  return {
    score,
    ready: !issues.some((issue) => issue.severity === "error") && score >= READY_THRESHOLD,
    threshold: READY_THRESHOLD,
    issues,
    metrics: {
      textPrimaryBackgroundContrast,
      textPrimarySurfaceContrast,
      textSecondaryBackgroundContrast,
      textSecondarySurfaceContrast,
      accentBackgroundContrast,
      accentSurfaceContrast,
      repeatedAdjacentComponents,
      pagesWithMonotony,
    },
  };
}

function enforceContrast(
  issues: VisualCoherenceIssue[],
  ratio: number | null,
  minimum: number,
  code: Extract<VisualCoherenceIssueCode,
    | "TEXT_PRIMARY_BACKGROUND_LOW_CONTRAST"
    | "TEXT_PRIMARY_SURFACE_LOW_CONTRAST"
    | "TEXT_SECONDARY_BACKGROUND_LOW_CONTRAST"
    | "TEXT_SECONDARY_SURFACE_LOW_CONTRAST">,
  message: string,
) {
  if (ratio !== null && ratio < minimum) {
    issues.push({ code, severity: "error", penalty: 24, message });
  }
}

function enforceAccentDistinction(
  issues: VisualCoherenceIssue[],
  ratio: number | null,
  code: Extract<VisualCoherenceIssueCode, "ACCENT_BACKGROUND_INDISTINCT" | "ACCENT_SURFACE_INDISTINCT">,
  message: string,
) {
  if (ratio !== null && ratio < ACCENT_DISTINCTION) {
    issues.push({ code, severity: "warning", penalty: 6, message });
  }
}

type Rgb = { r: number; g: number; b: number };

function parseColor(value: string): Rgb | null {
  const normalized = value.trim().toLowerCase();
  const hex3 = normalized.match(/^#([0-9a-f]{3})$/i);
  const short = hex3?.[1];
  if (short && short.length === 3) {
    const r = Number.parseInt(`${short[0]}${short[0]}`, 16);
    const g = Number.parseInt(`${short[1]}${short[1]}`, 16);
    const b = Number.parseInt(`${short[2]}${short[2]}`, 16);
    return { r, g, b };
  }

  const hex6 = normalized.match(/^#([0-9a-f]{6})$/i);
  const full = hex6?.[1];
  if (full && full.length === 6) {
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
    };
  }

  const rgb = normalized.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgb) return null;
  const r = Number(rgb[1]);
  const g = Number(rgb[2]);
  const b = Number(rgb[3]);
  if (![r, g, b].every(Number.isFinite)) return null;
  if ([r, g, b].some((channel) => channel < 0 || channel > 255)) return null;
  return { r, g, b };
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const linearize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function isGlobalShell(componentId: string): boolean {
  const normalized = componentId.toUpperCase();
  return normalized.includes("-NAV-") || normalized.includes("-FOOT-") || normalized.startsWith("NAV.") || normalized.startsWith("FOOT.");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
