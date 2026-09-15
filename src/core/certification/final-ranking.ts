import type { RankedCandidate } from "../ranking/schema";

export type RenderedRankingSignal = {
  candidateId: string;
  evidenceState: "post-repair";
  renderedScore: number;
  hardFailures: string[];
};

export type PerceptualRankingSignal = {
  candidateId: string;
  perceptualScore: number;
};

export type FinalRankedCandidate<T extends { id: string }> = {
  rank: number;
  candidate: T;
  finalScore: number;
  signals: {
    planScore: number;
    renderedScore: number;
    perceptualScore: number;
  };
  strengths: string[];
  cautions: string[];
};

const WEIGHTS = { plan: 0.3, rendered: 0.25, perceptual: 0.45 } as const;

function uniqueByCandidate<T extends { candidateId: string }>(items: T[], label: string) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item.candidateId || map.has(item.candidateId)) throw new Error(`${label} contains invalid or duplicate candidate evidence.`);
    map.set(item.candidateId, item);
  }
  return map;
}

export function composeFinalCertificationRanking<T extends { id: string }>(input: {
  canonicalRanking: RankedCandidate<T>[];
  rendered: RenderedRankingSignal[];
  perceptual: PerceptualRankingSignal[];
}): FinalRankedCandidate<T>[] {
  if (!input.canonicalRanking.length) throw new Error("Final certification ranking requires canonical candidate ranking evidence.");

  const rendered = uniqueByCandidate(input.rendered, "Rendered ranking");
  const perceptual = uniqueByCandidate(input.perceptual, "Perceptual ranking");
  const candidateIds = new Set<string>();
  const canonicalRanks = new Set<number>();

  for (const ranked of input.canonicalRanking) {
    const candidateId = ranked.candidate.id;
    if (!candidateId || candidateIds.has(candidateId)) throw new Error("Canonical ranking contains an invalid or duplicate candidate id.");
    if (!Number.isInteger(ranked.rank) || ranked.rank < 1 || canonicalRanks.has(ranked.rank)) throw new Error(`Canonical ranking contains an invalid or duplicate rank for ${candidateId}.`);
    candidateIds.add(candidateId);
    canonicalRanks.add(ranked.rank);
  }

  if (rendered.size !== candidateIds.size || perceptual.size !== candidateIds.size) throw new Error("Final ranking evidence must cover exactly the canonical candidate set.");
  for (const id of rendered.keys()) if (!candidateIds.has(id)) throw new Error(`Rendered ranking contains unranked candidate ${id}.`);
  for (const id of perceptual.keys()) if (!candidateIds.has(id)) throw new Error(`Perceptual ranking contains unranked candidate ${id}.`);

  return input.canonicalRanking.map((ranked) => {
    const candidateId = ranked.candidate.id;
    const renderedSignal = rendered.get(candidateId)!;
    const perceptualSignal = perceptual.get(candidateId)!;
    if (renderedSignal.evidenceState !== "post-repair") throw new Error(`Candidate ${candidateId} rendered evidence is not post-repair and cannot enter final certification ranking.`);
    if (!Number.isFinite(ranked.score.total) || !Number.isFinite(renderedSignal.renderedScore) || !Number.isFinite(perceptualSignal.perceptualScore)) {
      throw new Error(`Final ranking contains a non-finite score for ${candidateId}.`);
    }
    if (renderedSignal.hardFailures.length) throw new Error(`Candidate ${candidateId} has rendered hard failures and cannot enter final certification ranking.`);

    const finalScore = Number((ranked.score.total * WEIGHTS.plan + renderedSignal.renderedScore * WEIGHTS.rendered + perceptualSignal.perceptualScore * WEIGHTS.perceptual).toFixed(2));
    return {
      rank: ranked.rank,
      candidate: ranked.candidate,
      finalScore,
      signals: {
        planScore: ranked.score.total,
        renderedScore: renderedSignal.renderedScore,
        perceptualScore: perceptualSignal.perceptualScore,
      },
      strengths: [...ranked.strengths],
      cautions: [...ranked.cautions],
    };
  }).sort((a, b) => b.finalScore - a.finalScore || a.candidate.id.localeCompare(b.candidate.id))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
