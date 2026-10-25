import type { ImageStrategy } from "@micirql/schema";
import type {
  IndustryPackRankedCandidate,
  IndustryPackRankingProfile,
} from "../runtime/types";
import {
  listPhysiotherapyDraftCandidates,
  type PhysiotherapyDraftCandidate,
} from "./physiotherapy-candidate-data";

/**
 * Extra factual inputs accepted by the draft scorer. They only affect
 * candidates whose composition explicitly depends on those facts; the scorer
 * never invents missing clinic information.
 */
export type PhysiotherapyDraftRankingProfile = IndustryPackRankingProfile & {
  location?: string | null;
  openingHours?: string | readonly string[] | null;
};

const RANKING_WEIGHTS = Object.freeze({
  physiotherapyFit: 15,
  patientJourneyFit: 25,
  visualDirection: 20,
  imageryFit: 10,
  densityFit: 10,
  evidenceReadiness: 20,
});

/**
 * Replays the archived staging scorer for regression evidence. The certified
 * runtime calls this deterministic scorer but owns registration, certification,
 * and release validation itself.
 */
export function rankPhysiotherapyDraftCandidates(
  profile: PhysiotherapyDraftRankingProfile,
): IndustryPackRankedCandidate<PhysiotherapyDraftCandidate>[] {
  const request = requestedLanguage(profile);
  const requestedDensity = inferDensity(request);
  const requestedImagery = inferImagery(request);

  return listPhysiotherapyDraftCandidates()
    .map((candidate) => {
      const physiotherapyFit = scorePhysiotherapyFit(profile);
      const patientJourneyFit = scorePatientJourney(candidate, profile);
      const visualDirection = scoreVisualDirection(candidate, profile);
      const imageryFit = scoreImagery(
        candidate.imageStrategy,
        requestedImagery,
      );
      const densityFit = scoreDensity(
        candidate.theme.brand.density,
        requestedDensity,
      );
      const evidenceReadiness = scoreEvidenceReadiness(candidate, profile);
      const breakdown = {
        physiotherapyFit,
        patientJourneyFit,
        visualDirection,
        imageryFit,
        densityFit,
        evidenceReadiness,
      };
      const score = round(
        Object.values(breakdown).reduce((total, value) => total + value, 0),
      );
      const reasons = [
        "Physiotherapy-specific page composition",
        patientJourneyFit >= 19
          ? "Strong assessment and appointment-request journey fit"
          : "Preserves a clear care-information journey",
        visualDirection >= 14
          ? "Matches the requested visual direction"
          : "Uses a compatible movement-care visual system",
        imageryFit === RANKING_WEIGHTS.imageryFit
          ? "Matches the requested image direction"
          : undefined,
        densityFit === RANKING_WEIGHTS.densityFit
          ? "Matches the requested information density"
          : undefined,
        candidate.requiredFacts.length > 0 &&
        evidenceReadiness === RANKING_WEIGHTS.evidenceReadiness
          ? "Uses supplied practical clinic facts"
          : undefined,
      ].filter((reason): reason is string => Boolean(reason));

      return { candidate, score, reasons, breakdown };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.rankSeed - right.candidate.rankSeed ||
        left.candidate.id.localeCompare(right.candidate.id),
    );
}

function scorePhysiotherapyFit(
  profile: PhysiotherapyDraftRankingProfile,
): number {
  const domain = norm(profile.domain);
  const industry = norm(profile.industry);
  const subindustry = norm(profile.subindustry);
  const hasExplicitIdentity = Boolean(domain || industry || subindustry);
  if (!hasExplicitIdentity) return 12;
  if (domain && domain !== "clinic") return 0;
  const suppliedIndustry = `${industry} ${subindustry}`.trim();
  if (
    suppliedIndustry &&
    !/physio|physical therap|rehabilitation/.test(suppliedIndustry)
  )
    return 3;
  return RANKING_WEIGHTS.physiotherapyFit;
}

function scorePatientJourney(
  candidate: PhysiotherapyDraftCandidate,
  profile: PhysiotherapyDraftRankingProfile,
): number {
  const requested = requestedLanguage(profile);
  const intents = {
    assessment: /assessment|what happens|process|journey|step|guided/.test(
      requested,
    ),
    practical:
      /access|arrival|first visit|location|opening|find|practical|parking/.test(
        requested,
      ),
    services: /service|treatment|care option|compare|condition|special/.test(
      requested,
    ),
    action: /appointment|request|enquir|contact|lead/.test(requested),
  };
  const activeIntentCount = Object.values(intents).filter(Boolean).length;
  if (!activeIntentCount) return 14;

  let score = 6;
  if (intents.assessment) score += earlyPositionScore(candidate, "process", 8);
  if (intents.practical)
    score += Math.max(
      earlyPositionScore(candidate, "contact", 6),
      earlyPositionScore(candidate, "features", 5),
    );
  if (intents.services) score += earlyPositionScore(candidate, "services", 6);
  if (intents.action)
    score += Math.max(
      earlyPositionScore(candidate, "contact", 6),
      earlyPositionScore(candidate, "cta", 5),
    );

  return clamp(round(score), 0, RANKING_WEIGHTS.patientJourneyFit);
}

function earlyPositionScore(
  candidate: PhysiotherapyDraftCandidate,
  family: "services" | "features" | "process" | "contact" | "cta",
  maximum: number,
): number {
  const index = candidate.homeFlow.indexOf(family);
  if (index < 0) return 0;
  return (
    maximum * ((candidate.homeFlow.length - index) / candidate.homeFlow.length)
  );
}

function scoreVisualDirection(
  candidate: PhysiotherapyDraftCandidate,
  profile: PhysiotherapyDraftRankingProfile,
): number {
  const requests = normalizedList(profile.style_tags ?? profile.styleTags);
  if (!requests.length) return 12;
  const candidateText = candidateLanguage(candidate);
  let score = 4;

  for (const request of requests) {
    if (candidateText.includes(request)) {
      score += 5;
      continue;
    }
    const tokens = meaningfulTokens(request);
    const matchingTokens = tokens.filter((token) =>
      candidateText.includes(token),
    );
    if (tokens.length > 0 && matchingTokens.length / tokens.length >= 0.5)
      score += 3;
  }

  return clamp(score, 0, RANKING_WEIGHTS.visualDirection);
}

function candidateLanguage(candidate: PhysiotherapyDraftCandidate): string {
  return [
    candidate.recipeId,
    candidate.name,
    candidate.description,
    candidate.theme.family,
    candidate.theme.brand.density,
    candidate.theme.brand.shape,
    candidate.theme.brand.motion,
    candidate.typographyStrategy,
    candidate.imageStrategy,
    ...candidate.styleTags,
    candidate.visualIdentity.visualThesis,
    candidate.visualIdentity.heroComposition,
    ...candidate.visualIdentity.surfaceLanguage,
    ...candidate.visualIdentity.signatureMotifs,
    candidate.navigationComposition,
    candidate.openingComposition,
    candidate.cardSystem,
    candidate.processVisualization,
    candidate.surfaceRhythm,
    candidate.conversionPattern,
    candidate.imageTreatment,
  ]
    .map(norm)
    .join(" ");
}

function scoreImagery(
  candidate: ImageStrategy,
  requested: ImageStrategy | undefined,
): number {
  if (!requested) return 7;
  if (candidate === requested) return RANKING_WEIGHTS.imageryFit;
  return relatedImagery(candidate, requested) ? 6 : 2;
}

function scoreDensity(
  candidate: "compact" | "comfortable" | "spacious",
  requested: "compact" | "comfortable" | "spacious" | undefined,
): number {
  if (!requested) return 7;
  if (candidate === requested) return RANKING_WEIGHTS.densityFit;
  if (
    (candidate === "comfortable" && requested !== "comfortable") ||
    (requested === "comfortable" && candidate !== "comfortable")
  )
    return 6;
  return 3;
}

function scoreEvidenceReadiness(
  candidate: PhysiotherapyDraftCandidate,
  profile: PhysiotherapyDraftRankingProfile,
): number {
  if (!candidate.requiredFacts.length) return 12;
  const notes = norm(profile.notes);
  const supplied = {
    location: Boolean(norm(profile.location) || /\b(?:location|address|area):/.test(notes)),
    "opening-hours": Array.isArray(profile.openingHours)
      ? profile.openingHours.some((value) => Boolean(norm(value)))
      : Boolean(
          norm(profile.openingHours) ||
            /\b(?:approved\s+)?opening\s+hours?:/.test(notes),
        ),
  };
  const suppliedCount = candidate.requiredFacts.filter(
    (fact) => supplied[fact],
  ).length;
  if (suppliedCount === candidate.requiredFacts.length)
    return RANKING_WEIGHTS.evidenceReadiness;
  if (suppliedCount > 0) return 10;
  return 3;
}

function requestedLanguage(profile: PhysiotherapyDraftRankingProfile): string {
  return [
    ...normalizedList(profile.goals),
    ...normalizedList(
      profile.required_capabilities ?? profile.requiredCapabilities,
    ),
    ...normalizedList(profile.services),
    ...normalizedList(profile.style_tags ?? profile.styleTags),
    norm(profile.notes),
  ]
    .filter(Boolean)
    .join(" ");
}

function inferDensity(
  requested: string,
): "compact" | "comfortable" | "spacious" | undefined {
  if (/\b(compact|dense|efficient|information-rich|utility)\b/.test(requested))
    return "compact";
  if (/\b(spacious|airy|open|minimal|quiet|luxury|calm)\b/.test(requested))
    return "spacious";
  if (/\b(comfortable|balanced|friendly|approachable)\b/.test(requested))
    return "comfortable";
  return undefined;
}

function inferImagery(requested: string): ImageStrategy | undefined {
  if (/\b(people-led|human|people|patient|guided movement)\b/.test(requested))
    return "people-led";
  if (/\b(documentary|authentic|local|natural)\b/.test(requested))
    return "documentary";
  if (/\b(immersive|cinematic|panoramic|large image)\b/.test(requested))
    return "immersive";
  if (/\b(editorial|magazine|art-directed)\b/.test(requested))
    return "editorial-crop";
  if (/\b(equipment|detail|technical|clinical detail)\b/.test(requested))
    return "product-detail";
  if (/\b(restrained|minimal imagery|quiet image)\b/.test(requested))
    return "restrained";
  return undefined;
}

function relatedImagery(left: ImageStrategy, right: ImageStrategy): boolean {
  const groups: readonly (readonly ImageStrategy[])[] = [
    ["people-led", "documentary"],
    ["immersive", "editorial-crop"],
    ["product-detail", "restrained"],
  ];
  return groups.some((group) => group.includes(left) && group.includes(right));
}

function meaningfulTokens(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !["with", "from"].includes(token));
}

function normalizedList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(norm).filter(Boolean) : [];
}

function norm(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
