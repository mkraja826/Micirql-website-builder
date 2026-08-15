import type { DesignRegistryEntry } from "./design";

export type PromotionTarget = "review" | "approved" | "production" | "deprecated";

export type PromotionResult = {
  allowed: boolean;
  reasons: string[];
};

const allowedTransitions: Record<DesignRegistryEntry["status"], PromotionTarget[]> = {
  draft: ["review", "deprecated"],
  review: ["approved", "deprecated"],
  approved: ["production", "deprecated"],
  production: ["deprecated"],
  deprecated: [],
};

export function canPromoteDesign(entry: DesignRegistryEntry, target: PromotionTarget): PromotionResult {
  const reasons: string[] = [];

  if (!allowedTransitions[entry.status].includes(target)) {
    reasons.push(`Invalid lifecycle transition: ${entry.status} -> ${target}`);
  }

  if (target === "review") {
    if (!entry.previews.thumbnail) reasons.push("Review requires a thumbnail preview.");
    if (entry.contentSchema.length === 0) reasons.push("Review requires a declared content schema.");
  }

  if (target === "approved" || target === "production") {
    if (!entry.protocol.passed) reasons.push("Protocol checks must pass before approval.");
    if (entry.protocol.score < 90) reasons.push("Protocol score must be at least 90.");
    if (entry.quality.mobile < 90) reasons.push("Mobile quality score must be at least 90.");
    if (entry.quality.performance < 90) reasons.push("Performance score must be at least 90.");
    if (entry.quality.accessibility < 90) reasons.push("Accessibility score must be at least 90.");
    if (entry.quality.visual < 80) reasons.push("Visual quality score must be at least 80.");
  }

  if (target === "production") {
    if (!entry.previews.mobile) reasons.push("Production requires a mobile preview.");
    if (!entry.previews.desktop) reasons.push("Production requires a desktop preview.");
    if (entry.technical.clientJavascript === "high") reasons.push("High client JavaScript designs cannot enter production.");
    if (entry.technical.animationCost === "high") reasons.push("High animation-cost designs cannot enter production.");
  }

  return { allowed: reasons.length === 0, reasons };
}

export function promoteDesign(entry: DesignRegistryEntry, target: PromotionTarget): DesignRegistryEntry {
  const result = canPromoteDesign(entry, target);
  if (!result.allowed) {
    throw new Error(`Design ${entry.id}@${entry.version} cannot move to ${target}: ${result.reasons.join(" ")}`);
  }
  return { ...entry, status: target };
}
