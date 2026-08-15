import type { DesignRegistryEntry } from "./design";
import type { DesignQaEvidence } from "./qa";
import { canPromoteWithEvidence } from "./qa";
import type { VisualReviewRecord } from "./review";
import { visualReviewPassed, visualReviewScore } from "./review";

export type PromotionTarget = "review" | "approved" | "production" | "deprecated";

export type PromotionResult = {
  allowed: boolean;
  reasons: string[];
};

export type PromotionEvidence = {
  qa?: DesignQaEvidence;
  visualReview?: VisualReviewRecord;
};

const allowedTransitions: Record<DesignRegistryEntry["status"], PromotionTarget[]> = {
  draft: ["review", "deprecated"],
  review: ["approved", "deprecated"],
  approved: ["production", "deprecated"],
  production: ["deprecated"],
  deprecated: [],
};

function validateLifecycle(entry: DesignRegistryEntry, target: PromotionTarget, reasons: string[]) {
  if (!allowedTransitions[entry.status].includes(target)) {
    reasons.push(`Invalid lifecycle transition: ${entry.status} -> ${target}`);
  }
}

function validateRegistryMetadata(entry: DesignRegistryEntry, target: PromotionTarget, reasons: string[]) {
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
}

function validateEvidence(entry: DesignRegistryEntry, target: PromotionTarget, evidence: PromotionEvidence, reasons: string[]) {
  if (target === "review") {
    if (!evidence.qa) {
      reasons.push("Review requires matching machine QA evidence.");
    } else {
      const qa = canPromoteWithEvidence(entry, { ...evidence.qa, visualReviewed: true, visualScore: 100 });
      for (const reason of qa.reasons.filter((reason) => !reason.startsWith("Visual review"))) reasons.push(reason);
    }
    return;
  }

  if (target === "approved" || target === "production") {
    if (!evidence.qa) {
      reasons.push(`${target === "approved" ? "Approval" : "Production"} requires matching machine QA evidence.`);
    } else {
      const qa = canPromoteWithEvidence(entry, evidence.qa);
      for (const reason of qa.reasons.filter((reason) => !reason.startsWith("Visual review"))) reasons.push(reason);
    }

    if (!evidence.visualReview) {
      reasons.push(`${target === "approved" ? "Approval" : "Production"} requires an approved visual review.`);
    } else {
      if (evidence.visualReview.designId !== entry.id || evidence.visualReview.version !== entry.version) {
        reasons.push("Visual review does not match design id/version.");
      }
      if (!visualReviewPassed(evidence.visualReview)) {
        const score = visualReviewScore(evidence.visualReview);
        reasons.push(`Visual review must be approved with score >= 80${typeof score === "number" ? ` (current ${score})` : ""}.`);
      }
    }
  }
}

export function canPromoteDesign(
  entry: DesignRegistryEntry,
  target: PromotionTarget,
  evidence: PromotionEvidence = {},
): PromotionResult {
  const reasons: string[] = [];
  validateLifecycle(entry, target, reasons);
  validateRegistryMetadata(entry, target, reasons);
  validateEvidence(entry, target, evidence, reasons);
  return { allowed: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function promoteDesign(
  entry: DesignRegistryEntry,
  target: PromotionTarget,
  evidence: PromotionEvidence = {},
): DesignRegistryEntry {
  const result = canPromoteDesign(entry, target, evidence);
  if (!result.allowed) {
    throw new Error(`Design ${entry.id}@${entry.version} cannot move to ${target}: ${result.reasons.join(" ")}`);
  }
  return { ...entry, status: target };
}
