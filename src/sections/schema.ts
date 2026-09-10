export type SectionType = "navbar" | "hero" | "about" | "services" | "process" | "gallery" | "team" | "testimonials" | "faq" | "cta" | "contact" | "footer";

export type CompleteSectionDefinition = {
  id: string;
  type: SectionType;
  name: string;
  status: "draft" | "approved" | "retired";
  implementationPath: string;
  industries: string[];
  subIndustries: string[];
  artDirections: string[];
  moods: string[];
  conversionPurposes: string[];
  media: { intensity: "none" | "low" | "medium" | "high"; types: string[] };
  density: "airy" | "balanced" | "dense";
  contentSlots: string[];
  capabilities: string[];
  mobileBehavior: string;
  accessibilityNotes: string[];
  compatibility: {
    backgrounds: string[];
    precedingTypes: SectionType[] | ["any"];
    followingTypes: SectionType[] | ["any"];
  };
};

// A section is the smallest visual unit MiCirql may select.
// Do not introduce a generative Button/Card/HeroShell/Container component layer here.
