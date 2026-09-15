import type { CandidateRepairPlan } from "../repair/schema";
import type { FinalRankedCandidate } from "./final-ranking";
import type { CandidateCertificationEvidence } from "./schema";

export type RenderedCertificationResult = {
  candidateId: string;
  hardFailures: string[];
};

export type RepairAcceptanceResult = {
  candidateId: string;
  evidenceState: "post-repair";
  accepted: boolean;
};

export type RealCertificationEvidenceInput<T extends { id: string }> = {
  ranked: FinalRankedCandidate<T>[];
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
  const rankedIds = new Set(input.ranked.map(({ candidate }) => candidate.id));
  if (rendered.size !== rankedIds.size || repairs.size !== rankedIds.size || acceptance.size !== rankedIds.size) {
    throw new Error("Certification evidence must cover exactly the final ranked candidate set.");
  }
  for (const id of rendered.keys()) if (!rankedIds.has(id)) throw new Error(`Rendered certification contains unranked candidate ${id}.`);
  for (const id of repairs.keys()) if (!rankedIds.has(id)) throw new Error(`Repair plan contains unranked candidate ${id}.`);
  for (const id of acceptance.keys()) if (!rankedIds.has(id)) throw new Error(`Repair acceptance contains unranked candidate ${id}.`);

  const seenRanks = new Set<number>();
  const seenCandidates = new Set<string>();
  const evidence = [...input.ranked]
    .sort((a, b) => a.rank - b.rank)
    .map((ranked) => {
      const candidateId = ranked.candidate.id;
      if (!candidateId) throw new Error("Final ranking contains a candidate without an id.");
      if (seenCandidates.has(candidateId)) throw new Error(`Final ranking contains duplicate candidate ${candidateId}.`);
      if (!Number.isInteger(ranked.rank) || ranked.rank < 1 || seenRanks.has(ranked.rank)) {
        throw new Error(`Final ranking contains an invalid or duplicate rank for ${candidateId}.`);
      }
      if (!Number.isFinite(ranked.finalScore)) throw new Error(`Final ranking score is invalid for ${candidateId}.`);
      seenCandidates.add(candidateId);
      seenRanks.add(ranked.rank);

      const renderedResult = rendered.get(candidateId)!;
      const repairPlan = repairs.get(candidateId)!;
      const repairResult = acceptance.get(candidateId)!;
      if (repairPlan.candidateId !== candidateId || repairPlan.requiresRegeneration || repairPlan.allowsArbitraryCodeRewrite !== false) {
        throw new Error(`Repair plan is not bounded and deterministic for ${candidateId}.`);
      }
      if (repairResult.evidenceState !== "post-repair") {
        throw new Error(`Repair acceptance is not post-repair evidence for ${candidateId}.`);
      }

      return {
        candidateId,
        rank: ranked.rank,
        finalScore: ranked.finalScore,
        hardFailures: [...renderedResult.hardFailures],
        repairAccepted: repairResult.accepted,
      };
    });

  if (!evidence.some((item) => item.rank === 1)) throw new Error("Real certification evidence must contain rank one.");
  return evidence;
}
