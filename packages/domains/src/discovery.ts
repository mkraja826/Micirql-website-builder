import type { Domain } from "@micirql/schema";
import type { DiscoveryAnswer, DiscoveryQuestion } from "./discovery-types";
import { getDomainPack } from "./index";
import { getSubtypeRule } from "./subtypes";

const universalQuestions: DiscoveryQuestion[] = [
  { id: "business.name", group: "business", label: "What is your business or brand name?", type: "short-text", required: true, aiPurpose: "Primary identity and metadata." },
  { id: "business.summary", group: "business", label: "In one or two sentences, what does your business do?", type: "long-text", required: true, aiPurpose: "Create the initial business profile." },
  { id: "business.audience", group: "business", label: "Who are your main customers or visitors?", type: "long-text", required: true, aiPurpose: "Audience targeting and conversion decisions." },
  { id: "business.primary-goal", group: "business", label: "What is the most important result you want from this website?", type: "single-select", required: true, options: ["enquiries", "appointments", "reservations", "calls", "signups", "quote requests", "showcase work", "brand credibility", "other"], aiPurpose: "Set conversion hierarchy and primary CTA." },
  { id: "brand.has-identity", group: "brand", label: "Do you already have a logo or brand identity?", type: "boolean", required: true, aiPurpose: "Preserve or infer brand styling." },
  { id: "brand.personality", group: "brand", label: "How should the website feel?", type: "multi-select", required: true, options: ["minimal", "premium", "friendly", "bold", "corporate", "luxury", "playful", "editorial", "futuristic", "cinematic"], aiPurpose: "Theme and component ranking input." },
  { id: "content.existing-site", group: "content", label: "Do you have an existing website we should learn from?", type: "url", required: false, aiPurpose: "Preserve useful content and SEO where appropriate." }
];

const seoQuestions: DiscoveryQuestion[] = [
  { id: "seo.goal", group: "seo", label: "What should people ideally search for before finding your website?", type: "long-text", required: true, aiPurpose: "Create priority SEO intent before page planning." },
  { id: "seo.services-topics", group: "seo", label: "Which services, products or topics are most important for you to rank for?", type: "multi-select", required: true, aiPurpose: "Plan dedicated service/topic pages and internal links." },
  { id: "seo.locations", group: "seo", label: "Which locations do you want to attract customers from?", type: "location-list", required: false, aiPurpose: "Local/regional SEO and location-page planning." },
  { id: "seo.languages", group: "seo", label: "Which languages should the website target?", type: "language-list", required: false, aiPurpose: "Multilingual architecture and hreflang planning." },
  { id: "seo.competitors", group: "seo", label: "Are there competitors or websites you want to compete with in search?", type: "long-text", required: false, aiPurpose: "Competitive positioning and content-gap analysis." },
  { id: "seo.content-growth", group: "seo", label: "Are you willing to publish useful articles, guides or case studies over time?", type: "boolean", required: false, aiPurpose: "Decide whether to include a content-growth strategy." }
];

const domainSpecific: Partial<Record<Domain, DiscoveryQuestion[]>> = {
  clinic: [
    { id: "clinic.services", group: "business", label: "Which treatments or services do you provide?", type: "multi-select", required: true, aiPurpose: "Service architecture and SEO planning." },
    { id: "clinic.team", group: "content", label: "Who are the professionals we should feature?", type: "long-text", required: true, aiPurpose: "Authority and team-page planning." },
    { id: "clinic.appointments", group: "functionality", label: "Should visitors be able to request appointments online?", type: "boolean", required: true, aiPurpose: "Determine appointment functionality." }
  ],
  "real-estate": [
    { id: "realestate.inventory", group: "business", label: "Do you showcase properties, projects, or both?", type: "single-select", required: true, options: ["properties", "projects", "both"], aiPurpose: "Choose listing structure and enquiry flows." },
    { id: "realestate.locations", group: "seo", label: "Which property locations are most important?", type: "location-list", required: true, aiPurpose: "Property/location SEO architecture." }
  ],
  restaurant: [
    { id: "restaurant.menu", group: "content", label: "Do you already have a menu we can use?", type: "boolean", required: true, aiPurpose: "Determine menu content requirements." },
    { id: "restaurant.reservations", group: "functionality", label: "Do you want online reservation requests?", type: "boolean", required: true, aiPurpose: "Determine reservation functionality." }
  ],
  saas: [
    { id: "saas.product", group: "business", label: "What problem does your product solve?", type: "long-text", required: true, aiPurpose: "Product positioning and feature hierarchy." },
    { id: "saas.cta", group: "functionality", label: "What should the primary CTA be?", type: "single-select", required: true, options: ["request demo", "start signup", "contact sales", "join waitlist"], aiPurpose: "Primary conversion flow." }
  ],
  construction: [
    { id: "construction.services", group: "business", label: "Which services should be promoted most strongly?", type: "multi-select", required: true, aiPurpose: "Service pages and local SEO prioritization." },
    { id: "construction.service-area", group: "seo", label: "Where do you provide these services?", type: "location-list", required: true, aiPurpose: "Local SEO and location-page planning." }
  ],
  hospitality: [
    { id: "hospitality.property-type", group: "business", label: "What type of property is this?", type: "single-select", required: true, options: ["hotel", "resort", "homestay", "villa", "other"], aiPurpose: "Choose hospitality subtype and content structure." },
    { id: "hospitality.booking", group: "functionality", label: "How should guests enquire or book?", type: "single-select", required: true, options: ["booking request", "external booking link", "phone or messaging enquiry"], aiPurpose: "Determine booking flow without inventing availability." }
  ]
};

export function discoveryQuestionsFor(domain: Domain, subtype?: string): DiscoveryQuestion[] {
  const pack = getDomainPack(domain);
  const subtypeRule = subtype ? getSubtypeRule(domain, subtype) : undefined;
  const questions: DiscoveryQuestion[] = [...universalQuestions];

  questions.push({ id: "business.domain-goal", group: "business", label: `Which outcomes matter most for your ${pack.label.toLowerCase()} website?`, type: "multi-select", required: true, options: pack.primaryGoals, aiPurpose: "Rank domain-specific conversion goals." });
  questions.push(...(domainSpecific[domain] ?? []));

  for (const fact of subtypeRule?.extraRequiredFacts ?? []) {
    questions.push({ id: `subtype.fact.${slugify(fact)}`, group: "business", label: `Tell us about ${fact}.`, type: "long-text", required: true, aiPurpose: `Required ${subtype} business fact for accurate planning.` });
  }

  questions.push(...seoQuestions.filter((question) => {
    if (question.id === "seo.locations") return pack.seo.askLocations;
    if (question.id === "seo.languages") return pack.seo.askLanguages;
    return true;
  }));

  return dedupeQuestions(questions);
}

export function requiredDiscoveryQuestionIds(domain: Domain, subtype?: string): string[] {
  return discoveryQuestionsFor(domain, subtype).filter((question) => question.required).map((question) => question.id);
}

export function validateDiscoveryCompleteness(domain: Domain, answers: DiscoveryAnswer[], subtype?: string) {
  const answered = new Set(answers.filter((answer) => hasValue(answer.value)).map((answer) => answer.questionId));
  const missing = requiredDiscoveryQuestionIds(domain, subtype).filter((id) => !answered.has(id));
  return { complete: missing.length === 0, missing };
}

function hasValue(value: DiscoveryAnswer["value"]): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function dedupeQuestions(questions: DiscoveryQuestion[]): DiscoveryQuestion[] {
  const seen = new Set<string>();
  return questions.filter((question) => {
    if (seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}
