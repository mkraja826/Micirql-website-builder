import type { AiJsonProvider } from "../providers/ai/schema";
import { createPexelsProvider } from "../providers/media/pexels";
import type { MediaCandidate } from "../providers/media/schema";
import type { ArtDirection } from "../core/art-direction/schema";
import { resolveSectionMedia } from "../core/media/director";
import { mediaIntent, planMedia, type MediaRole } from "../core/media/planner";
import { createPearlDentalBrief, PEARL_DENTAL_KNOWLEDGE } from "./pearl";

const deterministicIntentProvider: AiJsonProvider = {
  id: "deterministic-media-intent",
  async generateJson<T>() {
    return {
      provider: "deterministic-media-intent",
      model: "fallback-query",
      value: {} as T,
    };
  },
};

const mediaCache = new Map<string, Promise<MediaCandidate[]>>();

async function resolvePearlSectionMedia(
  direction: ArtDirection,
  options: {
    family: Extract<MediaRole, "hero" | "services" | "about">;
    sectionId: string;
    count?: number;
    excludedProviderIds?: string[];
  },
): Promise<MediaCandidate[]> {
  if (!process.env.PEXELS_API_KEY?.trim()) return [];

  const brief = createPearlDentalBrief();
  const plan = planMedia({
    brief,
    knowledge: PEARL_DENTAL_KNOWLEDGE,
    direction,
    roles: [options.family],
  });
  const intentPlan = mediaIntent(plan, options.family);
  if (!intentPlan) return [];

  const exclusions = [...new Set(options.excludedProviderIds ?? [])].sort();
  const key = [
    direction.id,
    options.family,
    options.sectionId,
    intentPlan.desiredAspect,
    intentPlan.subject,
    intentPlan.visualGoal,
    intentPlan.preferredTags.join(","),
    options.count ?? 1,
    exclusions.join(","),
  ].join("|");
  const cached = mediaCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const result = await resolveSectionMedia(
        {
          industry: plan.industry,
          subIndustry: plan.subIndustry,
          businessType: plan.businessType,
          sectionId: options.sectionId,
          sectionFamily: options.family,
          artDirection: direction.visualStyle,
          desiredAspect: intentPlan.desiredAspect,
          businessFacts: Object.fromEntries(
            Object.entries(brief.truth.knownFacts)
              .filter((entry): entry is [string, string] => typeof entry[1] === "string")
          ),
          visualGoal: `${intentPlan.subject} ${intentPlan.visualGoal} ${intentPlan.preferredTags.join(" ")} avoid ${intentPlan.exclusions.join(", ")}`,
          excludedProviderIds: exclusions,
        },
        {
          ai: deterministicIntentProvider,
          media: createPexelsProvider(),
        },
      );
      return result.candidates.slice(0, options.count ?? 1);
    } catch (error) {
      console.warn(`Pearl ${options.family} media resolution failed; rendering without stock media.`, error);
      return [];
    }
  })();

  mediaCache.set(key, pending);
  return pending;
}

export async function resolvePearlHeroMedia(direction: ArtDirection): Promise<MediaCandidate | undefined> {
  const media = await resolvePearlSectionMedia(direction, {
    family: "hero",
    sectionId: `pearl-${direction.id}-hero`,
  });
  return media[0];
}

export async function resolvePearlServiceMedia(direction: ArtDirection, excludedProviderIds: string[] = []): Promise<MediaCandidate[]> {
  return resolvePearlSectionMedia(direction, {
    family: "services",
    sectionId: `pearl-${direction.id}-services`,
    count: 3,
    excludedProviderIds,
  });
}

export async function resolvePearlAboutMedia(direction: ArtDirection, excludedProviderIds: string[] = []): Promise<MediaCandidate | undefined> {
  const media = await resolvePearlSectionMedia(direction, {
    family: "about",
    sectionId: `pearl-${direction.id}-about`,
    excludedProviderIds,
  });
  return media[0];
}
