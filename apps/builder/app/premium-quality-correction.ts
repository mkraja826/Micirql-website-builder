import { evaluatePremiumQualityGate, type PremiumQualityResult } from "@micirql/design-engine";
import { siteSchema, type Site } from "@micirql/schema";
import { repairContentDepth } from "./content-depth-repair";

export type PremiumCorrectionResult = {
  site: Site;
  initial: PremiumQualityResult;
  final: PremiumQualityResult;
  attempted: boolean;
  applied: boolean;
};

const SHELL = new Set(["navbar", "footer"]);
const CONVERSION = new Set(["cta", "contact", "lead-capture", "form"]);

export function applyPremiumQualityCorrection(site: Site): PremiumCorrectionResult {
  const depthRepaired = repairContentDepth(site);
  const initial = evaluatePremiumQualityGate(depthRepaired);
  if (initial.premiumReady) return { site: depthRepaired, initial, final: initial, attempted: JSON.stringify(depthRepaired) !== JSON.stringify(site), applied: JSON.stringify(depthRepaired) !== JSON.stringify(site) };

  const candidate = structuredClone(depthRepaired);
  repairContrast(candidate);
  repairHomeRhythm(candidate);
  diversifyRepeatedVariants(candidate);
  repairLateConversion(candidate);

  const validated = repairContentDepth(siteSchema.parse(candidate));
  const final = evaluatePremiumQualityGate(validated);
  const contentChanged = JSON.stringify(depthRepaired) !== JSON.stringify(site);
  const improved = final.score > initial.score || (final.blockers.length < initial.blockers.length && final.score >= initial.score);
  return {
    site: improved ? validated : depthRepaired,
    initial,
    final: improved ? final : initial,
    attempted: true,
    applied: improved || contentChanged,
  };
}

function repairContrast(site: Site) {
  const colors = site.theme.brand.colors;
  const backgroundIsDark = luminance(colors.background) < 0.32;
  colors.textPrimary = backgroundIsDark ? "#F8FAFC" : "#0F172A";
  colors.textSecondary = backgroundIsDark ? "#CBD5E1" : "#475569";
}

function repairHomeRhythm(site: Site) {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return;
  let contentIndex = 0;
  for (const section of home.sections) {
    if (section.hidden) continue;
    const family = familyFromId(section.component.componentId);
    if (!family || SHELL.has(family)) continue;
    if (family === "cta") section.props = { ...section.props, paletteRole: "primary" };
    else if (family === "contact") section.props = { ...section.props, paletteRole: "surface" };
    else section.props = { ...section.props, paletteRole: contentIndex++ % 2 === 0 ? "background" : "surface" };
  }
}

function diversifyRepeatedVariants(site: Site) {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return;
  const seen = new Map<string, number>();
  for (const section of home.sections) {
    if (section.hidden) continue;
    const id = section.component.componentId;
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count === 0) continue;
    const match = id.match(/^(.*-)(00[1-5])$/);
    if (!match) continue;
    const current = Number(match[2]);
    const next = ((current + count - 1) % 5) + 1;
    section.component = { ...section.component, componentId: `${match[1]}${String(next).padStart(3, "0")}` };
  }
}

function repairLateConversion(site: Site) {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) return;
  const visibleContent = home.sections.filter((section) => !section.hidden && !SHELL.has(familyFromId(section.component.componentId) ?? ""));
  if (visibleContent.slice(Math.floor(visibleContent.length * 0.66)).some((section) => CONVERSION.has(familyFromId(section.component.componentId) ?? ""))) return;

  const footerIndex = home.sections.findIndex((section) => familyFromId(section.component.componentId) === "footer");
  const conversionIndex = home.sections.findIndex((section) => CONVERSION.has(familyFromId(section.component.componentId) ?? ""));
  if (conversionIndex < 0) return;
  const [conversion] = home.sections.splice(conversionIndex, 1);
  if (!conversion) return;
  const insertion = footerIndex < 0 ? home.sections.length : Math.max(0, home.sections.findIndex((section) => familyFromId(section.component.componentId) === "footer"));
  home.sections.splice(insertion, 0, conversion);
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function luminance(value: string): number {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 1;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}
