export type Confidence = "known" | "strong_inference" | "weak_inference" | "unknown";

export type Fact<T = string> = {
  value: T;
  confidence: Confidence;
  source: "user" | "industry_knowledge" | "model_inference";
};

export type InterpretedBrief = {
  version: "1.0";
  rawBrief: string;
  business: {
    name?: Fact;
    industry: Fact;
    subIndustry?: Fact;
    businessType?: Fact;
    location?: Fact;
  };
  positioning: {
    audience: Fact<string[]>;
    primaryGoal: Fact;
    secondaryGoals: Fact<string[]>;
    brandTraits: Fact<string[]>;
    pricePosition?: Fact<"budget" | "midmarket" | "premium" | "luxury">;
  };
  website: {
    recommendedPages: Fact<string[]>;
    requiredSectionTypes: Fact<string[]>;
    optionalSectionTypes: Fact<string[]>;
    capabilities: Fact<string[]>;
    conversionActions: Fact<string[]>;
  };
  truth: {
    knownFacts: Record<string, unknown>;
    inferredContext: Record<string, unknown>;
    unknownFacts: string[];
    prohibitedClaims: string[];
  };
  artDirectionHints: {
    suitableStyles: string[];
    avoidStyles: string[];
    imagery: string[];
  };
};

export const NEVER_FABRICATE = [
  "people or staff names",
  "qualifications",
  "years of experience",
  "customer or patient counts",
  "ratings",
  "awards",
  "testimonials",
  "prices",
  "addresses",
  "phone numbers",
  "certifications",
  "treatment or performance outcomes",
] as const;
