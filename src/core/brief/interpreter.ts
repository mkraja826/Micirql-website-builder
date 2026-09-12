import type { Fact, InterpretedBrief } from "./schema";
import { BRIEF_INTERPRETER_RULES } from "./rules";

const INDUSTRY_RULES = [
  { industry: "dental", subIndustry: "general-dentistry", businessType: "clinic", terms: ["dental", "dentist", "dentistry", "teeth", "tooth"] },
  { industry: "hospitality", subIndustry: "luxury-hotel", businessType: "hotel", terms: ["hotel", "resort", "homestay", "hostel"] },
  { industry: "food-beverage", subIndustry: "casual-dining", businessType: "restaurant", terms: ["restaurant", "cafe", "bakery", "bistro", "food"] },
  { industry: "construction", subIndustry: "general-contractor", businessType: "contractor", terms: ["construction", "builders", "builder", "contractor", "infra"] },
  { industry: "real-estate", subIndustry: "brokerage", businessType: "brokerage", terms: ["real estate", "realtor", "properties", "property"] },
  { industry: "technology", subIndustry: "saas", businessType: "saas", terms: ["saas", "software", "app", "platform"] },
  { industry: "ai-data", subIndustry: "ai-products", businessType: "startup", terms: ["ai", "artificial intelligence", "automation", "machine learning"] },
  { industry: "education", subIndustry: "school", businessType: "school", terms: ["school", "academy", "college", "university", "education"] },
  { industry: "recruitment-hr", subIndustry: "recruitment-agency", businessType: "agency", terms: ["recruitment", "staffing", "jobs", "talent", "hr"] },
  { industry: "professional-services", subIndustry: "law-firm", businessType: "law-firm", terms: ["law firm", "lawyer", "lawyers", "legal", "attorney", "advocate"] },
] as const;

const CITY_TERMS = [
  "hyderabad", "mumbai", "delhi", "bengaluru", "bangalore", "chennai", "pune", "kolkata", "goa", "jaipur", "kochi", "ahmedabad", "visakhapatnam", "vijayawada"
];

function fact<T>(value: T, confidence: Fact<T>["confidence"], source: Fact<T>["source"]): Fact<T> {
  return { value, confidence, source };
}

function inferLocation(raw: string): Fact | undefined {
  const lower = raw.toLowerCase();
  const city = CITY_TERMS.find((term) => lower.includes(term));
  return city ? fact(city.replace(/\b\w/g, (c) => c.toUpperCase()), "known", "user") : undefined;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string) {
  const pattern = term
    .trim()
    .split(/\s+/)
    .map(escapeRegex)
    .join("\\s+");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text);
}

function inferClassification(raw: string) {
  const lower = raw.toLowerCase();
  return INDUSTRY_RULES.find((rule) => rule.terms.some((term) => containsTerm(lower, term)));
}

function inferBusinessName(raw: string, classification?: (typeof INDUSTRY_RULES)[number]): Fact | undefined {
  let candidate = raw.trim();
  if (!candidate) return undefined;
  const remove = new Set([...(classification?.terms ?? []), ...CITY_TERMS]);
  for (const term of remove) candidate = candidate.replace(new RegExp(`\\b${term}\\b`, "ig"), " ");
  candidate = candidate.replace(/\s+/g, " ").trim();
  return candidate ? fact(candidate, "weak_inference", "model_inference") : undefined;
}

const GENERIC = {
  audience: ["prospective customers"],
  secondaryGoals: ["trust", "enquiry"],
  brandTraits: ["professional", "clear", "credible"],
  pages: ["home", "about", "services", "contact"],
  sections: ["navbar", "hero", "services", "about", "cta", "contact", "footer"],
  optional: ["process", "testimonials", "faq", "gallery", "team"],
};

const INDUSTRY_ENRICHMENT: Record<string, Partial<typeof GENERIC> & { primaryGoal: string; capabilities: string[]; conversionActions: string[]; suitableStyles: string[]; avoidStyles: string[]; imagery: string[] }> = {
  dental: { primaryGoal: "appointments", capabilities: ["appointment", "contact", "click_to_call", "location"], conversionActions: ["book appointment", "call", "contact"], suitableStyles: ["warm premium", "clinical editorial", "calm modern"], avoidStyles: ["generic SaaS", "frightening procedure imagery"], imagery: ["clinic", "doctor-patient interaction", "smile and lifestyle"] },
  hospitality: { primaryGoal: "bookings", capabilities: ["booking_enquiry", "contact", "location"], conversionActions: ["check stay", "book", "enquire"], suitableStyles: ["cinematic", "editorial luxury", "destination-led"], avoidStyles: ["generic corporate"], imagery: ["property", "rooms", "destination", "experience"] },
  "food-beverage": { primaryGoal: "reservations", capabilities: ["reservation", "menu", "contact", "location"], conversionActions: ["reserve", "view menu", "visit"], suitableStyles: ["editorial", "sensory", "hospitality-led"], avoidStyles: ["corporate stock"], imagery: ["food", "chef", "ambience"] },
  construction: { primaryGoal: "qualified enquiries", capabilities: ["lead_capture", "contact"], conversionActions: ["request quote", "view projects", "contact"], suitableStyles: ["architectural", "industrial premium", "corporate editorial"], avoidStyles: ["playful consumer styling"], imagery: ["projects", "sites", "materials", "team"] },
  "real-estate": { primaryGoal: "property enquiries", capabilities: ["property_enquiry", "lead_capture", "contact"], conversionActions: ["explore properties", "enquire", "schedule visit"], suitableStyles: ["luxury editorial", "property-led", "minimal premium"], avoidStyles: ["weak imagery"], imagery: ["properties", "architecture", "neighborhood"] },
  technology: { primaryGoal: "demo or signup", capabilities: ["demo_request", "lead_capture", "contact"], conversionActions: ["request demo", "start", "contact sales"], suitableStyles: ["product-led", "editorial technology", "minimal systems"], avoidStyles: ["meaningless AI gradients"], imagery: ["product UI", "workflow", "customer context"] },
  "ai-data": { primaryGoal: "demo or signup", capabilities: ["demo_request", "lead_capture", "contact"], conversionActions: ["request demo", "try product", "contact"], suitableStyles: ["technical editorial", "product-led", "research-inspired"], avoidStyles: ["generic glowing AI orb"], imagery: ["product UI", "data visualization", "real use cases"] },
  education: { primaryGoal: "admissions", capabilities: ["admission_enquiry", "contact", "lead_capture"], conversionActions: ["apply", "enquire", "explore programs"], suitableStyles: ["institutional modern", "warm academic", "student-led"], avoidStyles: ["overly corporate"], imagery: ["students", "campus", "learning"] },
  "recruitment-hr": { primaryGoal: "applications and employer leads", capabilities: ["job_application", "employer_enquiry", "contact"], conversionActions: ["find jobs", "apply", "hire talent"], suitableStyles: ["professional editorial", "people-led", "modern corporate"], avoidStyles: ["generic stock-office overload"], imagery: ["people", "workplaces", "roles"] },
  "professional-services": { primaryGoal: "qualified enquiries", capabilities: ["lead_capture", "contact"], conversionActions: ["enquire", "contact"], suitableStyles: ["authoritative editorial", "restrained premium", "trust-led"], avoidStyles: ["salesy claims", "generic corporate stock"], imagery: ["professional context", "office", "documents", "city"] },
};

export function interpretMinimalBrief(rawBrief: string): InterpretedBrief {
  const raw = rawBrief.trim();
  if (!raw) throw new Error("Brief cannot be empty");

  const classification = inferClassification(raw);
  const industry = classification?.industry ?? "local-business";
  const enrichment = INDUSTRY_ENRICHMENT[industry] ?? {
    primaryGoal: "enquiries",
    capabilities: ["contact", "lead_capture"],
    conversionActions: ["contact", "enquire"],
    suitableStyles: ["professional", "clear", "brand-led"],
    avoidStyles: ["generic template look"],
    imagery: ["business", "service", "customer context"],
  };

  const location = inferLocation(raw);
  const businessName = inferBusinessName(raw, classification);

  return {
    version: "1.0",
    rawBrief: raw,
    business: {
      name: businessName,
      industry: fact(industry, classification ? "strong_inference" : "weak_inference", classification ? "industry_knowledge" : "model_inference"),
      subIndustry: classification ? fact(classification.subIndustry, "strong_inference", "industry_knowledge") : undefined,
      businessType: classification ? fact(classification.businessType, "strong_inference", "industry_knowledge") : undefined,
      location,
    },
    positioning: {
      audience: fact(GENERIC.audience, "strong_inference", "industry_knowledge"),
      primaryGoal: fact(enrichment.primaryGoal, "strong_inference", "industry_knowledge"),
      secondaryGoals: fact(GENERIC.secondaryGoals, "strong_inference", "industry_knowledge"),
      brandTraits: fact(GENERIC.brandTraits, "weak_inference", "industry_knowledge"),
    },
    website: {
      recommendedPages: fact(GENERIC.pages, "strong_inference", "industry_knowledge"),
      requiredSectionTypes: fact(GENERIC.sections, "strong_inference", "industry_knowledge"),
      optionalSectionTypes: fact(GENERIC.optional, "strong_inference", "industry_knowledge"),
      capabilities: fact(enrichment.capabilities, "strong_inference", "industry_knowledge"),
      conversionActions: fact(enrichment.conversionActions, "strong_inference", "industry_knowledge"),
    },
    truth: {
      knownFacts: { ...(location ? { location: location.value } : {}) },
      inferredContext: { industry, subIndustry: classification?.subIndustry, businessType: classification?.businessType },
      unknownFacts: ["verified address", "phone", "email", "team", "pricing", "testimonials", "credentials"],
      prohibitedClaims: [...BRIEF_INTERPRETER_RULES.neverFabricate],
    },
    artDirectionHints: {
      suitableStyles: enrichment.suitableStyles,
      avoidStyles: enrichment.avoidStyles,
      imagery: enrichment.imagery,
    },
  };
}
