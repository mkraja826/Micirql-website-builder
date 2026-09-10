export type ArtDirection = {
  id: string;
  label: string;
  rationale: string;
  visualStyle: string;
  mood: string[];
  typography: {
    personality: string;
    headingDirection: string;
    bodyDirection: string;
  };
  color: {
    strategy: string;
    contrastMode: "light" | "dark" | "mixed";
    accentBehavior: string;
  };
  imagery: {
    strategy: string;
    subjects: string[];
    treatment: string;
  };
  layout: {
    heroArchitecture: string;
    density: "low" | "medium" | "high";
    rhythm: string;
    geometry: string;
  };
  motion: {
    intensity: "none" | "subtle" | "moderate";
    guidance: string;
  };
  sectionIntent: Array<{
    type: string;
    purpose: string;
    preferredTraits: string[];
  }>;
  conversionStrategy: string[];
  avoid: string[];
};

export type ArtDirectionInput = {
  industry: string;
  subIndustry?: string;
  businessType?: string;
  primaryGoal: string;
  secondaryGoals: string[];
  brandTraits: string[];
  knownFacts: Record<string, unknown>;
  unknownFacts: string[];
  industryKnowledge: {
    visualVocabulary?: string[];
    imagery?: string[];
    requiredSections?: string[];
    optionalSections?: string[];
    conversionActions?: string[];
    avoid?: string[];
  };
};
