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

export async function resolvePearlHeroMedia(direction: ArtDirection): Promise<MediaCandidate | undefined> {
  if (!process.env.PEXELS_API_KEY?.trim()) return undefined;

  try {
    const result = await resolveSectionMedia(
      {
        industry: "healthcare",
        subIndustry: "dental",
        businessType: "dental-clinic",
        sectionId: `pearl-${direction.id}-hero`,
        sectionFamily: "hero",
        artDirection: direction.visualStyle,
        desiredAspect: direction.layout.heroArchitecture.toLowerCase().includes("split") ? "4:5" : "16:9",
        visualGoal: `${direction.mood.join(" ")} calm professional dental care environment without identifiable clinicians or claims`,
      },
      {
        ai: deterministicIntentProvider,
        media: createPexelsProvider(),
      },
    );

    return result.candidates[0];
  } catch (error) {
    console.warn("Pearl hero media resolution failed; rendering without stock media.", error);
    return undefined;
  }
}
