import type { CandidateRepairPlan, RepairInstruction } from "../core/repair/schema";

function plan(candidateId: string, instructions: RepairInstruction[]): CandidateRepairPlan {
  return {
    version: "1.0",
    candidateId,
    instructions,
    requiresRegeneration: false,
    allowsArbitraryCodeRewrite: false,
  };
}

const headingScale = (reason: string): RepairInstruction => ({
  kind: "heading-scale",
  target: "desktop",
  reason,
  source: "perceptual-audit",
  boundedAction: "normalize-heading-scale",
});

const mobileTextMeasure = (reason: string): RepairInstruction => ({
  kind: "text-measure",
  target: "mobile",
  reason,
  source: "perceptual-audit",
  boundedAction: "constrain-readable-width",
});

const PEARL_REPAIR_PLANS: Record<string, CandidateRepairPlan> = {
  "candidate-04": plan("candidate-04", [
    headingScale("desktop heading scale ratio 6.12 exceeds certified ceiling 4.8"),
    mobileTextMeasure("mobile readable text measure ratio 0.47 is below certified target 0.55"),
  ]),
  "candidate-07": plan("candidate-07", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
  "candidate-08": plan("candidate-08", [
    headingScale("desktop: Weak or extreme heading scale"),
  ]),
  "candidate-10": plan("candidate-10", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
  "candidate-11": plan("candidate-11", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
  "candidate-13": plan("candidate-13", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
  "candidate-15": plan("candidate-15", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
  "candidate-17": plan("candidate-17", [
    headingScale("desktop: Weak or extreme heading scale"),
    mobileTextMeasure("mobile: Too much wide body copy"),
  ]),
};

export function getPearlRepairPlan(candidateId: string) {
  return PEARL_REPAIR_PLANS[candidateId];
}
