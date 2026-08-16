export type BlueprintIntentRule = {
  archetypeId: string;
  preferredIntents: string[];
  avoidIntents: string[];
  conversionMode: "lead" | "booking" | "purchase" | "signup" | "showcase" | "enrolment" | "corporate";
  imageMode: "people" | "product" | "project" | "place" | "mixed" | "minimal";
};

/**
 * Rules narrow the candidate pool before AI ranking.
 * They are deliberately broad: creativity is allowed, category confusion is not.
 */
export const ARCHETYPE_BLUEPRINT_RULES: BlueprintIntentRule[] = [
  {
    archetypeId: "local-service",
    preferredIntents: ["booking", "quote", "trust", "location", "service", "review", "mobile-first", "call"],
    avoidIntents: ["commerce-search", "developer", "product-interface", "property-search"],
    conversionMode: "lead",
    imageMode: "people",
  },
  {
    archetypeId: "professional-services",
    preferredIntents: ["authority", "expert", "case-result", "proof", "editorial", "consultation", "capability"],
    avoidIntents: ["commerce-search", "menu", "property-search", "collection"],
    conversionMode: "lead",
    imageMode: "mixed",
  },
  {
    archetypeId: "healthcare-clinic",
    preferredIntents: ["booking", "doctor", "treatment", "trust", "credential", "review", "location", "before-after"],
    avoidIntents: ["commerce-search", "developer", "property-search", "product-pricing"],
    conversionMode: "booking",
    imageMode: "people",
  },
  {
    archetypeId: "hospitality",
    preferredIntents: ["cinematic", "booking", "gallery", "place", "menu", "story", "review", "location"],
    avoidIntents: ["developer", "enterprise", "security", "property-search"],
    conversionMode: "booking",
    imageMode: "place",
  },
  {
    archetypeId: "real-estate",
    preferredIntents: ["property-search", "project", "gallery", "map", "agent", "location", "featured"],
    avoidIntents: ["developer", "menu", "course", "treatment"],
    conversionMode: "lead",
    imageMode: "project",
  },
  {
    archetypeId: "ecommerce",
    preferredIntents: ["commerce-search", "collection", "product", "category", "review", "offer", "newsletter"],
    avoidIntents: ["consultation", "doctor", "property-search", "curriculum"],
    conversionMode: "purchase",
    imageMode: "product",
  },
  {
    archetypeId: "saas-technology",
    preferredIntents: ["product-interface", "demo", "feature", "integration", "metric", "security", "trial", "dark"],
    avoidIntents: ["menu", "treatment", "property-search", "location-first"],
    conversionMode: "signup",
    imageMode: "product",
  },
  {
    archetypeId: "portfolio-creative",
    preferredIntents: ["editorial", "project", "gallery", "mosaic", "minimal", "cinematic", "story", "founder"],
    avoidIntents: ["commerce-search", "booking-first", "enterprise-security"],
    conversionMode: "showcase",
    imageMode: "project",
  },
  {
    archetypeId: "education-training",
    preferredIntents: ["course", "outcome", "faculty", "curriculum", "enrolment", "testimonial", "schedule"],
    avoidIntents: ["property-search", "menu", "treatment", "commerce-search"],
    conversionMode: "enrolment",
    imageMode: "people",
  },
  {
    archetypeId: "corporate-company",
    preferredIntents: ["capability", "industry", "project", "proof", "credential", "leadership", "location-network", "corporate"],
    avoidIntents: ["menu", "booking-first", "commerce-search", "treatment"],
    conversionMode: "corporate",
    imageMode: "mixed",
  },
];

export function blueprintRuleFor(archetypeId: string): BlueprintIntentRule | undefined {
  return ARCHETYPE_BLUEPRINT_RULES.find((rule) => rule.archetypeId === archetypeId);
}
