import type { InterpretedBrief } from "../brief/schema";
import type { IndustryKnowledge } from "../industry/knowledge";
import type { ArtDirection } from "../art-direction/schema";
import type { AiJsonProvider } from "../../providers/ai/schema";
import type { ContentPlan, ModelContentPlan, SectionContent } from "./schema";
import { validateContentTruth } from "./safety";

function businessLabel(brief: InterpretedBrief) {
  return brief.business.name?.value ?? "This business";
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sentenceCase(value: string) {
  const clean = value.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

function actionLabel(knowledge: IndustryKnowledge) {
  return knowledge.conversionActions.find(Boolean) ?? "get in touch";
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

function sectionFallback(input: {
  sectionType: string;
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  artDirection?: ArtDirection;
}): SectionContent {
  const { sectionType, brief, knowledge, artDirection } = input;
  const name = businessLabel(brief);
  const industryName = knowledge.subIndustry?.name ?? knowledge.industry.name;
  const voice = fallbackVoice(artDirection);
  const primaryAction = actionLabel(knowledge);
  const priority = knowledge.contentPriorities[0] ?? "the business offer";
  const secondaryPriority = knowledge.contentPriorities[1] ?? "the decision context";
  const tertiaryPriority = knowledge.contentPriorities[2] ?? "the next step";

  const base: SectionContent = {
    sectionType,
    headline: titleCase(sectionType),
    claims: [],
  };

  switch (sectionType) {
    case "navbar":
      return { ...base, headline: name };
    case "hero":
      return {
        ...base,
        eyebrow: sentenceCase(industryName),
        headline: `${name}, ${voice.hero}.`,
        body: `A ${voice.tone} introduction focused on ${priority}, ${secondaryPriority} and ${tertiaryPriority}, without making unverified business claims.`,
        primaryCta: { label: titleCase(primaryAction), action: primaryAction },
        secondaryCta: { label: "Explore the offer", action: "explore" },
        imageIntent: knowledge.imageryGuidance[0],
      };
    case "services":
      return {
        ...base,
        eyebrow: "Offer",
        headline: `Understand ${priority} clearly.`,
        body: `Present the most relevant ${industryName.toLowerCase()} options in a way that supports comparison without inventing prices, outcomes or credentials.`,
        items: knowledge.contentPriorities.slice(0, 3).map((item) => ({
          title: titleCase(item),
          body: `Explain ${item.toLowerCase()} using only verified business facts and safe industry context.`,
        })),
      };
    case "about":
      return {
        ...base,
        eyebrow: "About",
        headline: `Context that helps visitors understand ${name}.`,
        body: `Use grounded information about the business, its offer and its approach. Unknown team, credential, history and proof details remain omitted until verified.`,
      };
    case "process":
      return {
        ...base,
        eyebrow: "Process",
        headline: "A clearer path from interest to action.",
        body: `Help visitors understand the decision sequence before they ${primaryAction.toLowerCase()}, without implying an unverified operational process.`,
      };
    case "gallery":
      return {
        ...base,
        eyebrow: "Visual story",
        headline: `See the context around ${priority}.`,
        body: `Use relevant, non-fabricated imagery to support the visitor's understanding of ${industryName.toLowerCase()}.`,
        imageIntent: knowledge.imageryGuidance[0],
      };
    case "faq":
      return {
        ...base,
        eyebrow: "Questions",
        headline: "Useful context before the next step.",
        body: "Answer only what can be supported by the brief or safe industry context; leave business-specific unknowns for verification.",
      };
    case "cta":
      return {
        ...base,
        eyebrow: "Next step",
        headline: `${voice.cta}.`,
        body: `Continue with a relevant action once the visitor has enough context to decide what they need.`,
        primaryCta: { label: titleCase(primaryAction), action: primaryAction },
        secondaryCta: { label: "Review the offer", action: "explore" },
      };
    case "contact":
      return {
        ...base,
        eyebrow: "Contact",
        headline: `Continue with ${name}.`,
        body: `Start with a simple enquiry. Verified contact details and submission infrastructure should be connected before publication.`,
        primaryCta: { label: titleCase(primaryAction), action: primaryAction },
      };
    case "footer":
      return {
        ...base,
        headline: `${name} · ${sentenceCase(industryName)}`,
        body: `Clear information and a grounded route to ${primaryAction.toLowerCase()}.`,
      };
    default:
      return {
        ...base,
        body: `Present ${sentenceCase(sectionType).toLowerCase()} using verified business facts and safe ${industryName.toLowerCase()} context.`,
      };
  }
}

function safeFallback(brief: InterpretedBrief, knowledge: IndustryKnowledge, artDirection?: ArtDirection): ContentPlan {
  const name = businessLabel(brief);
  const industryName = knowledge.subIndustry?.name ?? knowledge.industry.name;
  const pages = brief.website.recommendedPages.value.length
    ? brief.website.recommendedPages.value
    : knowledge.recommendedPages;
  const sectionTypes = brief.website.requiredSectionTypes.value.length
    ? brief.website.requiredSectionTypes.value
    : knowledge.requiredSectionTypes;
  const primaryAction = actionLabel(knowledge);

  return {
    version: "1.0",
    pages: pages.map((slug) => ({
      slug,
      title: slug === "home" ? name : `${titleCase(slug)} · ${name}`,
      purpose: knowledge.contentPriorities[0] ?? `Explain ${industryName} clearly and help visitors take the next step.`,
      sections: sectionTypes.map((sectionType) => sectionFallback({ sectionType, brief, knowledge, artDirection })),
    })),
    seo: {
      title: brief.business.location?.value ? `${name} · ${brief.business.location.value}` : name,
      description: `Learn about ${name}, understand relevant ${industryName.toLowerCase()} information and ${primaryAction.toLowerCase()} when you are ready.`,
    },
    faq: [
      {
        question: `What should I understand before I ${primaryAction.toLowerCase()}?`,
        answer: `Review the offer, the relevant decision context and any verified business-specific information before taking the next step.`,
        claims: [],
      },
      {
        question: "Which details should be verified before publication?",
        answer: `Business-specific facts such as team details, credentials, prices, testimonials, contact information and outcomes should be supplied and verified before they appear on the site.`,
        claims: [],
      },
      {
        question: `How should ${industryName.toLowerCase()} information be presented?`,
        answer: `Use clear industry context to explain categories and decisions, but do not present general industry knowledge as a fact about this specific business.`,
        claims: [],
      },
    ],
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
