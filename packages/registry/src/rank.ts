import type { Domain, ThemeFamily, ThemeModifier } from "@micirql/schema";
import type { ComponentFamily, DesignRegistryEntry } from "./design";

export type DesignQuery = {
  family: ComponentFamily;
  theme: ThemeFamily;
  domain: Domain;
  modifiers?: ThemeModifier[];
  brandPersonalities?: string[];
  requiredCapabilities?: string[];
  minimumMobileScore?: number;
  minimumPerformanceScore?: number;
  minimumAccessibilityScore?: number;
  limit?: number;
};

export type RankedDesign = {
  entry: DesignRegistryEntry;
  score: number;
};

const includesAll = (entry: DesignRegistryEntry, required: string[]): boolean =>
  required.every((capability) => entry.capabilities[capability] === true);

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
    .map((entry) => {
      const domain = entry.domainCompatibility[query.domain] ?? 0;
      const modifierMatches = (query.modifiers ?? []).filter((m) => entry.modifiers.includes(m)).length;
      const personalityMatches = (query.brandPersonalities ?? []).filter((p) => entry.brandPersonalities.includes(p)).length;
      const retention = entry.usage.selected > 0
        ? Math.max(0, 100 - (entry.usage.replaced / entry.usage.selected) * 100)
        : 50;

      const score =
        domain * 0.3 +
        entry.quality.mobile * 0.15 +
        entry.quality.performance * 0.1 +
        entry.quality.accessibility * 0.1 +
        entry.quality.visual * 0.15 +
        (entry.quality.conversion ?? 50) * 0.1 +
        Math.min(100, modifierMatches * 25) * 0.04 +
        Math.min(100, personalityMatches * 25) * 0.03 +
        retention * 0.03;

      return { entry, score: Math.round(score * 100) / 100 };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, query.limit ?? 10);
}
