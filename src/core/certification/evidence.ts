import type { RankedCandidate } from "../ranking/schema";
import type { CandidateRepairPlan } from "../repair/schema";
import type { CandidateCertificationEvidence } from "./schema";

export type RenderedCertificationResult = {
  candidateId: string;
  hardFailures: string[];
};

export type RepairAcceptanceResult = {
  candidateId: string;
  accepted: boolean;
};

export type RealCertificationEvidenceInput<T extends { id: string }> = {
  ranked: RankedCandidate<T>[];
  rendered: RenderedCertificationResult[];
  repairPlans: CandidateRepairPlan[];
  repairAcceptance: RepairAcceptanceResult[];
};

function uniqueByCandidate<T extends { candidateId: string }>(items: T[], label: string) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item.candidateId) throw new Error(`${label} contains an empty candidate id.`);
    if (map.has(item.candidateId)) throw new Error(`${label} contains duplicate evidence for ${item.candidateId}.`);
    map.set(item.candidateId, item);
  }
  return map;
}

export function buildRealCertificationEvidence<T extends { id: string }>(
  input: RealCertificationEvidenceInput<T>,
): CandidateCertificationEvidence[] {
  if (!input.ranked.length) throw new Error("Real certification requires final ranked candidates.");

  const rendered = uniqueByCandidate(input.rendered, "Rendered certification");
  const repairs = uniqueByCandidate(input.repairPlans, "Repair plan");
  const acceptance = uniqueByCandidate(input.repairAcceptance, "Repair acceptance");
  const seenRanks = new Set<number>();
  const seenCandidates = new Set<string>();

  return [...input.ranked]
    .sort((a, b) => a.rank - b.rank)
    .map((ranked) => {
      const candidateId = ranked.candidate.id;
      if (!candidateId) throw new Error("Final ranking contains a candidate without an id.");
      if (seenCandidates.has(candidateId)) throw new Error(`Final ranking contains duplicate candidate ${candidateId}.`);
      if (!Number.isInteger(ranked.rank) || ranked.rank < 1 || seenRanks.has(ranked.rank)) {
        throw new Error(`Final ranking contains an invalid or duplicate rank for ${candidateId}.`);
      }
      if (!Number.isFinite(ranked.score.total)) throw new Error(`Final ranking score is invalid for ${candidateId}.`);
      seenCandidates.add(candidateId);
      seenRanks.add(ranked.rank);

      const renderedResult = rendered.get(candidateId);
      const repairPlan = repairs.get(candidateId);
      const repairResult = acceptance.get(candidateId);
      if (!renderedResult) throw new Error(`Missing rendered certification evidence for ${candidateId}.`);
      if (!repairPlan) throw new Error(`Missing bounded repair plan for ${candidateId}.`);
      if (!repairResult) throw new Error(`Missing repair acceptance evidence for ${candidateId}.`);
      if (repairPlan.candidateId !== candidateId || repairPlan.requiresRegeneration || repairPlan.allowsArbitraryCodeRewrite !== false) {
        throw new Error(`Repair plan is not bounded and deterministic for ${candidateId}.`);
      }

      return {
        candidateId,
        rank: ranked.rank,
        finalScore: ranked.score.total,
        hardFailures: [...renderedResult.hardFailures],
        repairAccepted: repairResult.accepted,
      };
    });
}
