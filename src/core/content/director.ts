import type { InterpretedBrief } from "../brief/schema";
import type { IndustryKnowledge } from "../industry/knowledge";
import type { AiJsonProvider } from "../../providers/ai/schema";
import type { ContentPlan, ModelContentPlan } from "./schema";
import { validateContentTruth } from "./safety";

function businessLabel(brief: InterpretedBrief) {
  return brief.business.name?.value ?? "This business";
}

function safeFallback(brief: InterpretedBrief, knowledge: IndustryKnowledge): ContentPlan {
  const name = businessLabel(brief);
  const industryName = knowledge.subIndustry?.name ?? knowledge.industry.name;
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
            ? `${name}, presented with clarity.`
            : sectionType === "cta"
              ? "Take the next step when you are ready."
              : sectionType === "contact"
                ? "Start a conversation."
                : sectionType.replace(/-/g, " "),
        body:
          sectionType === "hero"
            ? `A clear introduction shaped for ${industryName.toLowerCase()} visitors without making unverified business claims.`
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

function promptInput(brief: InterpretedBrief, knowledge: IndustryKnowledge) {
  return {
    business: brief.business,
    positioning: brief.positioning,
    website: brief.website,
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
Write useful, concise website content from the interpreted brief and industry knowledge.
Never invent business-specific facts. Known facts may be used only when present in truth.knownFacts.
Industry knowledge can guide generic structure, terminology, priorities and image intent, but it is never evidence about this specific business.
Do not invent staff names, qualifications, years of experience, counts, ratings, awards, testimonials, prices, addresses, phone numbers, certifications, outcomes, guarantees or other unverifiable claims.
Every section and FAQ item must include a claims array. Use grounding=known_fact only for a factKey that exists in truth.knownFacts. Use industry_context or generic_copy for non-business-specific language.
If an unknown fact would be required, omit the claim and write neutral copy instead.
Do not output JSX, HTML, CSS, components, visual layout instructions or code.`;

export async function directContent(input: {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  ai?: AiJsonProvider;
}): Promise<ContentPlan> {
  const fallback = safeFallback(input.brief, input.knowledge);
  if (!input.ai) return fallback;

  try {
    const result = await input.ai.generateJson<ModelContentPlan>({
      system: SYSTEM_PROMPT,
      input: promptInput(input.brief, input.knowledge),
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
