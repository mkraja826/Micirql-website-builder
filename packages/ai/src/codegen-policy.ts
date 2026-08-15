import type { AiDecisionOutput, LibraryGap } from "./types";

export type CodeGenerationDecision = {
  allowed: boolean;
  reason: string;
  gaps: LibraryGap[];
};

export function evaluateCodeGeneration(output: AiDecisionOutput): CodeGenerationDecision {
  const eligible = output.gaps.filter((gap) => gap.allowCodeGeneration);
  if (eligible.length === 0) {
    return {
      allowed: false,
      reason: "The approved library can satisfy the current plan or generation is disabled.",
      gaps: [],
    };
  }

  const hardGaps = eligible.filter((gap) => gap.reason === "NO_PRODUCTION_MATCH" || gap.reason === "MISSING_CAPABILITY");
  if (hardGaps.length === 0) {
    return {
      allowed: false,
      reason: "Low-confidence matches should be reviewed or re-ranked before generating new code.",
      gaps: eligible,
    };
  }

  return {
    allowed: true,
    reason: "Generation is permitted only for verified library gaps and the result must enter the Design Registry as draft and pass the full QA/promotion lifecycle before production use.",
    gaps: hardGaps,
  };
}
