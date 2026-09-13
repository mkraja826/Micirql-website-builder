import type { CandidateRepairPlan } from "../core/repair/schema";

const PEARL_REPAIR_PLANS: Record<string, CandidateRepairPlan> = {
  "candidate-04": {
    version: "1.0",
    candidateId: "candidate-04",
    instructions: [
      {
        kind: "heading-scale",
        target: "desktop",
        reason: "desktop heading scale ratio 6.12 exceeds certified ceiling 4.8",
        source: "perceptual-audit",
        boundedAction: "normalize-heading-scale",
      },
      {
        kind: "text-measure",
        target: "mobile",
        reason: "mobile readable text measure ratio 0.47 is below certified target 0.55",
        source: "perceptual-audit",
        boundedAction: "constrain-readable-width",
      },
    ],
    requiresRegeneration: false,
    allowsArbitraryCodeRewrite: false,
  },
};

export function getPearlRepairPlan(candidateId: string) {
  return PEARL_REPAIR_PLANS[candidateId];
}
