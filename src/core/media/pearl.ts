import type { AiJsonProvider } from "../../providers/ai/schema";
import { createPexelsProvider } from "../../providers/media/pexels";
import type { MediaCandidate } from "../../providers/media/schema";
import type { ArtDirection } from "../art-direction/schema";
import { resolveSectionMedia } from "./director";

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
    family: "hero" | "services" | "about";
    sectionId: string;
    desiredAspect: string;
    visualGoal: string;
    count?: number;
  },
): Promise<MediaCandidate[]> {
  if (!process.env.PEXELS_API_KEY?.trim()) return [];

  const key = [direction.id, options.family, options.sectionId, options.desiredAspect, options.visualGoal, options.count ?? 1].join("|");
  const cached = mediaCache.get(key);
  if (cached) return cached;

  const pending = (async () => {
    try {
      const result = await resolveSectionMedia(
        {
          industry: "healthcare",
          subIndustry: "dental",
          businessType: "dental-clinic",
          sectionId: options.sectionId,
          sectionFamily: options.family,
          artDirection: direction.visualStyle,
          desiredAspect: options.desiredAspect,
          visualGoal: options.visualGoal,
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
    desiredAspect: direction.layout.heroArchitecture.toLowerCase().includes("split") ? "4:5" : "16:9",
    visualGoal: `${direction.mood.join(" ")} calm professional dental care environment without identifiable clinicians or claims`,
  });
  return media[0];
}

export async function resolvePearlServiceMedia(direction: ArtDirection): Promise<MediaCandidate[]> {
  return resolvePearlSectionMedia(direction, {
    family: "services",
    sectionId: `pearl-${direction.id}-services`,
    desiredAspect: "16:9",
    visualGoal: `${direction.mood.join(" ")} clean dental care details, oral health environment and patient-friendly clinical objects without procedures, identifiable clinicians or outcome claims`,
    count: 3,
  });
}

export async function resolvePearlAboutMedia(direction: ArtDirection): Promise<MediaCandidate | undefined> {
  const media = await resolvePearlSectionMedia(direction, {
    family: "about",
    sectionId: `pearl-${direction.id}-about`,
    desiredAspect: "4:5",
    visualGoal: `${direction.mood.join(" ")} calm welcoming dental clinic atmosphere or abstract care detail without identifiable clinicians, credentials or claims`,
  });
  return media[0];
}
