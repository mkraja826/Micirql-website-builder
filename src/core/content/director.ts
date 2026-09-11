import type { InterpretedBrief } from "../brief/schema";
import type { IndustryKnowledge } from "../industry/knowledge";
import type { ArtDirection } from "../art-direction/schema";
import type { AiJsonProvider } from "../../providers/ai/schema";
import type { ContentPlan, ModelContentPlan } from "./schema";
import { validateContentTruth } from "./safety";

function businessLabel(brief: InterpretedBrief) {
  return brief.business.name?.value ?? "This business";
}

function fallbackVoice(direction?: ArtDirection) {
  if (!direction) return { hero: "presented with clarity", cta: "Take the next step when you are ready", tone: "clear and useful" };
  const voices: Record<string, { hero: string; cta: string; tone: string }> = {
    cinematic: { hero: "with a calmer, more immersive beginning", cta: "Begin with the question that matters", tone: "calm, spacious and cinematic" },
    "quiet-luxury": { hero: "with considered restraint", cta: "Begin simply, when you are ready", tone: "restrained, refined and concise" },
    "warm-modern": { hero: "with a warmer, more approachable first step", cta: "Start a straightforward conversation", tone: "warm, human and practical" },
    "typography-led": { hero: "with a direct point of view", cta: "Start with the question", tone: "bold, concise and statement-led" },
    "conversion-focused": { hero: "with a clear route to action", cta: "Choose the next step", tone: "direct, scannable and action-oriented" },
    "gallery-led": { hero: "through visual storytelling", cta: "Continue from what caught your attention", tone: "visual, descriptive and story-led" },
    "immersive-dark": { hero: "with focused, high-contrast clarity", cta: "Move from uncertainty to a clear question", tone: "focused, atmospheric and concise" },
    "clinical-refined": { hero: "with precise, structured information", cta: "Turn the care area into a focused enquiry", tone: "precise, measured and structured" },
    "human-narrative": { hero: "through the questions people actually bring", cta: "Tell us what brings you here", tone: "human, conversational and empathetic" },
    "organic-premium": { hero: "with a softer, unhurried rhythm", cta: "Continue when the next step feels clear", tone: "calm, natural and spacious" },
    "statement-first": { hero: "with one clear idea first", cta: "Ask the question", tone: "short, assertive and memorable" },
    "precision-grid": { hero: "with structured, fast-scanning clarity", cta: "Select the category and continue", tone: "ordered, concise and systematic" },
    "direct-modern": { hero: "with a straightforward route forward", cta: "Send the enquiry and keep moving", tone: "direct, modern and efficient" },
  };
  return voices[direction.visualStyle] ?? { hero: "with clear editorial structure", cta: "Take the next step with clarity", tone: "clear, premium and grounded" };
}

function safeFallback(brief: InterpretedBrief, knowledge: IndustryKnowledge, artDirection?: ArtDirection): ContentPlan {
  const name = businessLabel(brief);
  const industryName = knowledge.subIndustry?.name ?? knowledge.industry.name;
  const voice = fallbackVoice(artDirection);
  const pages = brief.website.recommendedPages.value.length
    ? brief.website.recommendedPages.value
    : knowledge.recommendedPages;
  const sectionTypes = brief.website.requiredSectionTypes.value.length
    ? brief.website.requiredSectionTypes.value
    : knowledge.requiredSectionTypes;

  return {
    version: "1.0",
    pages: pages.map((slug) => ({
      slug,
      title: slug === "home" ? name : `${slug.replace(/-/g, " ")} · ${name}`,
      purpose: knowledge.contentPriorities[0] ?? `Explain ${industryName} clearly and help visitors take the next step.`,
      sections: sectionTypes.map((sectionType) => ({
        sectionType,
        headline:
          sectionType === "hero"
            ? `${name}, ${voice.hero}.`
            : sectionType === "cta"
              ? `${voice.cta}.`
              : sectionType === "contact"
                ? "Start a conversation."
                : sectionType.replace(/-/g, " "),
        body:
          sectionType === "hero"
            ? `A ${voice.tone} introduction shaped for ${industryName.toLowerCase()} visitors without making unverified business claims.`
            : undefined,
        primaryCta: sectionType === "hero" || sectionType === "cta"
          ? { label: "Get in touch", action: "contact" }
          : undefined,
        imageIntent: sectionType === "hero" ? knowledge.imageryGuidance[0] : undefined,
        claims: [],
      })),
    })),
    seo: {
      title: brief.business.location?.value ? `${name} · ${brief.business.location.value}` : name,
      description: `Learn about ${name} and explore relevant ${industryName.toLowerCase()} information and ways to get in touch.`,
    },
    imageIntents: knowledge.imageryGuidance,
    warnings: [
      "Deterministic safe fallback used; business-specific claims were intentionally omitted.",
      ...brief.truth.unknownFacts.map((fact) => `Unknown: ${fact}`),
    ],
  };
}

function promptInput(brief: InterpretedBrief, knowledge: IndustryKnowledge, artDirection?: ArtDirection) {
  return {
    business: brief.business,
    positioning: brief.positioning,
    website: brief.website,
    artDirection: artDirection ? {
      label: artDirection.label,
      visualStyle: artDirection.visualStyle,
      mood: artDirection.mood,
      typography: artDirection.typography,
      layout: artDirection.layout,
      sectionIntent: artDirection.sectionIntent,
      conversionStrategy: artDirection.conversionStrategy,
      avoid: artDirection.avoid,
    } : undefined,
    truth: {
      knownFacts: brief.truth.knownFacts,
      inferredContext: brief.truth.inferredContext,
      unknownFacts: brief.truth.unknownFacts,
      prohibitedClaims: brief.truth.prohibitedClaims,
    },
    industryKnowledge: {
      industry: knowledge.industry,
      subIndustry: knowledge.subIndustry,
      contentPriorities: knowledge.contentPriorities,
      imageryGuidance: knowledge.imageryGuidance,
      conversionActions: knowledge.conversionActions,
      prohibitedAssumptions: knowledge.prohibitedAssumptions,
    },
  };
}

const SYSTEM_PROMPT = `You are MiCirql Content Director V1.
Return JSON only and match the requested ContentPlan shape.
Write useful, concise website content from the interpreted brief, art direction and industry knowledge.
The art direction changes narrative emphasis, pacing, headline style, section voice and CTA phrasing; it never authorizes new factual claims.
Make candidates meaningfully different in messaging and rhythm when their art directions differ, while preserving the same factual truth boundary.
Never invent business-specific facts. Known facts may be used only when present in truth.knownFacts.
Industry knowledge can guide generic structure, terminology, priorities and image intent, but it is never evidence about this specific business.
Do not invent staff names, qualifications, years of experience, counts, ratings, awards, testimonials, prices, addresses, phone numbers, certifications, outcomes, guarantees or other unverifiable claims.
Every section and FAQ item must include a claims array. Use grounding=known_fact only for a factKey that exists in truth.knownFacts. Use industry_context or generic_copy for non-business-specific language.
If an unknown fact would be required, omit the claim and write neutral copy instead.
Do not output JSX, HTML, CSS, components, visual layout instructions or code.`;

export async function directContent(input: {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  artDirection?: ArtDirection;
  ai?: AiJsonProvider;
}): Promise<ContentPlan> {
  const fallback = safeFallback(input.brief, input.knowledge, input.artDirection);
  if (!input.ai) return fallback;

  try {
    const result = await input.ai.generateJson<ModelContentPlan>({
      system: SYSTEM_PROMPT,
      input: promptInput(input.brief, input.knowledge, input.artDirection),
      temperature: 0.35,
      maxOutputTokens: 7000,
    });

    const candidate: ContentPlan = {
      version: "1.0",
      pages: Array.isArray(result.value?.pages) ? result.value.pages : [],
      seo: result.value?.seo,
      faq: result.value?.faq,
      imageIntents: Array.isArray(result.value?.imageIntents) ? result.value.imageIntents : [],
      warnings: Array.isArray(result.value?.warnings) ? result.value.warnings : [],
    } as ContentPlan;

    if (!candidate.pages.length || !candidate.seo?.title || !candidate.seo?.description) {
      return { ...fallback, warnings: [...fallback.warnings, "AI content plan was incomplete and was rejected."] };
    }

    const truthErrors = validateContentTruth(candidate, input.brief);
    if (truthErrors.length) {
      return {
        ...fallback,
        warnings: [...fallback.warnings, "AI content plan failed truth validation.", ...truthErrors],
      };
    }

    return candidate;
  } catch {
    return { ...fallback, warnings: [...fallback.warnings, "AI content generation failed; safe fallback returned."] };
  }
}
