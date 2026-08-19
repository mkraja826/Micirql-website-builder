import { siteSchema, type Site } from "@micirql/schema";
import { evaluatePremiumQualityGate, type PremiumQualityResult } from "@micirql/design-engine";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";

export type PremiumCorrectionResult = {
  site: Site;
  before: PremiumQualityResult;
  after: PremiumQualityResult;
  corrected: boolean;
  corrections: string[];
};

type SiteSection = Site["pages"][number]["sections"][number];
type ThemeFamily = Site["theme"]["family"];
type PaletteRole = "background" | "surface" | "primary" | "secondary" | "accent";

export function applyPremiumCorrectivePass(site: Site): PremiumCorrectionResult {
  const before = evaluatePremiumQualityGate(site);
  if (before.premiumReady) return { site, before, after: before, corrected: false, corrections: [] };

  const next = structuredClone(site);
  const corrections: string[] = [];
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];

  if (home) {
    const content = home.sections.filter((section) => {
      if (section.hidden) return false;
      const family = familyFromId(section.component.componentId);
      return family !== "navbar" && family !== "footer";
    });

    normalizeSurfaceRhythm(content, corrections);
    diversifyRepeatedComponents(content, next.theme.family, corrections);
    reinforceConversionFlow(content, corrections);
  }

  repairTextContrast(next, corrections);

  const parsed = siteSchema.parse(next);
  const after = evaluatePremiumQualityGate(parsed);
  return { site: parsed, before, after, corrected: corrections.length > 0, corrections };
}

function isVisualLocked(section: SiteSection): boolean {
  return section.props?.layoutVisualLocked === true && typeof section.props?.layoutBlueprintId === "string";
}

function normalizeSurfaceRhythm(sections: SiteSection[], corrections: string[]) {
  const rhythm: PaletteRole[] = ["background", "surface", "background", "secondary", "surface", "background"];
  let changed = false;
  sections.forEach((section, index) => {
    if (isVisualLocked(section)) return;
    const family = familyFromId(section.component.componentId);
    const desired: PaletteRole = family === "cta" ? "primary" : rhythm[index % rhythm.length]!;
    if (section.props?.paletteRole !== desired) {
      section.props = {
        ...section.props,
        paletteRole: desired,
        cardPaletteRole: desired === "background" ? "surface" : "background",
        ctaPaletteRole: family === "cta" ? "accent" : "primary",
      };
      changed = true;
    }
  });
  if (changed) corrections.push("normalized premium surface rhythm outside blueprint-locked sections");
}

function diversifyRepeatedComponents(sections: SiteSection[], themeFamily: ThemeFamily, corrections: string[]) {
  const seen = new Map<string, number>();
  let changed = false;
  for (const section of sections) {
    if (isVisualLocked(section)) continue;
    const family = familyFromId(section.component.componentId);
    if (!family || family === "navbar" || family === "footer") continue;
    const key = section.component.componentId;
    const occurrence = seen.get(key) ?? 0;
    seen.set(key, occurrence + 1);
    if (occurrence === 0) continue;
    const current = currentVariant(section.component.componentId);
    const variant = (((current + occurrence - 1) % 5) + 1) as SectionVariant;
    section.component = { ...section.component, componentId: sectionDesignId(themeFamily, family, variant) };
    changed = true;
  }
  if (changed) corrections.push("diversified repeated section layouts outside blueprint locks");
}

function reinforceConversionFlow(sections: SiteSection[], corrections: string[]) {
  if (!sections.length) return;
  let changed = false;
  const hero = sections.find((section) => familyFromId(section.component.componentId) === "hero");
  if (hero && !hasAction(hero.props?.primaryAction)) {
    hero.props = { ...hero.props, primaryAction: { label: "Get started", href: "/contact" } };
    changed = true;
  }

  const latterThirdStart = Math.max(0, Math.floor(sections.length * 0.66));
  const latterThird = sections.slice(latterThirdStart);
  const conversion = latterThird.find((section) => {
    const family = familyFromId(section.component.componentId);
    return family === "cta" || family === "contact";
  });
  if (conversion && !hasAction(conversion.props?.primaryAction)) {
    conversion.props = { ...conversion.props, primaryAction: { label: "Contact us", href: "/contact" } };
    changed = true;
  }
  if (changed) corrections.push("reinforced premium conversion flow");
}

function repairTextContrast(site: Site, corrections: string[]) {
  const colors = site.theme.brand.colors;
  const backgroundIsDark = luminance(colors.background) < 0.35;
  const primary = backgroundIsDark ? "#F8FAFC" : "#0F172A";
  const secondary = backgroundIsDark ? "#CBD5E1" : "#475569";
  const currentPrimary = contrastRatio(colors.textPrimary, colors.background);
  const currentSecondary = contrastRatio(colors.textSecondary, colors.background);
  let changed = false;
  if (currentPrimary !== undefined && currentPrimary < 4.5) {
    colors.textPrimary = primary;
    changed = true;
  }
  if (currentSecondary !== undefined && currentSecondary < 3) {
    colors.textSecondary = secondary;
    changed = true;
  }
  if (changed) corrections.push("repaired premium text contrast");
}

function hasAction(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const action = value as Record<string, unknown>;
  return typeof action.label === "string" && action.label.trim().length > 0 && typeof action.href === "string" && action.href.trim().length > 0;
}

function familyFromId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function currentVariant(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? (value as SectionVariant) : 1;
}

function contrastRatio(foreground: string, background: string): number | undefined {
  const fg = luminance(foreground);
  const bg = luminance(background);
  if (!Number.isFinite(fg) || !Number.isFinite(bg)) return undefined;
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function luminance(color: string): number {
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return Number.NaN;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}