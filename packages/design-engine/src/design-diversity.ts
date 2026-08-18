import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";

export type DesignFingerprint = {
  system: string;
  structure: string;
  palette: string;
  typography: string;
  density: string;
  shape: string;
  modifiers: string;
};

export type DesignScoreInput = {
  site: Site;
  readinessScore: number;
  contentScore: number;
  archetypeFitScore?: number;
};

export type DesignScore = {
  total: number;
  readiness: number;
  content: number;
  archetypeFit: number;
  structuralVariety: number;
  visualVariety: number;
  fingerprint: DesignFingerprint;
};

export function scoreDesign(input: DesignScoreInput): DesignScore {
  const fingerprint = fingerprintDesign(input.site);
  const families = input.site.pages.flatMap((page) => page.sections.filter((section) => !section.hidden).map((section) => familyAndVariant(section.component.componentId)).filter(Boolean));
  const uniqueVariants = new Set(families).size;
  const structuralVariety = clamp(Math.round((uniqueVariants / Math.max(1, families.length)) * 100));
  const visualVariety = scoreVisualIdentity(input.site);
  const readiness = clamp(input.readinessScore);
  const content = clamp(input.contentScore);
  const archetypeFit = clamp(input.archetypeFitScore ?? 90);

  const total = Math.round(
    readiness * 0.3 +
    content * 0.2 +
    archetypeFit * 0.2 +
    structuralVariety * 0.15 +
    visualVariety * 0.15,
  );

  return { total, readiness, content, archetypeFit, structuralVariety, visualVariety, fingerprint };
}

export function selectDiverseDesigns<T extends { designScore: DesignScore }>(candidates: T[], limit: number): T[] {
  const ranked = [...candidates].sort((a, b) => b.designScore.total - a.designScore.total);
  const selected: T[] = [];
  const usedSystems = new Set<string>();

  // Pass 1: prefer one candidate per master design system and reject near-duplicates.
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    const system = candidateSystem(candidate);
    if (system && usedSystems.has(system)) continue;
    const nearestSimilarity = selected.length
      ? Math.max(...selected.map((picked) => designSimilarity(candidate.designScore.fingerprint, picked.designScore.fingerprint)))
      : 0;
    if (nearestSimilarity > 0.72) continue;
    selected.push(candidate);
    if (system) usedSystems.add(system);
  }

  // Pass 2: if we still need more options, allow mutations but keep the diversity penalty strong.
  const remaining = ranked.filter((candidate) => !selected.includes(candidate));
  while (remaining.length && selected.length < limit) {
    let bestIndex = 0;
    let bestAdjusted = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]!;
      const nearestSimilarity = selected.length
        ? Math.max(...selected.map((picked) => designSimilarity(candidate.designScore.fingerprint, picked.designScore.fingerprint)))
        : 0;
      const system = candidateSystem(candidate);
      const systemPenalty = system && usedSystems.has(system) ? 18 : 0;
      const diversityBonus = (1 - nearestSimilarity) * 38;
      const duplicatePenalty = nearestSimilarity >= 0.9 ? 55 : nearestSimilarity >= 0.8 ? 30 : nearestSimilarity >= 0.72 ? 14 : 0;
      const adjusted = candidate.designScore.total + diversityBonus - duplicatePenalty - systemPenalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIndex = index;
      }
    }
    const picked = remaining.splice(bestIndex, 1)[0]!;
    selected.push(picked);
    const system = candidateSystem(picked);
    if (system) usedSystems.add(system);
  }

  return selected;
}

export function designSimilarity(a: DesignFingerprint, b: DesignFingerprint): number {
  const system = a.system === b.system ? 1 : 0;
  const structural = orderedTokenSimilarity(a.structure, b.structure);
  const palette = a.palette === b.palette ? 1 : 0;
  const typography = a.typography === b.typography ? 1 : 0;
  const density = a.density === b.density ? 1 : 0;
  const shape = a.shape === b.shape ? 1 : 0;
  const modifiers = tokenSetSimilarity(a.modifiers, b.modifiers);
  return system * 0.12 + structural * 0.43 + palette * 0.13 + typography * 0.13 + density * 0.05 + shape * 0.05 + modifiers * 0.09;
}

export function fingerprintDesign(site: Site): DesignFingerprint {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0]!;
  const structure = home.sections.filter((section) => !section.hidden).map((section) => familyAndVariant(section.component.componentId) ?? "unknown").join("|");
  const palette = home.sections.filter((section) => !section.hidden).map((section) => String(section.props?.paletteRole ?? "surface")).join("|");
  const typography = [site.theme.brand.typography.display, site.theme.brand.typography.body, site.theme.brand.typography.ui].join("|");
  return {
    system: site.theme.family,
    structure,
    palette,
    typography,
    density: site.theme.brand.density,
    shape: site.theme.brand.shape,
    modifiers: [...site.theme.modifiers].sort().join("|"),
  };
}

function scoreVisualIdentity(site: Site): number {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0]!;
  const paletteRoles = new Set(home.sections.filter((section) => !section.hidden).map((section) => String(section.props?.paletteRole ?? "surface")));
  const typographyDistinct = new Set([site.theme.brand.typography.display, site.theme.brand.typography.body, site.theme.brand.typography.ui]).size;
  const modifierPoints = Math.min(20, site.theme.modifiers.length * 8);
  return clamp(45 + Math.min(25, paletteRoles.size * 6) + Math.min(10, typographyDistinct * 4) + modifierPoints);
}

function candidateSystem(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const name = (candidate as { name?: unknown }).name;
  if (typeof name !== "string" || !name.trim()) return undefined;
  return name.split(" · variation ")[0]?.trim().toLowerCase();
}

function familyAndVariant(componentId: string): string | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized.startsWith(`${family}.`));
  if (legacy) return `${legacy}:${variantFromId(componentId)}`;
  const upper = componentId.toUpperCase();
  const family = SECTION_FAMILIES.find((candidate) => upper.includes(`-${FAMILY_CODES[candidate]}-`));
  return family ? `${family}:${variantFromId(componentId)}` : undefined;
}

function variantFromId(componentId: string): number {
  const match = componentId.match(/(?:-|\.)(\d{1,3})$/);
  return match ? Math.max(1, Number(match[1]) || 1) : 1;
}

function orderedTokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = a.split("|").filter(Boolean);
  const right = b.split("|").filter(Boolean);
  if (!left.length && !right.length) return 1;
  const setSimilarity = tokenSetSimilarity(a, b);
  const longest = Math.max(left.length, right.length, 1);
  const positionalMatches = Array.from({ length: longest }, (_, index) => left[index] === right[index] && left[index] != null).filter(Boolean).length;
  const positionalSimilarity = positionalMatches / longest;
  return setSimilarity * 0.65 + positionalSimilarity * 0.35;
}

function tokenSetSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const left = new Set(a.split("|").filter(Boolean));
  const right = new Set(b.split("|").filter(Boolean));
  if (!left.size && !right.size) return 1;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
