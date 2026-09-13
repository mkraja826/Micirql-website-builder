export type RepairTarget = "desktop" | "mobile" | "both";

export type RepairKind =
  | "tap-target"
  | "text-measure"
  | "heading-scale"
  | "hero-proportion"
  | "media-presence"
  | "media-variety"
  | "viewport-overflow";

export type RepairInstruction = {
  kind: RepairKind;
  target: RepairTarget;
  reason: string;
  source: "rendered-audit" | "perceptual-audit";
  boundedAction:
    | "increase-interactive-hit-area"
    | "constrain-readable-width"
    | "normalize-heading-scale"
    | "normalize-hero-height"
    | "request-planned-media"
    | "vary-planned-media-aspect"
    | "contain-horizontal-layout";
};

export type CandidateRepairPlan = {
  version: "1.0";
  candidateId: string;
  instructions: RepairInstruction[];
  requiresRegeneration: boolean;
  allowsArbitraryCodeRewrite: false;
};
