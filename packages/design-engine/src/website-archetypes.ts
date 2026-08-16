export type RequirementLevel = "required" | "recommended" | "optional";

export type WebsiteArchetype = {
  id: string;
  name: string;
  goal: string;
  examples: string[];
  sections: Record<RequirementLevel, string[]>;
};

/**
 * MiCirql Design Engine V1
 *
 * Industry is intentionally separate from website archetype.
 * Example: Dental -> healthcare-clinic; Law -> professional-services.
 * AI may classify/rank, but it may not remove required site anatomy.
 */
export const WEBSITE_ARCHETYPES: WebsiteArchetype[] = [
  {
    id: "local-service",
    name: "Local Service / Lead Generation",
    goal: "Generate enquiries, calls, quotes or appointments.",
    examples: ["contractor", "electrician", "salon", "repair service", "home service"],
    sections: {
      required: ["navbar", "hero", "services", "cta", "contact", "footer"],
      recommended: ["trust", "process", "testimonials", "faq", "location"],
      optional: ["gallery", "team", "pricing", "blog", "service-area"],
    },
  },
  {
    id: "professional-services",
    name: "Professional Services",
    goal: "Build authority and convert qualified leads.",
    examples: ["consulting", "legal", "accounting", "agency", "IT services"],
    sections: {
      required: ["navbar", "hero", "services", "cta", "contact", "footer"],
      recommended: ["expertise", "proof", "process", "case-studies", "team", "insights"],
      optional: ["clients", "stats", "faq", "portfolio", "blog"],
    },
  },
  {
    id: "healthcare-clinic",
    name: "Healthcare / Clinic",
    goal: "Build trust and drive appropriate appointments or enquiries.",
    examples: ["dental", "medical clinic", "physiotherapy", "diagnostics"],
    sections: {
      required: ["navbar", "hero", "treatments", "cta", "contact", "footer"],
      recommended: ["doctor", "technology", "proof", "testimonials", "faq", "location"],
      optional: ["before-after", "gallery", "team", "blog", "finance", "international-patients"],
    },
  },
  {
    id: "hospitality",
    name: "Restaurant / Hospitality",
    goal: "Drive reservations, visits and high-intent discovery.",
    examples: ["restaurant", "cafe", "hotel", "resort"],
    sections: {
      required: ["navbar", "hero", "offerings", "location", "cta", "footer"],
      recommended: ["menu", "gallery", "story", "testimonials", "reservation"],
      optional: ["chef", "rooms", "amenities", "events", "faq"],
    },
  },
  {
    id: "real-estate",
    name: "Real Estate",
    goal: "Generate property, project or agent enquiries.",
    examples: ["real estate agent", "builder", "property developer", "broker"],
    sections: {
      required: ["navbar", "hero", "listings", "cta", "contact", "footer"],
      recommended: ["featured-properties", "projects", "amenities", "team", "testimonials"],
      optional: ["property-search", "map", "neighborhoods", "stats", "faq"],
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce / Retail",
    goal: "Help visitors discover products and purchase efficiently.",
    examples: ["brand", "boutique", "online store", "retailer"],
    sections: {
      required: ["navbar", "hero", "product-grid", "cta", "footer"],
      recommended: ["promo-bar", "categories", "featured-products", "benefits", "reviews"],
      optional: ["newsletter", "story", "comparison", "faq", "store-locator"],
    },
  },
  {
    id: "saas-technology",
    name: "SaaS / Technology",
    goal: "Drive signup, demo, trial or sales conversations.",
    examples: ["SaaS", "software", "app", "technology platform"],
    sections: {
      required: ["navbar", "hero", "features", "cta", "footer"],
      recommended: ["product-demo", "use-cases", "integrations", "proof", "pricing", "faq"],
      optional: ["security", "comparison", "api", "enterprise", "blog", "changelog"],
    },
  },
  {
    id: "portfolio-creative",
    name: "Portfolio / Creative",
    goal: "Showcase work and convert visitors into enquiries.",
    examples: ["designer", "architect", "photographer", "creative studio"],
    sections: {
      required: ["navbar", "hero", "portfolio", "contact", "footer"],
      recommended: ["featured-project", "about", "services", "clients", "cta"],
      optional: ["awards", "process", "testimonials", "journal", "team"],
    },
  },
  {
    id: "education-training",
    name: "Education / Training",
    goal: "Explain learning outcomes and drive enrolment.",
    examples: ["academy", "course provider", "training institute", "tutor"],
    sections: {
      required: ["navbar", "hero", "courses", "cta", "contact", "footer"],
      recommended: ["outcomes", "curriculum", "faculty", "testimonials", "faq"],
      optional: ["pricing", "schedule", "certificates", "resources", "blog"],
    },
  },
  {
    id: "corporate-company",
    name: "Corporate / Company",
    goal: "Establish corporate credibility and communicate capabilities.",
    examples: ["manufacturer", "enterprise", "B2B company", "industrial company"],
    sections: {
      required: ["navbar", "hero", "company", "capabilities", "contact", "footer"],
      recommended: ["industries", "projects", "proof", "certifications", "cta"],
      optional: ["news", "leadership", "locations", "sustainability", "careers", "investors"],
    },
  },
];

export const SITE_INVARIANTS = {
  requiredShell: ["navbar", "footer"],
  mobileNavigation: "burger-menu",
  requirements: [
    "responsive-layout",
    "accessible-navigation",
    "working-primary-cta",
    "no-horizontal-overflow",
    "mobile-safe-controls",
    "seo-title-description",
  ],
} as const;
