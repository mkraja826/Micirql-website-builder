import type { DesignScore } from "@micirql/design-engine";

export type DentalPremiumRankingInput = {
  baseScore: DesignScore;
  preferenceAdjustedScore: DesignScore;
  industryFit: number;
  dnaMatch: number;
  fitBonus: number;
  content: number;
  multipage: number;
  typography: number;
  rhythm: number;
  media: number;
  responsive: number;
  antiPattern: number;
};

export type DentalPremiumRanking = {
  total: number;
  breakdown: {
    visualQuality: number;
    brandBriefFit: number;
    typography: number;
    rhythm: number;
    responsive: number;
    media: number;
    antiPattern: number;
    contentArchitecture: number;
    preferenceAdjustment: number;
  };
};

/**
 * Dental V2 ranking deliberately stops the older generic design score from
 * dominating review order. Each surviving candidate has already passed hard QA;
 * this function decides which of those good candidates feels most premium and
 * appropriate for the actual customer brief.
 */
export function rankDentalPremiumCandidate(input: DentalPremiumRankingInput): DentalPremiumRanking {
  const dna = clamp((input.dnaMatch / 30) * 100);
  const fit = clamp(72 + input.fitBonus);
  const brandBriefFit = Math.round(input.industryFit * 0.45 + dna * 0.35 + fit * 0.20);

  // Generic score remains useful as a structural/visual signal, but only as one
  // component of premium visual quality rather than the final decision-maker.
  const visualQuality = Math.round(
    input.baseScore.visualVariety * 0.45 +
    input.baseScore.structuralVariety * 0.25 +
    input.baseScore.readiness * 0.30
  );

  const contentArchitecture = Math.round(input.content * 0.45 + input.multipage * 0.55);
  const preferenceDelta = clampSigned(input.preferenceAdjustedScore.total - input.baseScore.total, -5, 5);

  const weighted =
    visualQuality * 0.20 +
    brandBriefFit * 0.18 +
    input.typography * 0.12 +
    input.rhythm * 0.10 +
    input.responsive * 0.16 +
    input.media * 0.10 +
    input.antiPattern * 0.08 +
    contentArchitecture * 0.06;

  return {
    total: clamp(Math.round(weighted + preferenceDelta)),
    breakdown: {
      visualQuality: clamp(visualQuality),
      brandBriefFit: clamp(brandBriefFit),
      typography: clamp(input.typography),
      rhythm: clamp(input.rhythm),
      responsive: clamp(input.responsive),
      media: clamp(input.media),
      antiPattern: clamp(input.antiPattern),
      contentArchitecture: clamp(contentArchitecture),
      preferenceAdjustment: preferenceDelta,
    },
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampSigned(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}
