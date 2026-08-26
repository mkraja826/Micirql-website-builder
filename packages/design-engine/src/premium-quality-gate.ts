import type { Site } from "@micirql/schema";

export type PremiumQualitySeverity = "blocker" | "warning";

export type PremiumQualityIssue = {
  code: string;
  severity: PremiumQualitySeverity;
  message: string;
  penalty: number;
  pageId?: string;
  sectionId?: string;
};

export type PremiumQualityResult = {
  premiumReady: boolean;
  score: number;
  blockers: PremiumQualityIssue[];
  warnings: PremiumQualityIssue[];
  metrics: {
    homeVisibleSections: number;
    homeContentSections: number;
    primaryCtaCount: number;
    longestSurfaceStreak: number;
    repeatedComponentCount: number;
    textContrastRatio?: number;
  };
};

const SHELL_FAMILIES = new Set(["navbar", "footer"]);
const CONVERSION_FAMILIES = new Set(["cta", "contact", "lead-capture", "form"]);

export function evaluatePremiumQualityGate(site: Site): PremiumQualityResult {
  const issues: PremiumQualityIssue[] = [];
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) {
    issues.push(blocker("PREMIUM_NO_HOME", "Premium quality cannot be evaluated without a page.", 100));
    return finish(issues, { homeVisibleSections: 0, homeContentSections: 0, primaryCtaCount: 0, longestSurfaceStreak: 0, repeatedComponentCount: 0 });
  }

  const visible = home.sections.filter((section) => !section.hidden);
  const content = visible.filter((section) => !SHELL_FAMILIES.has(familyFromComponentId(section.component.componentId) ?? ""));
  const homeFamilies = visible.map((section) => familyFromComponentId(section.component.componentId));

  if (content.length < 5) issues.push(blocker("PREMIUM_TOO_SPARSE", "Home page has too few content sections to feel complete and premium.", 20, home.id));
  else if (content.length < 6) issues.push(warning("PREMIUM_LIGHT_COMPOSITION", "Home page composition is slightly light; premium sites usually need stronger narrative depth.", 6, home.id));
  if (content.length > 10) issues.push(warning("PREMIUM_OVERLOADED", "Home page has too many competing content sections and may feel template-heavy.", 8, home.id));

  const firstContentFamily = content.length ? familyFromComponentId(content[0]!.component.componentId) : undefined;
  if (firstContentFamily !== "hero") issues.push(blocker("PREMIUM_WEAK_OPENING", "The first content section should be the hero to establish immediate visual hierarchy.", 15, home.id, content[0]?.id));

  const primaryCtaCount = site.pages.flatMap((page) => page.sections).filter((section) => !section.hidden && hasAction(section.props?.primaryAction)).length;
  if (primaryCtaCount < 2) issues.push(warning("PREMIUM_WEAK_CTA_COVERAGE", "Premium conversion flow should repeat the primary action at least once beyond the opening section.", 6));
  if (primaryCtaCount > 7) issues.push(warning("PREMIUM_CTA_OVERUSE", "Too many primary CTAs can make the site feel aggressive and visually repetitive.", 5));

  const latterThirdStart = Math.max(0, Math.floor(content.length * 0.66));
  const hasLateConversion = content.slice(latterThirdStart).some((section) => CONVERSION_FAMILIES.has(familyFromComponentId(section.component.componentId) ?? ""));
  if (!hasLateConversion) issues.push(warning("PREMIUM_NO_LATE_CONVERSION", "The lower third of the home page should contain a clear conversion or contact section.", 7, home.id));

  const surfaceRoles = content.map((section) => normalizeSurfaceRole(section.props?.paletteRole));
  const longestSurfaceStreak = longestStreak(surfaceRoles.filter((role): role is string => Boolean(role)));
  if (surfaceRoles.length >= 4 && longestSurfaceStreak >= 4) issues.push(blocker("PREMIUM_SURFACE_MONOTONY", "Four or more consecutive sections use the same surface treatment.", 16, home.id));
  else if (surfaceRoles.length >= 4 && longestSurfaceStreak === 3) issues.push(warning("PREMIUM_SURFACE_STREAK", "Three consecutive sections use the same surface treatment; vary the section rhythm.", 7, home.id));

  const componentIds = content.map((section) => section.component.componentId);
  const counts = new Map<string, number>();
  for (const id of componentIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const repeatedComponentCount = [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + count - 1, 0);
  if (repeatedComponentCount >= 3) issues.push(warning("PREMIUM_REPEATED_LAYOUTS", "Too many identical section component variants are reused on the home page.", 8, home.id));

  const consecutiveFamilyRepeat = homeFamilies.some((family, index) => Boolean(family) && family === homeFamilies[index - 1] && !SHELL_FAMILIES.has(family!));
  if (consecutiveFamilyRepeat) issues.push(warning("PREMIUM_REPEATED_SECTION_FAMILY", "Avoid consecutive sections from the same family; it weakens visual pacing.", 5, home.id));

  const colors = site.theme.brand.colors;
  const textContrastRatio = contrastRatio(colors.textPrimary, colors.background);
  if (textContrastRatio !== undefined && textContrastRatio < 4.5) issues.push(blocker("PREMIUM_TEXT_CONTRAST", `Primary text contrast is ${textContrastRatio.toFixed(2)}:1; target at least 4.5:1.`, 18));

  const mutedContrast = contrastRatio(colors.textSecondary, colors.background);
  if (mutedContrast !== undefined && mutedContrast < 3) issues.push(warning("PREMIUM_MUTED_CONTRAST", "Secondary text contrast is too weak for a polished, accessible result.", 6));

  const distinctBrandColors = new Set([colors.primary, colors.secondary, colors.accent, colors.background, colors.surface].map((value) => value.toLowerCase())).size;
  if (distinctBrandColors < 4) issues.push(warning("PREMIUM_FLAT_PALETTE", "Brand palette lacks enough tonal separation for premium visual hierarchy.", 7));

  return finish(issues, {
    homeVisibleSections: visible.length,
    homeContentSections: content.length,
    primaryCtaCount,
    longestSurfaceStreak,
    repeatedComponentCount,
    ...(textContrastRatio !== undefined ? { textContrastRatio } : {}),
  });
}

function finish(issues: PremiumQualityIssue[], metrics: PremiumQualityResult["metrics"]): PremiumQualityResult {
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.penalty, 0));
  return { premiumReady: blockers.length === 0 && score >= 85, score, blockers, warnings, metrics };
}

function blocker(code: string, message: string, penalty: number, pageId?: string, sectionId?: string): PremiumQualityIssue {
  return { code, severity: "blocker", message, penalty, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}

function warning(code: string, message: string, penalty: number, pageId?: string, sectionId?: string): PremiumQualityIssue {
  return { code, severity: "warning", message, penalty, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}

function hasAction(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  return typeof action.label === "string" && action.label.trim().length > 0 && typeof action.href === "string" && action.href.trim().length > 0;
}

function normalizeSurfaceRole(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : undefined;
}

function longestStreak(values: string[]): number {
  let longest = 0;
  let current = 0;
  let previous: string | undefined;
  for (const value of values) {
    current = value === previous ? current + 1 : 1;
    previous = value;
    longest = Math.max(longest, current);
  }
  return longest;
}

function familyFromComponentId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "portfolio", "team", "pricing", "cta", "contact", "lead-capture", "form", "faq", "stats", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = {
    nav: "navbar",
    hero: "hero",
    about: "about",
    serv: "services",
    services: "services",
    feat: "features",
    features: "features",
    proc: "process",
    process: "process",
    test: "testimonials",
    testimonials: "testimonials",
    gall: "gallery",
    gallery: "gallery",
    team: "team",
    pricing: "pricing",
    cta: "cta",
    cont: "contact",
    contact: "contact",
    foot: "footer",
    footer: "footer",
  };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function contrastRatio(foreground: string, background: string): number | undefined {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === undefined || bg === undefined) return undefined;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(color: string): number | undefined {
  const rgb = parseHex(color);
  if (!rgb) return undefined;
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function parseHex(value: string): [number, number, number] | undefined {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return undefined;
  return [Number.parseInt(normalized.slice(0, 2), 16), Number.parseInt(normalized.slice(2, 4), 16), Number.parseInt(normalized.slice(4, 6), 16)];
}
