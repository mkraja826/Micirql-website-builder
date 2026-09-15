import type { RankedCandidate } from "../ranking/schema";

export type RenderedRankingSignal = {
  candidateId: string;
  renderedScore: number;
  hardFailures: string[];
};

export type PerceptualRankingSignal = {
  candidateId: string;
  perceptualScore: number;
};

export type FinalCertificationRanking<T extends { id: string }> = RankedCandidate<T> & {
  signals: {
    planScore: number;
    renderedScore: number;
    perceptualScore: number;
  };
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
}): FinalCertificationRanking<T>[] {
  if (!input.canonicalRanking.length) throw new Error("Final certification ranking requires canonical candidate ranking evidence.");
  const rendered = uniqueByCandidate(input.rendered, "Rendered ranking");
  const perceptual = uniqueByCandidate(input.perceptual, "Perceptual ranking");
  const candidateIds = new Set(input.canonicalRanking.map(({ candidate }) => candidate.id));
  if (rendered.size !== candidateIds.size || perceptual.size !== candidateIds.size) throw new Error("Final ranking evidence must cover exactly the canonical candidate set.");
  for (const id of rendered.keys()) if (!candidateIds.has(id)) throw new Error(`Rendered ranking contains unranked candidate ${id}.`);
  for (const id of perceptual.keys()) if (!candidateIds.has(id)) throw new Error(`Perceptual ranking contains unranked candidate ${id}.`);

  return input.canonicalRanking.map((ranked) => {
    const candidateId = ranked.candidate.id;
    const renderedSignal = rendered.get(candidateId)!;
    const perceptualSignal = perceptual.get(candidateId)!;
    if (!Number.isFinite(ranked.score.total) || !Number.isFinite(renderedSignal.renderedScore) || !Number.isFinite(perceptualSignal.perceptualScore)) {
      throw new Error(`Final ranking contains a non-finite score for ${candidateId}.`);
    }
    if (renderedSignal.hardFailures.length) throw new Error(`Candidate ${candidateId} has rendered hard failures and cannot enter final certification ranking.`);
    const total = Number((ranked.score.total * WEIGHTS.plan + renderedSignal.renderedScore * WEIGHTS.rendered + perceptualSignal.perceptualScore * WEIGHTS.perceptual).toFixed(2));
    return {
      ...ranked,
      score: { ...ranked.score, total },
      signals: { planScore: ranked.score.total, renderedScore: renderedSignal.renderedScore, perceptualScore: perceptualSignal.perceptualScore },
    };
  }).sort((a, b) => b.score.total - a.score.total || a.candidate.id.localeCompare(b.candidate.id))
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
