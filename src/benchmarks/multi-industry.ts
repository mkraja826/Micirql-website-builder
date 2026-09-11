import { interpretMinimalBrief } from "../core/brief/interpreter";
import { generateCandidatePlans } from "../core/generation/candidates";
import { GENERIC_KNOWLEDGE_FALLBACK, type IndustryKnowledge } from "../core/industry/knowledge";

export type MultiIndustryBenchmarkFixture = {
  id: string;
  label: string;
  brief: string;
  traits: string[];
  conversionActions: string[];
  imagery: string[];
};

export const MULTI_INDUSTRY_BENCHMARKS: MultiIndustryBenchmarkFixture[] = [
  {
    id: "luxury-hotel",
    label: "Luxury hotel",
    brief: "Aster House luxury hotel, Jaipur",
    traits: ["cinematic", "refined", "destination-led", "warm"],
    conversionActions: ["check stay", "book", "enquire"],
    imagery: ["property", "rooms", "destination", "guest experience"],
  },
  {
    id: "restaurant",
    label: "Restaurant",
    brief: "Ember Table restaurant, Bengaluru",
    traits: ["sensory", "editorial", "welcoming", "confident"],
    conversionActions: ["reserve", "view menu", "visit"],
    imagery: ["food", "chef", "ambience", "shared dining"],
  },
  {
    id: "saas",
    label: "SaaS startup",
    brief: "Flowstack SaaS platform, Hyderabad",
    traits: ["product-led", "precise", "modern", "credible"],
    conversionActions: ["request demo", "start", "contact sales"],
    imagery: ["product UI", "workflow", "customer context"],
  },
  {
    id: "construction",
    label: "Construction company",
    brief: "Stonebridge Construction, Pune",
    traits: ["architectural", "substantial", "technical", "premium"],
    conversionActions: ["request quote", "view projects", "contact"],
    imagery: ["projects", "sites", "materials", "team at work"],
  },
  {
    id: "law-firm",
    label: "Law firm",
    brief: "Northfield Legal law firm, Mumbai",
    traits: ["authoritative", "restrained", "clear", "trust-led"],
    conversionActions: ["enquire", "contact"],
    imagery: ["professional context", "office", "documents", "city"],
  },
];

function knowledgeForFixture(fixture: MultiIndustryBenchmarkFixture): IndustryKnowledge {
  const brief = interpretMinimalBrief(fixture.brief);
  const industry = brief.business.industry.value;
  const subIndustry = brief.business.subIndustry?.value;
  return {
    industry: { slug: industry, name: industry },
    subIndustry: subIndustry ? { slug: subIndustry, name: subIndustry } : undefined,
    ...GENERIC_KNOWLEDGE_FALLBACK,
    audience: brief.positioning.audience.value,
    recommendedPages: brief.website.recommendedPages.value,
    requiredSectionTypes: brief.website.requiredSectionTypes.value,
    optionalSectionTypes: brief.website.optionalSectionTypes.value,
    conversionActions: fixture.conversionActions,
    visualVocabulary: {
      traits: fixture.traits,
      avoid: brief.artDirectionHints.avoidStyles,
    },
    imageryGuidance: fixture.imagery,
    contentPriorities: ["business offer", "decision context", "clear next step"],
    backendCapabilities: brief.website.capabilities.value,
  };
}

export function generateMultiIndustryBenchmarkMatrix(countPerFixture = 4) {
  return MULTI_INDUSTRY_BENCHMARKS.map((fixture) => {
    const brief = interpretMinimalBrief(fixture.brief);
    const knowledge = knowledgeForFixture(fixture);
    const candidates = generateCandidatePlans({ brief, knowledge, count: countPerFixture });
    return { fixture, brief, knowledge, candidates };
  });
}
