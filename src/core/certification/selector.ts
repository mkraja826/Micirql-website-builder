import type { PublishableDraft } from "../publish/schema";
import { materializeSiteDraft } from "../materialization/materializer";
import type { CandidateCertificationEvidence, CertifiedMaterializedSite, CertifiedWinner } from "./schema";

function validateEvidence(evidence: CandidateCertificationEvidence[]) {
  if (!evidence.length) throw new Error("Certification evidence is required.");
  const ranks = evidence.map((item) => item.rank);
  if (new Set(ranks).size !== ranks.length) throw new Error("Certification evidence contains duplicate ranks.");
  if (!ranks.includes(1)) throw new Error("Certification evidence has no rank-1 candidate.");
  if (evidence.some((item) => !Number.isFinite(item.finalScore))) throw new Error("Certification evidence contains an invalid score.");
}

export function selectCertifiedWinner(evidence: CandidateCertificationEvidence[]): CertifiedWinner {
  validateEvidence(evidence);
  const winner = evidence.find((item) => item.rank === 1);
  if (!winner) throw new Error("Certified winner is missing.");
  if (winner.hardFailures.length) throw new Error(`Rank-1 candidate ${winner.candidateId} has hard failures.`);
  if (!winner.repairAccepted) throw new Error(`Rank-1 candidate ${winner.candidateId} has not passed repair acceptance.`);

  return {
    version: "1.0",
    candidateId: winner.candidateId,
    rank: 1,
    finalScore: winner.finalScore,
    certification: {
      hardFailureCount: 0,
      repairAccepted: true,
    },
  };
}

export function materializeCertifiedWinner({
  sourceKey,
  drafts,
  evidence,
}: {
  sourceKey: string;
  drafts: PublishableDraft[];
  evidence: CandidateCertificationEvidence[];
}): CertifiedMaterializedSite {
  const winner = selectCertifiedWinner(evidence);
  const draft = drafts.find((item) => item.candidateId === winner.candidateId);
  if (!draft) throw new Error(`Certified winner ${winner.candidateId} has no publishable draft.`);
  if (draft.readiness !== "ready") throw new Error(`Certified winner ${winner.candidateId} is not publishable.`);

  const site = materializeSiteDraft({ sourceKey, draft });
  if (site.source.candidateId !== winner.candidateId) {
    throw new Error("Materialized site candidate does not match certified winner.");
  }

  return {
    version: "1.0",
    winner,
    site,
  };
}
