export type IndustryKnowledge = {
  industry: { slug: string; name: string };
  subIndustry?: { slug: string; name: string };
  audience: string[];
  recommendedPages: string[];
  requiredSectionTypes: string[];
  optionalSectionTypes: string[];
  conversionActions: string[];
  visualVocabulary: {
    traits?: string[];
    avoid?: string[];
    [key: string]: unknown;
  };
  imageryGuidance: string[];
  contentPriorities: string[];
  prohibitedAssumptions: string[];
  backendCapabilities: string[];
};

export type IndustryKnowledgeRepository = {
  getByTaxonomy(input: {
    industrySlug: string;
    subIndustrySlug?: string;
  }): Promise<IndustryKnowledge | null>;
};

export const GENERIC_KNOWLEDGE_FALLBACK: Omit<IndustryKnowledge, "industry" | "subIndustry"> = {
  audience: ["prospective customers"],
  recommendedPages: ["home", "about", "services", "contact"],
  requiredSectionTypes: ["navbar", "hero", "services", "about", "cta", "contact", "footer"],
  optionalSectionTypes: ["process", "faq", "gallery", "testimonials"],
  conversionActions: ["enquire", "contact"],
  visualVocabulary: {
    traits: ["clear", "credible", "professional", "human"],
    avoid: ["generic template feel", "unnecessary visual clutter"],
  },
  imageryGuidance: ["authentic business-relevant imagery", "real people or locations when supplied"],
  contentPriorities: ["what the business does", "why it matters", "how to take the next step"],
  prohibitedAssumptions: [
    "staff identities",
    "experience claims",
    "awards",
    "ratings",
    "testimonials",
    "prices",
    "addresses",
    "phone numbers",
    "certifications",
    "performance outcomes",
  ],
  backendCapabilities: ["contact"],
};

export async function resolveIndustryKnowledge(
  repo: IndustryKnowledgeRepository,
  input: { industrySlug: string; industryName?: string; subIndustrySlug?: string; subIndustryName?: string },
): Promise<IndustryKnowledge> {
  const exact = await repo.getByTaxonomy({
    industrySlug: input.industrySlug,
    subIndustrySlug: input.subIndustrySlug,
  });

  if (exact) return exact;

  if (input.subIndustrySlug) {
    const industryLevel = await repo.getByTaxonomy({ industrySlug: input.industrySlug });
    if (industryLevel) return industryLevel;
  }

  return {
    industry: { slug: input.industrySlug, name: input.industryName ?? input.industrySlug },
    subIndustry: input.subIndustrySlug
      ? { slug: input.subIndustrySlug, name: input.subIndustryName ?? input.subIndustrySlug }
      : undefined,
    ...GENERIC_KNOWLEDGE_FALLBACK,
  };
}
