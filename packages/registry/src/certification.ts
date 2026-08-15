import type { DesignRegistryEntry } from "./design";
import type { DesignQaEvidence } from "./qa";
import type { VisualReviewRecord } from "./review";
import { canPromoteDesign, promoteDesign, type PromotionEvidence } from "./promotion";

export type ProtocolCheckInput = {
  mobileScore: number;
  performanceScore: number;
  accessibilityScore: number;
  visualScore: number;
  conversionScore?: number;
  contentSchemaValid: boolean;
  dependencyPolicyPassed: boolean;
  backendRequirementsDeclared: boolean;
  previewCoveragePassed: boolean;
  checkedAt?: string;
};

export type CertificationBundle = {
  qa: DesignQaEvidence;
  visualReview: VisualReviewRecord;
  protocol: ProtocolCheckInput;
};

export type CertificationResult = {
  entry: DesignRegistryEntry;
  productionReady: boolean;
  stage: DesignRegistryEntry["status"];
  protocolScore: number;
  reasons: string[];
};

export const CORE_PREMIUM_FAMILIES = [
  "hero",
  "services",
  "testimonials",
  "team",
  "cta",
  "contact",
] as const;

export function isCorePremiumCandidate(entry: DesignRegistryEntry): boolean {
  return CORE_PREMIUM_FAMILIES.includes(entry.family as (typeof CORE_PREMIUM_FAMILIES)[number]);
}

export function applyProtocolCheck(entry: DesignRegistryEntry, input: ProtocolCheckInput): DesignRegistryEntry {
  const score = protocolScore(input);
  const passed = score >= 90
    && input.mobileScore >= 90
    && input.performanceScore >= 90
    && input.accessibilityScore >= 90
    && input.visualScore >= 80
    && input.contentSchemaValid
    && input.dependencyPolicyPassed
    && input.backendRequirementsDeclared
    && input.previewCoveragePassed;

  return {
    ...entry,
    quality: {
      ...entry.quality,
      mobile: input.mobileScore,
      performance: input.performanceScore,
      accessibility: input.accessibilityScore,
      visual: input.visualScore,
      ...(input.conversionScore === undefined ? {} : { conversion: input.conversionScore }),
    },
    protocol: {
      passed,
      score,
      checkedAt: input.checkedAt ?? new Date().toISOString(),
    },
  };
}

export function certifyDesignForProduction(entry: DesignRegistryEntry, bundle: CertificationBundle): CertificationResult {
  let current = applyProtocolCheck(entry, bundle.protocol);
  const reasons: string[] = [];
  const evidence: PromotionEvidence = { qa: bundle.qa, visualReview: bundle.visualReview };

  for (const target of ["review", "approved", "production"] as const) {
    if (current.status === target || current.status === "production") continue;
    const check = canPromoteDesign(current, target, evidence);
    if (!check.allowed) {
      reasons.push(...check.reasons);
      break;
    }
    current = promoteDesign(current, target, evidence);
  }

  return {
    entry: current,
    productionReady: current.status === "production" && current.protocol.passed,
    stage: current.status,
    protocolScore: current.protocol.score,
    reasons: [...new Set(reasons)],
  };
}

export function certificationSummary(results: readonly CertificationResult[]) {
  const production = results.filter((result) => result.productionReady);
  const blocked = results.filter((result) => !result.productionReady);
  return {
    total: results.length,
    production: production.length,
    blocked: blocked.length,
    productionIds: production.map((result) => result.entry.id),
    blockedDesigns: blocked.map((result) => ({ id: result.entry.id, stage: result.stage, reasons: result.reasons })),
  };
}

function protocolScore(input: ProtocolCheckInput): number {
  const numeric = [
    input.mobileScore,
    input.performanceScore,
    input.accessibilityScore,
    input.visualScore,
    input.conversionScore ?? 90,
  ];
  const numericAverage = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
  const gates = [
    input.contentSchemaValid,
    input.dependencyPolicyPassed,
    input.backendRequirementsDeclared,
    input.previewCoveragePassed,
  ];
  const gateScore = (gates.filter(Boolean).length / gates.length) * 100;
  return Math.round((numericAverage * 0.8 + gateScore * 0.2) * 100) / 100;
}
