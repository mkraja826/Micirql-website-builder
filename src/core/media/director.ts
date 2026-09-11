import type { AiJsonProvider } from "../../providers/ai/schema";
import type { MediaCandidate, MediaProvider, MediaSearchIntent } from "../../providers/media/schema";

export type SectionMediaContext = {
  industry: string;
  subIndustry?: string;
  businessType?: string;
  sectionId: string;
  sectionFamily: string;
  artDirection: string;
  desiredAspect?: string;
  businessFacts?: Record<string, string>;
  visualGoal: string;
  excludedProviderIds?: string[];
};

export type ResolvedSectionMedia = {
  intent: MediaSearchIntent;
  candidates: MediaCandidate[];
};

type AiImageIntent = {
  query?: string;
  preferredTags?: string[];
};

export async function resolveSectionMedia(
  context: SectionMediaContext,
  providers: { ai: AiJsonProvider; media: MediaProvider },
): Promise<ResolvedSectionMedia> {
  const aiResult = await providers.ai.generateJson<AiImageIntent>({
    system: [
      "You are MiCirql's image-intent director.",
      "Translate website section context into a concise stock-photography search query and up to six useful visual tags.",
      "Do not invent people, facilities, awards, equipment, locations, outcomes, credentials, or other business-specific facts.",
      "Prefer visual concepts that are safe to depict generically for the industry.",
      "Do not output layout, JSX, CSS, colors, typography, or component instructions.",
      "Return JSON with only: query, preferredTags.",
    ].join(" "),
    input: context,
    temperature: 0.2,
    maxOutputTokens: 400,
  });

  const query = cleanQuery(aiResult.value?.query) || fallbackQuery(context);
  const preferredTags = Array.isArray(aiResult.value?.preferredTags)
    ? aiResult.value.preferredTags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 6)
    : [];

  const intent: MediaSearchIntent = {
    query,
    sectionFamily: context.sectionFamily,
    industry: context.industry,
    desiredAspect: context.desiredAspect,
    preferredTags: [context.artDirection, ...preferredTags],
    excludedProviderIds: context.excludedProviderIds,
  };

  return { intent, candidates: await providers.media.search(intent) };
}

function cleanQuery(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-z0-9\s-]/gi, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

function fallbackQuery(context: SectionMediaContext) {
  return [context.industry, context.subIndustry, context.sectionFamily, context.visualGoal]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}
