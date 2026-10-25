import type { Domain } from "@micirql/schema";
import {
  resolveCertifiedIndustryPackByCandidateId,
  resolveCertifiedIndustryPackRuntime,
  resolveProfileDomain as resolveRegistryProfileDomain,
  type IndustryPackCandidate,
  type IndustryPackRankingProfile,
} from "./industry-packs";

export type OnboardingProfile = IndustryPackRankingProfile;

export type RankedPreset = {
  preset: IndustryPackCandidate;
  score: number;
  reasons: string[];
  breakdown: Record<string, number>;
};

/**
 * Compatibility facade for existing review UI. Ranking policy lives inside the
 * resolved certified runtime so a new industry cannot inherit dental weights
 * or dental-specific recommendation language.
 */
export function rankPresets(profile: OnboardingProfile): RankedPreset[] {
  const runtime = resolveCertifiedIndustryPackRuntime(profile);
  if (!runtime) return [];
  return runtime.rankCandidates(profile).map(
    ({ candidate, score, reasons, breakdown }) => ({
      preset: candidate,
      score,
      reasons,
      breakdown,
    }),
  );
}

export function applyAiCandidateOrder(
  ranked: RankedPreset[],
  candidateIds: unknown,
): RankedPreset[] {
  const pack = ranked[0]
    ? resolveCertifiedIndustryPackByCandidateId(ranked[0].preset.id)
    : undefined;
  const expectedCount = pack?.reviewCount ?? ranked.length;
  if (!Array.isArray(candidateIds) || candidateIds.length !== expectedCount)
    return ranked;
  if (
    !candidateIds.every(
      (value): value is string => typeof value === "string",
    )
  )
    return ranked;
  const allowed = new Map(ranked.map((item) => [item.preset.id, item]));
  if (new Set(candidateIds).size !== expectedCount) return ranked;
  if (candidateIds.some((id) => !allowed.has(id))) return ranked;
  return candidateIds.map((id) => allowed.get(id)!);
}

export function resolveProfileDomain(
  profile: OnboardingProfile,
): Domain | undefined {
  return resolveRegistryProfileDomain(profile);
}
