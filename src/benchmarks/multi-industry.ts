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
  copy: {
    offer: string;
    services: string[];
    principles: string[];
    faq: string[];
  };
};

export const MULTI_INDUSTRY_BENCHMARKS: MultiIndustryBenchmarkFixture[] = [
  {
    id: "luxury-hotel",
    label: "Luxury hotel",
    brief: "Aster House luxury hotel, Jaipur",
    traits: ["cinematic", "refined", "destination-led", "warm"],
    conversionActions: ["check stay", "book", "enquire"],
    imagery: ["property", "rooms", "destination", "guest experience"],
    copy: { offer:"A considered stay shaped around place, comfort and a clear booking path.", services:["Rooms and stays","Guest experience","Destination context"], principles:["Lead with the stay","Keep details verifiable","Make booking simple"], faq:["What can I explore before booking?","How should availability be confirmed?","Where do verified stay details come from?"] },
  },
  {
    id: "restaurant",
    label: "Restaurant",
    brief: "Ember Table restaurant, Bengaluru",
    traits: ["sensory", "editorial", "welcoming", "confident"],
    conversionActions: ["reserve", "view menu", "visit"],
    imagery: ["food", "chef", "ambience", "shared dining"],
    copy: { offer:"A dining experience introduced through atmosphere, menu context and an easy next step.", services:["Dining experience","Menu highlights","Visit planning"], principles:["Make the offer clear","Let atmosphere support the story","Keep reservations straightforward"], faq:["What can I see before visiting?","How should menu details be confirmed?","How do I plan a visit?"] },
  },
  {
    id: "saas",
    label: "SaaS startup",
    brief: "Flowstack SaaS platform, Hyderabad",
    traits: ["product-led", "precise", "modern", "credible"],
    conversionActions: ["request demo", "start", "contact sales"],
    imagery: ["product UI", "workflow", "customer context"],
    copy: { offer:"A product-led story that explains the value, shows the workflow and creates a clear path to evaluate it.", services:["Core workflow","Team use cases","Evaluation path"], principles:["Explain the problem first","Show the product clearly","Make evaluation low-friction"], faq:["What problem does the platform address?","How should product claims be verified?","What is the next evaluation step?"] },
  },
  {
    id: "construction",
    label: "Construction company",
    brief: "Stonebridge Construction, Pune",
    traits: ["architectural", "substantial", "technical", "premium"],
    conversionActions: ["request quote", "view projects", "contact"],
    imagery: ["projects", "sites", "materials", "team at work"],
    copy: { offer:"A substantial, project-led presentation focused on capability, process and a clear enquiry path.", services:["Project delivery","Construction capability","Project enquiry"], principles:["Lead with capability","Show process clearly","Keep claims grounded"], faq:["What project information can be reviewed?","How should capability claims be confirmed?","How do I start an enquiry?"] },
  },
  {
    id: "law-firm",
    label: "Law firm",
    brief: "Northfield Legal law firm, Mumbai",
    traits: ["authoritative", "restrained", "clear", "trust-led"],
    conversionActions: ["enquire", "contact"],
    imagery: ["professional context", "office", "documents", "city"],
    copy: { offer:"A restrained professional-services presentation built around clarity, trust and an appropriate enquiry path.", services:["Practice context","Client guidance","Initial enquiry"], principles:["Use clear language","Avoid unverified claims","Make contact discreet"], faq:["What can I understand before contacting the firm?","Are outcomes guaranteed?","How should I begin an enquiry?"] },
  },
  {
    id: "real-estate",
    label: "Real estate brokerage",
    brief: "Meridian Estates real estate, Hyderabad",
    traits: ["property-led", "editorial", "premium", "decisive"],
    conversionActions: ["explore properties", "enquire", "schedule visit"],
    imagery: ["properties", "architecture", "neighborhood", "interiors"],
    copy: { offer:"A property-led experience that makes discovery, context and the enquiry path easy to understand.", services:["Property discovery","Location context","Viewing enquiry"], principles:["Lead with properties","Keep availability verifiable","Make enquiries direct"], faq:["What property information can I review?","How should availability be confirmed?","How do I arrange a viewing?"] },
  },
  {
    id: "school",
    label: "School",
    brief: "Northstar Academy school, Chennai",
    traits: ["warm academic", "clear", "student-led", "credible"],
    conversionActions: ["apply", "enquire", "explore programs"],
    imagery: ["students", "campus", "learning", "activities"],
    copy: { offer:"A clear, welcoming school presentation focused on learning context, family confidence and admissions enquiry.", services:["Learning programs","Student experience","Admissions guidance"], principles:["Explain learning clearly","Keep claims grounded","Make admissions approachable"], faq:["What can families explore before enquiring?","How should program details be confirmed?","How do I begin an admissions enquiry?"] },
  },
  {
    id: "recruitment",
    label: "Recruitment agency",
    brief: "Vertex Talent recruitment agency, Bengaluru",
    traits: ["people-led", "professional", "editorial", "direct"],
    conversionActions: ["find jobs", "apply", "hire talent"],
    imagery: ["people", "workplaces", "roles", "interviews"],
    copy: { offer:"A people-led recruitment experience that serves candidates and employers with distinct, low-friction paths.", services:["Candidate opportunities","Employer hiring","Recruitment process"], principles:["Separate candidate and employer needs","Keep roles verifiable","Make next steps obvious"], faq:["How can candidates explore opportunities?","How should open roles be verified?","How can employers start a hiring enquiry?"] },
  },
  {
    id: "ai-data",
    label: "AI and data company",
    brief: "SignalForge artificial intelligence automation, Pune",
    traits: ["technical", "research-inspired", "precise", "product-led"],
    conversionActions: ["request demo", "try product", "contact"],
    imagery: ["product UI", "data visualization", "real use cases", "workflow"],
    copy: { offer:"A technical product story that explains the problem, shows credible use context and creates a clear evaluation path.", services:["Product capability","Workflow context","Evaluation path"], principles:["Explain value before novelty","Avoid unsupported AI claims","Show concrete use context"], faq:["What problem does the product address?","How should AI capabilities be verified?","What is the next evaluation step?"] },
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

export function generateMultiIndustryBenchmarkFixture(fixtureId: string, count = 4) {
  const fixture = MULTI_INDUSTRY_BENCHMARKS.find((item) => item.id === fixtureId);
  if (!fixture) return undefined;
  const generationBrief = interpretMinimalBrief(fixture.brief);
  const knowledge = knowledgeForFixture(fixture);
  const candidates = generateCandidatePlans({ brief: generationBrief, knowledge, count });
  const brief = interpretMinimalBrief(fixture.brief);
  return { fixture, brief, knowledge, candidates };
}

export function generateMultiIndustryBenchmarkMatrix(countPerFixture = 4) {
  return MULTI_INDUSTRY_BENCHMARKS.flatMap((fixture) => {
    const entry = generateMultiIndustryBenchmarkFixture(fixture.id, countPerFixture);
    return entry ? [entry] : [];
  });
}
