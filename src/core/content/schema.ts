export type ContentGrounding = "known_fact" | "industry_context" | "generic_copy";

export type ContentClaim = {
  text: string;
  grounding: ContentGrounding;
  factKey?: string;
};

export type SectionContent = {
  sectionType: string;
  eyebrow?: string;
  headline: string;
  body?: string;
  items?: Array<{ title: string; body?: string }>;
  primaryCta?: { label: string; action: string };
  secondaryCta?: { label: string; action: string };
  imageIntent?: string;
  claims: ContentClaim[];
};

export type PageContentPlan = {
  slug: string;
  title: string;
  purpose: string;
  sections: SectionContent[];
};

export type ContentPlan = {
  version: "1.0";
  pages: PageContentPlan[];
  seo: {
    title: string;
    description: string;
  };
  faq?: Array<{ question: string; answer: string; claims: ContentClaim[] }>;
  imageIntents: string[];
  warnings: string[];
};

export type ModelContentPlan = Omit<ContentPlan, "version" | "warnings"> & {
  warnings?: string[];
};
