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

const PHOTO_LANGUAGE: Record<string, string> = {
  editorial: "editorial natural light refined composition tactile materials subtle asymmetry",
  cinematic: "cinematic dramatic directional light deep shadows immersive wide composition atmospheric",
  "quiet-luxury": "quiet luxury soft daylight neutral stone linen glass minimal serene architectural detail",
  "warm-modern": "warm modern natural daylight welcoming timber beige soft human-centered interior detail",
  "typography-led": "graphic minimal negative space bold geometry restrained background detail",
  "conversion-focused": "bright clear approachable clean modern practical welcoming environment",
  "gallery-led": "art directed varied crops visual storytelling texture detail wide and close-up photography",
  "immersive-dark": "moody low-key cinematic lighting dark premium interior detail dramatic contrast",
  "framed-minimal": "minimal architectural framing clean lines negative space precise quiet composition",
  "soft-editorial": "soft editorial diffuse daylight gentle tones tactile close-up detail calm asymmetry",
  "clinical-refined": "refined clinical precision bright soft white light glass metal clean geometry hygienic detail",
  "human-narrative": "documentary warmth candid hands environment human-scale detail natural light no identifiable faces",
  "modern-heritage": "timeless elegant warm neutral materials classic proportion crafted detail soft directional light",
  "bold-contrast": "high contrast graphic composition strong light shadow bold geometry striking crop",
  "calm-monochrome": "monochrome restrained neutral tonal photography soft shadows minimal quiet detail",
  "precision-grid": "precise modular geometry straight-on architectural detail ordered clinical composition",
  "organic-premium": "organic premium daylight natural materials soft curves greenery stone wood serene composition",
  "statement-first": "single striking subject strong negative space poster-like crop minimal visual noise",
  "layered-depth": "layered foreground background depth shallow focus reflective surfaces dimensional composition",
  "direct-modern": "crisp contemporary bright clean direct composition practical modern detail",
};

const SUBJECT_ANCHOR: Record<"hero" | "services" | "about", string> = {
  hero: "modern dental clinic treatment room dental chair dental equipment",
  services: "dental clinic treatment room dental instruments oral care equipment",
  about: "modern dental clinic interior reception treatment room dental environment",
};

function photoLanguage(direction: ArtDirection) {
  return PHOTO_LANGUAGE[direction.visualStyle] ?? "premium authentic natural light professional composition";
}

async function resolvePearlSectionMedia(
  direction: ArtDirection,
  options: {
    family: "hero" | "services" | "about";
    sectionId: string;
    desiredAspect: string;
    visualGoal: string;
    count?: number;
    excludedProviderIds?: string[];
  },
): Promise<MediaCandidate[]> {
  if (!process.env.PEXELS_API_KEY?.trim()) return [];

  const exclusions = [...new Set(options.excludedProviderIds ?? [])].sort();
  const directedGoal = `${SUBJECT_ANCHOR[options.family]} ${photoLanguage(direction)} ${options.visualGoal}`;
  const key = [direction.id, options.family, options.sectionId, options.desiredAspect, directedGoal, options.count ?? 1, exclusions.join(",")].join("|");
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
          visualGoal: directedGoal,
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
    desiredAspect: direction.layout.heroArchitecture.toLowerCase().includes("split") ? "4:5" : "16:9",
    visualGoal: "professional environment without identifiable clinicians, procedures, branding or outcome claims",
  });
  return media[0];
}

export async function resolvePearlServiceMedia(direction: ArtDirection, excludedProviderIds: string[] = []): Promise<MediaCandidate[]> {
  return resolvePearlSectionMedia(direction, {
    family: "services",
    sectionId: `pearl-${direction.id}-services`,
    desiredAspect: "16:9",
    visualGoal: "clean patient-friendly details without procedures, identifiable clinicians or outcome claims",
    count: 3,
    excludedProviderIds,
  });
}

export async function resolvePearlAboutMedia(direction: ArtDirection, excludedProviderIds: string[] = []): Promise<MediaCandidate | undefined> {
  const media = await resolvePearlSectionMedia(direction, {
    family: "about",
    sectionId: `pearl-${direction.id}-about`,
    desiredAspect: "4:5",
    visualGoal: "welcoming atmosphere without identifiable clinicians, credentials, branding or claims",
    excludedProviderIds,
  });
  return media[0];
}
