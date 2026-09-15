import type { RankedCandidate } from "../ranking/schema";
import type { CandidateRepairPlan } from "../repair/schema";
import { buildRealCertificationEvidence, type RepairAcceptanceResult } from "./evidence";
import {
  composeFinalCertificationRanking,
  type FinalRankedCandidate,
  type PerceptualRankingSignal,
  type RenderedRankingSignal,
} from "./final-ranking";
import type { CandidateCertificationEvidence } from "./schema";

export type RealCertificationPipelineInput<T extends { id: string }> = {
  canonicalRanking: RankedCandidate<T>[];
  rendered: RenderedRankingSignal[];
  perceptual: PerceptualRankingSignal[];
  repairPlans: CandidateRepairPlan[];
  repairAcceptance: RepairAcceptanceResult[];
};

export type RealCertificationPipelineResult<T extends { id: string }> = {
  finalRanking: FinalRankedCandidate<T>[];
  evidence: CandidateCertificationEvidence[];
};

export function runRealCertificationPipeline<T extends { id: string }>(
  input: RealCertificationPipelineInput<T>,
): RealCertificationPipelineResult<T> {
  const finalRanking = composeFinalCertificationRanking({
    canonicalRanking: input.canonicalRanking,
    rendered: input.rendered,
    perceptual: input.perceptual,
  });

  const renderedCertification = input.rendered.map(({ candidateId, hardFailures }) => ({
    candidateId,
    hardFailures: [...hardFailures],
  }));

  const evidence = buildRealCertificationEvidence({
    ranked: finalRanking,
    rendered: renderedCertification,
    repairPlans: input.repairPlans,
    repairAcceptance: input.repairAcceptance,
  });

  const rankOne = evidence.find((item) => item.rank === 1);
  if (!rankOne) throw new Error("Real certification pipeline did not produce a rank-one candidate.");
  if (rankOne.hardFailures.length) throw new Error(`Rank-one candidate ${rankOne.candidateId} has hard failures.`);
  if (!rankOne.repairAccepted) throw new Error(`Rank-one candidate ${rankOne.candidateId} has not passed post-repair acceptance.`);

  return { finalRanking, evidence };
}
