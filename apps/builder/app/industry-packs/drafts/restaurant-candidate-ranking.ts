import type { ImageStrategy } from "@micirql/schema";
import type {
  IndustryPackRankedCandidate,
  IndustryPackRankingProfile,
} from "../runtime/types";
import {
  listRestaurantDraftCandidates,
  type RestaurantDraftCandidate,
} from "./restaurant-candidate-data";
import type {
  RestaurantDraftBrief,
  SuppliedCurrentRestaurantMenu,
} from "./restaurant-scaffold";

/**
 * Factual Restaurant inputs used by the draft scorer. Evidence-dependent
 * directions are scored only from these typed fields; free-text notes can
 * express intent or style, but can never prove that a merchant fact exists.
 */
export type RestaurantDraftRankingProfile = IndustryPackRankingProfile & {
  cuisines?: readonly string[] | null;
  serviceModes?: readonly string[] | null;
  menu?: SuppliedCurrentRestaurantMenu | null;
  address?: string | null;
  mapUrl?: string | null;
  reservationPolicy?: readonly string[] | null;
  partyDetails?: readonly string[] | null;
  specialRequestNotes?: readonly string[] | null;
  story?: RestaurantDraftBrief["story"];
};

const RANKING_WEIGHTS = Object.freeze({
  restaurantFit: 15,
  guestJourneyFit: 25,
  serviceOfferFit: 10,
  visualDirection: 15,
  imageryFit: 10,
  densityFit: 5,
  evidenceReadiness: 20,
});

/**
 * Ranks every unregistered Restaurant candidate by fit to the supplied brief.
 * This is not a quality or certification score: every returned candidate
 * remains draft-only, including candidates whose required facts are absent.
 */
export function rankRestaurantDraftCandidates(
  profile: RestaurantDraftRankingProfile,
): IndustryPackRankedCandidate<RestaurantDraftCandidate>[] {
  const requested = requestedLanguage(profile);
  const requestedDensity = inferDensity(requested);
  const requestedImagery = inferImagery(requested);
  const suppliedFacts = suppliedFactSet(profile);

  return listRestaurantDraftCandidates()
    .map((candidate) => {
      const unmetRequiredFacts = candidate.requiredFacts.filter(
        (fact) => !suppliedFacts.has(fact),
      );
      const restaurantFit = scoreRestaurantFit(profile);
      const guestJourneyFit = scoreGuestJourney(candidate, requested);
      const serviceOfferFit = scoreServiceOffer(candidate, profile);
      const visualDirection = scoreVisualDirection(candidate, profile);
      const imageryFit = scoreImagery(
        candidate.imageStrategy,
        requestedImagery,
      );
      const densityFit = scoreDensity(
        candidate.theme.brand.density,
        requestedDensity,
      );
      const evidenceReadiness = scoreEvidenceReadiness(
        candidate,
        suppliedFacts,
      );
      const breakdown = {
        restaurantFit,
        guestJourneyFit,
        serviceOfferFit,
        visualDirection,
        imageryFit,
        densityFit,
        evidenceReadiness,
      };
      const score = round(
        Object.values(breakdown).reduce((total, value) => total + value, 0),
      );
      const reasons = [
        "Restaurant-specific six-route composition",
        guestJourneyFit >= 19
          ? "Strong fit for the requested guest journey"
          : "Preserves a clear menu, visit and table-request journey",
        serviceOfferFit >= 8
          ? requestsMultilingualStructure(profile) &&
            candidate.recipeId === "dual-script"
            ? "Matches the requested multilingual structure"
            : "Matches the supplied service or dining format"
          : undefined,
        visualDirection >= 11
          ? "Matches the requested visual direction"
          : "Uses a compatible Restaurant visual system",
        imageryFit === RANKING_WEIGHTS.imageryFit
          ? "Matches the requested image direction"
          : undefined,
        densityFit === RANKING_WEIGHTS.densityFit
          ? "Matches the requested information density"
          : undefined,
        unmetRequiredFacts.length === 0
          ? `Uses supplied factual inputs: ${candidate.requiredFacts.join(", ")}`
          : `Needs supplied facts before this direction is eligible: ${unmetRequiredFacts.join(", ")}`,
      ].filter((reason): reason is string => Boolean(reason));

      return {
        ranked: { candidate, score, reasons, breakdown },
        unmetRequiredFactCount: unmetRequiredFacts.length,
      };
    })
    .sort(
      (left, right) =>
        right.ranked.score - left.ranked.score ||
        left.unmetRequiredFactCount - right.unmetRequiredFactCount ||
        left.ranked.candidate.rankSeed - right.ranked.candidate.rankSeed ||
        left.ranked.candidate.id.localeCompare(right.ranked.candidate.id),
    )
    .map(({ ranked }) => ranked);
}

function scoreRestaurantFit(profile: RestaurantDraftRankingProfile): number {
  const domain = norm(profile.domain);
  const industry = norm(profile.industry);
  const subindustry = norm(profile.subindustry);
  const hasExplicitIdentity = Boolean(domain || industry || subindustry);
  if (!hasExplicitIdentity) return 12;
  if (domain && domain !== "restaurant") return 0;

  const suppliedIndustry = `${industry} ${subindustry}`.trim();
  if (
    suppliedIndustry &&
    !/restaurant|dining|bistro|brasserie|eatery|caf[eé]|food service/.test(
      suppliedIndustry,
    )
  ) {
    return 3;
  }
  return RANKING_WEIGHTS.restaurantFit;
}

function scoreGuestJourney(
  candidate: RestaurantDraftCandidate,
  requested: string,
): number {
  const intents = [
    {
      active: /menu|dish|food|price|category|ingredient|compare/.test(
        requested,
      ),
      score: Math.max(
        earlyPositionScore(candidate, "services", 10),
        earlyPositionScore(candidate, "gallery", 7),
      ),
    },
    {
      active:
        /visit|location|address|hours|arrival|direction|parking|access|transit|local|find/.test(
          requested,
        ),
      score: Math.max(
        earlyPositionScore(candidate, "features", 10),
        earlyPositionScore(candidate, "gallery", 8),
        earlyPositionScore(candidate, "contact", 7),
      ),
    },
    {
      active:
        /reservation|table request|request a table|party|group|banquet|occasion|private dining/.test(
          requested,
        ),
      score: Math.max(
        earlyPositionScore(candidate, "contact", 10),
        earlyPositionScore(candidate, "cta", 7),
      ),
    },
    {
      active:
        /story|approach|heritage|origin|chef|host|kitchen|seasonal|process|sourcing/.test(
          requested,
        ),
      score: Math.max(
        earlyPositionScore(candidate, "about", 10),
        earlyPositionScore(candidate, "gallery", 7),
      ),
    },
    {
      active:
        /atmosphere|ambience|space|venue|room|cinematic|quiet|premium|celebration/.test(
          requested,
        ),
      score: Math.max(
        earlyPositionScore(candidate, "gallery", 10),
        earlyPositionScore(candidate, "about", 7),
        earlyPositionScore(candidate, "features", 6),
      ),
    },
  ].filter(({ active }) => active);

  if (!intents.length) return 14;
  const meanFit =
    intents.reduce((total, intent) => total + intent.score, 0) / intents.length;
  return clamp(round(5 + meanFit * 2), 0, RANKING_WEIGHTS.guestJourneyFit);
}

function earlyPositionScore(
  candidate: RestaurantDraftCandidate,
  family: "gallery" | "services" | "about" | "features" | "contact" | "cta",
  maximum: number,
): number {
  const index = candidate.homeFlow.indexOf(family);
  if (index < 0) return 0;
  return (
    maximum * ((candidate.homeFlow.length - index) / candidate.homeFlow.length)
  );
}

function scoreServiceOffer(
  candidate: RestaurantDraftCandidate,
  profile: RestaurantDraftRankingProfile,
): number {
  const requested = [
    ...normalizedList(profile.serviceModes),
    ...normalizedList(profile.services),
    ...normalizedList(profile.goals),
  ].join(" ");
  const candidateText = candidateLanguage(candidate);
  const affinities = [
    {
      requested: /private dining|group|banquet|event|party|occasion/.test(
        requested,
      ),
      matches: /banquet|group|party|concierge|family|shared-table/.test(
        candidateText,
      ),
    },
    {
      requested: /takeaway|take-out|counter|quick|caf[eé]|casual/.test(
        requested,
      ),
      matches: /counter|market|poster|compact|utility|ledger/.test(
        candidateText,
      ),
    },
    {
      requested: /tasting|fine dining|premium|chef-led/.test(requested),
      matches: /tasting|linen|night|sequence|luxury|refined/.test(
        candidateText,
      ),
    },
    {
      requested: /outdoor|terrace|courtyard|garden|open-air/.test(requested),
      matches: /terrace|courtyard|garden|open-space|open-frame/.test(
        candidateText,
      ),
    },
    {
      requested: /family|children|kids/.test(requested),
      matches: /family|friendly|group|shared-table/.test(candidateText),
    },
    {
      requested: requestsMultilingualStructure(profile),
      matches: candidate.recipeId === "dual-script",
    },
  ].filter(({ requested: active }) => active);

  if (!affinities.length) return 6;
  const matches = affinities.filter((affinity) => affinity.matches).length;
  return round(2 + (matches / affinities.length) * 8);
}

function scoreVisualDirection(
  candidate: RestaurantDraftCandidate,
  profile: RestaurantDraftRankingProfile,
): number {
  const requests = mergedNormalizedLists(profile.style_tags, profile.styleTags);
  if (!requests.length) return 9;
  const candidateText = candidateLanguage(candidate);
  let score = 3;

  for (const request of requests) {
    if (candidateText.includes(request)) {
      score += 4;
      continue;
    }
    const tokens = meaningfulTokens(request);
    const matchingTokens = tokens.filter((token) =>
      candidateText.includes(token),
    );
    if (tokens.length > 0 && matchingTokens.length / tokens.length >= 0.5) {
      score += 2;
    }
  }

  return clamp(score, 0, RANKING_WEIGHTS.visualDirection);
}

function candidateLanguage(candidate: RestaurantDraftCandidate): string {
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
    candidate.menuComposition,
    candidate.venueProofModel,
    candidate.reservationPresentation,
    candidate.surfaceRhythm,
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
  if (!requested) return 3;
  if (candidate === requested) return RANKING_WEIGHTS.densityFit;
  if (
    (candidate === "comfortable" && requested !== "comfortable") ||
    (requested === "comfortable" && candidate !== "comfortable")
  ) {
    return 3;
  }
  return 1;
}

function scoreEvidenceReadiness(
  candidate: RestaurantDraftCandidate,
  suppliedFacts: ReadonlySet<RestaurantDraftCandidate["requiredFacts"][number]>,
): number {
  if (!candidate.requiredFacts.length) return 12;
  const suppliedCount = candidate.requiredFacts.filter((fact) =>
    suppliedFacts.has(fact),
  ).length;
  if (suppliedCount === candidate.requiredFacts.length) {
    return RANKING_WEIGHTS.evidenceReadiness;
  }
  if (suppliedCount === 0) return 0;
  return round(4 + 8 * (suppliedCount / candidate.requiredFacts.length));
}

function suppliedFactSet(
  profile: RestaurantDraftRankingProfile,
): Set<RestaurantDraftCandidate["requiredFacts"][number]> {
  const facts = new Set<RestaurantDraftCandidate["requiredFacts"][number]>();
  if (norm(profile.location) || norm(profile.address)) facts.add("location");
  if (hasOpeningHours(profile.openingHours)) facts.add("opening-hours");
  if (hasCompleteCurrentMenu(profile.menu)) facts.add("menu");
  if (normalizedList(profile.reservationPolicy).length) {
    facts.add("reservation-policy");
  }
  if (profile.story && normalizedList(profile.story.paragraphs).length > 0) {
    facts.add("story");
  }
  return facts;
}

function hasOpeningHours(value: unknown): boolean {
  return Array.isArray(value)
    ? value.some((entry) => Boolean(norm(entry)))
    : Boolean(norm(value));
}

function hasCompleteCurrentMenu(
  menu: SuppliedCurrentRestaurantMenu | null | undefined,
): boolean {
  if (
    !menu ||
    menu.suppliedAsCurrent !== true ||
    menu.categories.length === 0
  ) {
    return false;
  }
  const items = menu.categories.flatMap((category) => category.items);
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        Boolean(norm(item.name)) &&
        Boolean(norm(item.price)) &&
        Boolean(norm(item.currency)),
    )
  );
}

function requestedLanguage(profile: RestaurantDraftRankingProfile): string {
  return [
    ...normalizedList(profile.goals),
    ...mergedNormalizedLists(
      profile.required_capabilities,
      profile.requiredCapabilities,
    ),
    ...normalizedList(profile.services),
    ...mergedNormalizedLists(profile.style_tags, profile.styleTags),
    ...normalizedList(profile.serviceModes),
    ...normalizedList(profile.cuisines),
    ...normalizedList(profile.partyDetails),
    ...normalizedList(profile.specialRequestNotes),
    norm(profile.notes),
  ]
    .filter(Boolean)
    .join(" ");
}

function inferDensity(
  requested: string,
): "compact" | "comfortable" | "spacious" | undefined {
  if (
    /\b(compact|dense|efficient|information-rich|utility|quick)\b/.test(
      requested,
    )
  ) {
    return "compact";
  }
  if (
    /\b(spacious|airy|open|minimal|quiet|luxury|premium|calm)\b/.test(requested)
  ) {
    return "spacious";
  }
  if (
    /\b(comfortable|balanced|friendly|approachable|warm|family)\b/.test(
      requested,
    )
  ) {
    return "comfortable";
  }
  return undefined;
}

function inferImagery(requested: string): ImageStrategy | undefined {
  if (
    /\b(people-led|human|people|host|family|shared table)\b/.test(requested)
  ) {
    return "people-led";
  }
  if (
    /\b(documentary|authentic|local|natural|arrival|place)\b/.test(requested)
  ) {
    return "documentary";
  }
  if (
    /\b(immersive|cinematic|panoramic|full-bleed|atmosphere|bold)\b/.test(
      requested,
    )
  ) {
    return "immersive";
  }
  if (/\b(editorial|magazine|art-directed|poster)\b/.test(requested)) {
    return "editorial-crop";
  }
  if (
    /\b(ingredient|dish detail|food detail|technical|product-detail)\b/.test(
      requested,
    )
  ) {
    return "product-detail";
  }
  if (/\b(restrained|minimal imagery|quiet image|refined)\b/.test(requested)) {
    return "restrained";
  }
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

/**
 * Both field spellings are accepted at API/runtime boundaries. Merge rather
 * than prefer one spelling so an explicitly empty legacy field cannot hide a
 * populated modern field, and dedupe normalized values so repeated tags do
 * not multiply a candidate's score.
 */
function mergedNormalizedLists(...values: readonly unknown[]): string[] {
  return [...new Set(values.flatMap((value) => normalizedList(value)))];
}

function requestsMultilingualStructure(
  profile: RestaurantDraftRankingProfile,
): boolean {
  const capabilities = mergedNormalizedLists(
    profile.required_capabilities,
    profile.requiredCapabilities,
  );
  const languages = mergedNormalizedLists(profile.languages);
  return (
    languages.length > 1 ||
    capabilities.some((capability) =>
      /\b(multilingual|bilingual|multiple languages?|translation|translated|localization|localisation)\b/.test(
        capability,
      ),
    )
  );
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
