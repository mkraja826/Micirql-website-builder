import type { Domain, ThemeFamily, ThemeModifier } from "@micirql/schema";
import type { ComponentFamily, DesignRegistryEntry } from "./design";

export type DesignQuery = {
  family: ComponentFamily;
  theme: ThemeFamily;
  domain: Domain;
  modifiers?: ThemeModifier[];
  brandPersonalities?: string[];
  requiredCapabilities?: string[];
  conversionGoals?: string[];
  placementRole?: "opening" | "early-proof" | "core-content" | "visual-break" | "decision-support" | "conversion" | "closing";
  previousFamily?: ComponentFamily | undefined;
  nextFamily?: ComponentFamily | undefined;
  preferImage?: boolean;
  targetContentDensity?: "low" | "medium" | "high";
  targetVisualWeight?: "light" | "medium" | "heavy";
  minimumMobileScore?: number;
  minimumPerformanceScore?: number;
  minimumAccessibilityScore?: number;
  limit?: number;
};

export type RankedDesign = {
  entry: DesignRegistryEntry;
  score: number;
  reasons: string[];
};

const includesAll = (entry: DesignRegistryEntry, required: string[]): boolean =>
  required.every((capability) => entry.capabilities[capability] === true);

function matchScore(wanted: readonly string[], offered: readonly string[]): number {
  if (!wanted.length) return 50;
  const matches = wanted.filter((item) => offered.includes(item)).length;
  return Math.min(100, (matches / wanted.length) * 100);
}

export function rankDesigns(entries: readonly DesignRegistryEntry[], query: DesignQuery): RankedDesign[] {
  const minMobile = query.minimumMobileScore ?? 90;
  const minPerformance = query.minimumPerformanceScore ?? 90;
  const minAccessibility = query.minimumAccessibilityScore ?? 90;

  const ranked = entries
    .filter((entry) => entry.status === "production")
    .filter((entry) => entry.protocol.passed)
    .filter((entry) => entry.family === query.family && entry.theme === query.theme)
    .filter((entry) => entry.quality.mobile >= minMobile)
    .filter((entry) => entry.quality.performance >= minPerformance)
    .filter((entry) => entry.quality.accessibility >= minAccessibility)
    .filter((entry) => includesAll(entry, query.requiredCapabilities ?? []))
    .filter((entry) => !query.previousFamily || !entry.intelligence?.avoidAdjacent.includes(query.previousFamily))
    .filter((entry) => !query.nextFamily || !entry.intelligence?.avoidAdjacent.includes(query.nextFamily))
    .map((entry) => {
      const reasons: string[] = [];
      const intelligence = entry.intelligence;
      const domain = entry.domainCompatibility[query.domain] ?? 0;
      const modifierMatches = (query.modifiers ?? []).filter((m) => entry.modifiers.includes(m)).length;
      const personalityMatches = (query.brandPersonalities ?? []).filter((p) => entry.brandPersonalities.includes(p)).length;
      const retention = entry.usage.selected > 0
        ? Math.max(0, 100 - (entry.usage.replaced / entry.usage.selected) * 100)
        : 50;
      const conversion = intelligence ? matchScore(query.conversionGoals ?? [], intelligence.conversionGoals) : 50;
      const placement = !query.placementRole ? 50 : intelligence?.placementRoles.includes(query.placementRole) ? 100 : 0;
      const predecessor = !query.previousFamily ? 50 : intelligence?.idealPredecessors.includes(query.previousFamily) ? 100 : 35;
      const successor = !query.nextFamily ? 50 : intelligence?.idealSuccessors.includes(query.nextFamily) ? 100 : 35;
      const imageFit = query.preferImage === undefined ? 50
        : query.preferImage
          ? intelligence?.imageRequirement === "required" || intelligence?.imageRequirement === "recommended" ? 100 : intelligence?.imageRequirement === "optional" ? 65 : 10
          : intelligence?.imageRequirement === "none" || intelligence?.imageRequirement === "optional" ? 100 : 35;
      const densityFit = !query.targetContentDensity ? 50 : intelligence?.contentDensity === query.targetContentDensity ? 100 : 40;
      const visualFit = !query.targetVisualWeight ? 50 : intelligence?.visualWeight === query.targetVisualWeight ? 100 : 40;
      const aiPriority = intelligence?.aiPriority ?? 50;
      const mobileSuitability = intelligence?.mobileSuitability ?? entry.quality.mobile;

      if (domain >= 95) reasons.push("strong industry fit");
      if (conversion >= 90 && (query.conversionGoals?.length ?? 0) > 0) reasons.push("matches conversion goal");
      if (placement === 100) reasons.push(`fits ${query.placementRole} placement`);
      if (predecessor === 100) reasons.push(`works after ${query.previousFamily}`);
      if (successor === 100) reasons.push(`works before ${query.nextFamily}`);
      if (imageFit === 100 && query.preferImage !== undefined) reasons.push(query.preferImage ? "supports image-led composition" : "works without imagery");
      if (mobileSuitability >= 95) reasons.push("excellent mobile suitability");

      const score =
        domain * 0.20 +
        conversion * 0.12 +
        placement * 0.08 +
        predecessor * 0.06 +
        successor * 0.04 +
        imageFit * 0.05 +
        densityFit * 0.04 +
        visualFit * 0.04 +
        mobileSuitability * 0.08 +
        entry.quality.performance * 0.06 +
        entry.quality.accessibility * 0.06 +
        entry.quality.visual * 0.05 +
        (entry.quality.conversion ?? 50) * 0.04 +
        Math.min(100, modifierMatches * 25) * 0.025 +
        Math.min(100, personalityMatches * 25) * 0.025 +
        retention * 0.02 +
        aiPriority * 0.02;

      return { entry, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, query.limit ?? 10);
}
