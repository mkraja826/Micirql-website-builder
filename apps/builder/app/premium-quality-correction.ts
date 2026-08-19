import { evaluatePremiumQualityGate, type PremiumQualityResult } from "@micirql/design-engine";
import { siteSchema, type Site } from "@micirql/schema";
import { applyLockedBlueprintPalette } from "./blueprint-palette-lock";
import { repairContentDepth } from "./content-depth-repair";
import { evaluateFirstBuildQuality, type FirstBuildQualityResult } from "./first-build-quality";

export type PremiumCorrectionResult = {
  site: Site;
  initial: PremiumQualityResult;
  final: PremiumQualityResult;
  firstBuild: FirstBuildQualityResult;
  attempted: boolean;
  applied: boolean;
};

const SHELL = new Set(["navbar", "footer"]);
const CONVERSION = new Set(["cta", "contact", "lead-capture", "form"]);

type SiteSection = Site["pages"][number]["sections"][number];

export function applyPremiumQualityCorrection(site: Site): PremiumCorrectionResult {
  // The certified blueprint gets the final say on palette family. This runs
  // after generic AI/brand color advice, so later passes cannot collapse
  // distinct layouts back into one color system.
  const paletteLocked = applyLockedBlueprintPalette(site);
  const depthRepaired = repairContentDepth(paletteLocked);
  const initial = evaluatePremiumQualityGate(depthRepaired);
  const initialFirstBuild = evaluateFirstBuildQuality(depthRepaired);
  const contentChanged = JSON.stringify(depthRepaired) !== JSON.stringify(site);

  if (initial.premiumReady && initialFirstBuild.ready) {
    return {
      site: depthRepaired,
      initial,
      final: initial,
      firstBuild: initialFirstBuild,
      attempted: contentChanged,
      applied: contentChanged,
    };
  }

  const candidate = structuredClone(depthRepaired);
  repairContrast(candidate);
  repairHomeRhythm(candidate);
  diversifyRepeatedVariants(candidate);
  repairLateConversion(candidate);

  // Reassert the lock after any generic repair. Contrast/content can be fixed,
  // but the blueprint-owned palette family cannot be replaced.
  const validated = repairContentDepth(applyLockedBlueprintPalette(siteSchema.parse(candidate)));
  const final = evaluatePremiumQualityGate(validated);
  const finalFirstBuild = evaluateFirstBuildQuality(validated);
  const useCandidate = qualityRank(final, finalFirstBuild) > qualityRank(initial, initialFirstBuild);

  return {
    site: useCandidate ? validated : depthRepaired,
    initial,
    final: useCandidate ? final : initial,
    firstBuild: useCandidate ? finalFirstBuild : initialFirstBuild,
    attempted: true,
    applied: useCandidate || contentChanged,
  };
}

function qualityRank(premium: PremiumQualityResult, firstBuild: FirstBuildQualityResult): number {
  const readinessBonus = (premium.premiumReady ? 20 : 0) + (firstBuild.ready ? 20 : 0);
  const blockerPenalty = premium.blockers.length * 15 + firstBuild.issues.filter((issue) => issue.severity === "blocker").length * 15;
  return premium.score + firstBuild.score + readinessBonus - blockerPenalty;
}

function isVisualLocked(section: SiteSection): boolean {
  return section.props?.layoutVisualLock === true && typeof section.props?.layoutBlueprintId === "string";
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
    if (isVisualLocked(section)) continue;
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
    if (section.hidden || isVisualLocked(section)) continue;
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
  if (visibleContent.some(isVisualLocked)) return;
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
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", services: "services", feat: "features", features: "features", proc: "process", process: "process", test: "testimonials", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", contact: "contact", foot: "footer", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function luminance(value: string): number {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 1;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255).map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}