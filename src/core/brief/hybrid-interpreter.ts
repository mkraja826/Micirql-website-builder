import { InterpretedBrief, NEVER_FABRICATE } from "./schema";
import { interpretMinimalBrief } from "./interpreter";

export type TaxonomyMatch = {
  industry: string;
  subIndustry?: string;
  businessType?: string;
  confidence: number;
  goals?: string[];
  capabilities?: string[];
  suitableStyles?: string[];
  avoidStyles?: string[];
};

export type ModelInterpretation = Partial<{
  businessName: string;
  industry: string;
  subIndustry: string;
  businessType: string;
  location: string;
  audience: string[];
  primaryGoal: string;
  secondaryGoals: string[];
  brandTraits: string[];
  pricePosition: "budget" | "midmarket" | "premium" | "luxury";
  recommendedPages: string[];
  requiredSectionTypes: string[];
  optionalSectionTypes: string[];
  capabilities: string[];
  conversionActions: string[];
  suitableStyles: string[];
  avoidStyles: string[];
  imagery: string[];
  // Kept in the model contract for compatibility with existing callers, but it is
  // intentionally ignored below. A model may never promote facts to known truth.
  knownFacts: Record<string, unknown>;
  unknownFacts: string[];
}>;

export interface TaxonomyResolver {
  resolve(rawBrief: string): Promise<TaxonomyMatch[]>;
}

export interface BriefModel {
  interpret(input: {
    rawBrief: string;
    taxonomyCandidates: TaxonomyMatch[];
    safetyRules: readonly string[];
  }): Promise<ModelInterpretation>;
}

const pct = (score: number) => Math.max(0, Math.min(1, score));
const strong = (score: number) => pct(score) >= 0.78;

export async function interpretBriefHybrid(
  rawBrief: string,
  deps: { taxonomy: TaxonomyResolver; model?: BriefModel },
): Promise<InterpretedBrief> {
  const input = rawBrief.trim();
  if (!input) throw new Error("Brief must not be empty");

  // This is the truth boundary. Only deterministic extraction from the user's
  // literal brief may contribute to knownFacts or a user-sourced location.
  const deterministic = interpretMinimalBrief(input);

  const candidates = (await deps.taxonomy.resolve(input))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
  const top = candidates[0];

  let model: ModelInterpretation = {};
  if (deps.model) {
    try {
      model = await deps.model.interpret({
        rawBrief: input,
        taxonomyCandidates: candidates,
        safetyRules: NEVER_FABRICATE,
      });
    } catch {
      // AI is enrichment, never a hard dependency for brief interpretation.
      model = {};
    }
  }

  const taxonomyWins = !!top && strong(top.confidence);
  const industry = taxonomyWins ? top.industry : model.industry ?? top?.industry ?? deterministic.business.industry.value;
  const subIndustry = taxonomyWins ? top.subIndustry : model.subIndustry ?? top?.subIndustry ?? deterministic.business.subIndustry?.value;
  const businessType = taxonomyWins ? top.businessType : model.businessType ?? top?.businessType ?? deterministic.business.businessType?.value;
  const classificationSource = taxonomyWins ? "industry_knowledge" as const : model.industry ? "model_inference" as const : deterministic.business.industry.source;
  const classificationConfidence = taxonomyWins ? "strong_inference" as const : "weak_inference" as const;

  const capabilities = unique(model.capabilities, top?.capabilities, defaultCapabilities(industry));
  const goals = unique(model.secondaryGoals, top?.goals);
  const primaryGoal = model.primaryGoal ?? top?.goals?.[0] ?? defaultPrimaryGoal(industry);

  const businessName = deterministic.business.name ?? (model.businessName
    ? { value: model.businessName, confidence: "weak_inference" as const, source: "model_inference" as const }
    : undefined);
  const location = deterministic.business.location ?? (model.location
    ? { value: model.location, confidence: "weak_inference" as const, source: "model_inference" as const }
    : undefined);

  const primaryGoalFromModel = Boolean(model.primaryGoal);
  const primaryGoalFromIndustry = !primaryGoalFromModel && Boolean(top?.goals?.length);

  return {
    version: "1.0",
    rawBrief: input,
    business: {
      ...(businessName ? { name: businessName } : {}),
      industry: { value: industry, confidence: classificationConfidence, source: classificationSource },
      ...(subIndustry ? { subIndustry: { value: subIndustry, confidence: classificationConfidence, source: classificationSource } } : {}),
      ...(businessType ? { businessType: { value: businessType, confidence: classificationConfidence, source: classificationSource } } : {}),
      ...(location ? { location } : {}),
    },
    positioning: {
      audience: {
        value: model.audience ?? defaultAudience(industry),
        confidence: model.audience ? "weak_inference" : "strong_inference",
        source: model.audience ? "model_inference" : "industry_knowledge",
      },
      primaryGoal: {
        value: primaryGoal,
        confidence: primaryGoalFromIndustry ? "strong_inference" : "weak_inference",
        source: primaryGoalFromModel ? "model_inference" : "industry_knowledge",
      },
      secondaryGoals: {
        value: goals,
        confidence: "weak_inference",
        source: model.secondaryGoals ? "model_inference" : "industry_knowledge",
      },
      brandTraits: {
        value: model.brandTraits ?? ["clear", "credible", "professional"],
        confidence: "weak_inference",
        source: model.brandTraits ? "model_inference" : "industry_knowledge",
      },
      ...(model.pricePosition ? { pricePosition: { value: model.pricePosition, confidence: "weak_inference", source: "model_inference" } } : {}),
    },
    website: {
      recommendedPages: {
        value: model.recommendedPages ?? defaultPages(industry),
        confidence: model.recommendedPages ? "weak_inference" : "strong_inference",
        source: model.recommendedPages ? "model_inference" : "industry_knowledge",
      },
      requiredSectionTypes: {
        value: model.requiredSectionTypes ?? defaultSections(industry),
        confidence: model.requiredSectionTypes ? "weak_inference" : "strong_inference",
        source: model.requiredSectionTypes ? "model_inference" : "industry_knowledge",
      },
      optionalSectionTypes: {
        value: model.optionalSectionTypes ?? ["testimonials", "faq", "gallery"],
        confidence: "weak_inference",
        source: model.optionalSectionTypes ? "model_inference" : "industry_knowledge",
      },
      capabilities: {
        value: capabilities,
        confidence: model.capabilities ? "weak_inference" : "strong_inference",
        source: model.capabilities ? "model_inference" : "industry_knowledge",
      },
      conversionActions: {
        value: model.conversionActions ?? conversionActions(capabilities),
        confidence: model.conversionActions ? "weak_inference" : "strong_inference",
        source: model.conversionActions ? "model_inference" : "industry_knowledge",
      },
    },
    truth: {
      // Never accept model.knownFacts. This object is derived only from explicit,
      // deterministic evidence in the user's brief.
      knownFacts: { ...deterministic.truth.knownFacts },
      inferredContext: { industry, subIndustry, businessType },
      unknownFacts: unique(model.unknownFacts, deterministic.truth.unknownFacts, ["verified contact details", "verified business claims", "verified people/team data"]),
      prohibitedClaims: [...NEVER_FABRICATE],
    },
    artDirectionHints: {
      suitableStyles: unique(model.suitableStyles, top?.suitableStyles, ["professional", "industry-appropriate"]),
      avoidStyles: unique(model.avoidStyles, top?.avoidStyles, ["generic template appearance", "poor contrast"]),
      imagery: model.imagery ?? ["authentic industry-relevant photography", "avoid misleading stock claims"],
    },
  };
}

function unique(...groups: Array<string[] | undefined>): string[] {
  return [...new Set(groups.flatMap((x) => x ?? []).filter(Boolean))];
}

function defaultPrimaryGoal(industry: string) {
  if (industry.includes("dental") || industry.includes("healthcare")) return "appointment";
  if (industry.includes("hospitality")) return "booking";
  if (industry.includes("food")) return "reservation";
  if (industry.includes("real-estate")) return "qualified lead";
  if (industry.includes("ecommerce") || industry.includes("retail")) return "purchase";
  return "enquiry";
}

function defaultCapabilities(industry: string): string[] {
  if (industry.includes("dental") || industry.includes("healthcare")) return ["appointment", "contact", "click_to_call", "location"];
  if (industry.includes("hospitality")) return ["booking_enquiry", "contact", "location"];
  if (industry.includes("food")) return ["reservation", "menu", "contact", "location"];
  if (industry.includes("real-estate")) return ["property_enquiry", "lead_capture", "contact"];
  return ["contact", "lead_capture"];
}

function defaultAudience(industry: string): string[] {
  if (industry.includes("dental") || industry.includes("healthcare")) return ["local patients", "care seekers"];
  if (industry.includes("hospitality")) return ["travellers", "guests"];
  if (industry.includes("food")) return ["local diners", "visitors"];
  return ["prospective customers"];
}

function defaultPages(industry: string): string[] {
  if (industry.includes("food")) return ["home", "menu", "about", "contact"];
  if (industry.includes("real-estate")) return ["home", "properties", "about", "contact"];
  return ["home", "about", "services", "contact"];
}

function defaultSections(industry: string): string[] {
  if (industry.includes("dental") || industry.includes("healthcare")) return ["navbar", "hero", "services", "trust", "about", "cta", "contact", "footer"];
  if (industry.includes("hospitality")) return ["navbar", "hero", "experience", "rooms", "gallery", "cta", "contact", "footer"];
  return ["navbar", "hero", "about", "services", "cta", "contact", "footer"];
}

function conversionActions(capabilities: string[]): string[] {
  const map: Record<string, string> = {
    appointment: "book appointment",
    reservation: "reserve",
    booking_enquiry: "check or request booking",
    property_enquiry: "enquire about property",
    demo_request: "request demo",
    lead_capture: "send enquiry",
    contact: "contact business",
    click_to_call: "call",
  };
  return unique(capabilities.map((key) => map[key]).filter(Boolean));
}
