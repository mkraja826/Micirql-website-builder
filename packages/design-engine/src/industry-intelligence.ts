export type IndustryIntelligencePack = {
  id: string;
  label: string;
  archetypeId: string;
  keywords: string[];
  priorities: string[];
  recommendedSections: string[];
  trustSignals: string[];
  ctaPatterns: string[];
  seoTopics: string[];
  contentPrompts: Record<string, string[]>;
};

export const INDUSTRY_INTELLIGENCE_PACKS: IndustryIntelligencePack[] = [
  {
    id: "dental-clinic",
    label: "Dental Clinic",
    archetypeId: "healthcare-clinic",
    keywords: ["dental", "dentist", "implant", "orthodont", "endodont", "prosthodont", "periodont"],
    priorities: ["treatments", "doctor expertise", "technology", "patient trust", "appointment conversion", "location"],
    recommendedSections: ["treatments", "doctor", "technology", "testimonials", "faq", "location", "cta"],
    trustSignals: ["doctor qualifications", "experience when provided", "technology used", "verified patient reviews", "clinic location", "professional memberships when provided"],
    ctaPatterns: ["Book consultation", "Request assessment", "Call clinic", "Ask about treatment"],
    seoTopics: ["treatments", "implant dentistry", "doctor expertise", "clinic location", "appointment", "technology"],
    contentPrompts: {
      hero: ["Lead with the clinic's strongest treatment proposition and patient benefit.", "Mention location only when provided."],
      services: ["Use actual treatments from discovery data.", "Keep treatment descriptions clear and patient-friendly."],
      team: ["Use real doctor names, qualifications and specialties only when supplied."],
      testimonials: ["Use verified testimonials only; otherwise keep the proof area factual."],
    },
  },
  {
    id: "restaurant-cafe",
    label: "Restaurant / Cafe",
    archetypeId: "hospitality",
    keywords: ["restaurant", "cafe", "coffee", "bakery", "bistro", "dining", "food"],
    priorities: ["menu", "atmosphere", "signature offerings", "location", "hours", "reservation"],
    recommendedSections: ["menu", "gallery", "story", "testimonials", "location", "reservation"],
    trustSignals: ["real reviews", "chef or founder story when provided", "location", "opening hours", "dietary information when supplied"],
    ctaPatterns: ["Reserve a table", "View menu", "Call restaurant", "Get directions"],
    seoTopics: ["cuisine", "restaurant location", "menu", "reservations", "opening hours"],
    contentPrompts: {
      hero: ["Lead with cuisine, atmosphere or a signature experience."],
      services: ["Represent actual menu categories or dining experiences."],
      gallery: ["Reserve slots for food, venue and atmosphere photography."],
      contact: ["Prioritize location, hours and reservation actions."],
    },
  },
  {
    id: "saas-software",
    label: "SaaS / Software",
    archetypeId: "saas-technology",
    keywords: ["saas", "software", "platform", "app", "application", "technology", "cloud"],
    priorities: ["problem", "product value", "features", "use cases", "proof", "pricing or demo", "security when relevant"],
    recommendedSections: ["features", "product-demo", "use-cases", "integrations", "proof", "pricing", "faq", "cta"],
    trustSignals: ["real customer logos", "verified metrics", "security certifications when supplied", "integration names when supplied", "case studies"],
    ctaPatterns: ["Start free", "Book demo", "See product", "Talk to sales"],
    seoTopics: ["software category", "use cases", "features", "integrations", "industry solutions"],
    contentPrompts: {
      hero: ["State the product outcome before listing features."],
      features: ["Tie every feature to a concrete user benefit."],
      gallery: ["Use product/interface placeholders rather than stock photography by default."],
      testimonials: ["Use customer proof only when supplied."],
    },
  },
  {
    id: "real-estate",
    label: "Real Estate",
    archetypeId: "real-estate",
    keywords: ["real estate", "property", "properties", "builder", "developer", "broker", "realty", "apartment", "villa"],
    priorities: ["properties or projects", "location", "amenities", "trust", "agent or developer credibility", "enquiry"],
    recommendedSections: ["featured-properties", "projects", "amenities", "gallery", "team", "testimonials", "contact"],
    trustSignals: ["project status when provided", "developer history", "real testimonials", "location", "regulatory identifiers when provided"],
    ctaPatterns: ["Enquire now", "Schedule visit", "View properties", "Talk to agent"],
    seoTopics: ["property type", "project location", "amenities", "developer", "property enquiries"],
    contentPrompts: {
      hero: ["Lead with property or project proposition and location when supplied."],
      services: ["Use actual property categories or projects."],
      gallery: ["Prioritize project and property imagery slots."],
      contact: ["Make enquiry and site-visit actions prominent."],
    },
  },
  {
    id: "professional-consulting",
    label: "Professional Services / Consulting",
    archetypeId: "professional-services",
    keywords: ["consult", "consulting", "legal", "law", "account", "advisory", "agency", "professional service", "it service"],
    priorities: ["expertise", "services", "proof", "process", "team", "lead generation"],
    recommendedSections: ["expertise", "services", "case-studies", "team", "process", "insights", "cta", "contact"],
    trustSignals: ["client names when permitted", "case studies", "qualifications", "experience", "industry expertise"],
    ctaPatterns: ["Book consultation", "Discuss your project", "Request proposal", "Talk to an expert"],
    seoTopics: ["service expertise", "industry expertise", "consulting services", "location when relevant"],
    contentPrompts: {
      hero: ["Lead with the business outcome and area of expertise."],
      services: ["Describe services in client language rather than internal jargon."],
      testimonials: ["Prefer case-study proof over vague praise when evidence exists."],
      team: ["Highlight expertise and role, not generic biographies."],
    },
  },
  {
    id: "education-training",
    label: "Education / Training",
    archetypeId: "education-training",
    keywords: ["education", "training", "academy", "course", "school", "college", "tutor", "coaching"],
    priorities: ["courses", "outcomes", "curriculum", "faculty", "proof", "enrolment"],
    recommendedSections: ["courses", "outcomes", "curriculum", "faculty", "testimonials", "faq", "cta"],
    trustSignals: ["faculty credentials", "recognized certification when supplied", "verified outcomes", "student reviews"],
    ctaPatterns: ["Enrol now", "View courses", "Talk to admissions", "Download curriculum"],
    seoTopics: ["course names", "training topics", "learning outcomes", "certification", "location or online delivery"],
    contentPrompts: {
      hero: ["Lead with what the learner will be able to do after completing the program."],
      services: ["Use actual courses or programs and distinguish level or audience when provided."],
      process: ["Explain curriculum or learning journey in a simple sequence."],
      team: ["Use real faculty qualifications only."],
    },
  },
  {
    id: "ecommerce-retail",
    label: "E-commerce / Retail",
    archetypeId: "ecommerce",
    keywords: ["ecommerce", "e-commerce", "retail", "store", "shop", "boutique", "product brand"],
    priorities: ["products", "categories", "benefits", "reviews", "purchase confidence", "conversion"],
    recommendedSections: ["categories", "product-grid", "featured-products", "benefits", "reviews", "cta"],
    trustSignals: ["verified reviews", "returns policy", "shipping information", "secure payment messaging when true", "product specifications"],
    ctaPatterns: ["Shop now", "View collection", "Browse products", "See details"],
    seoTopics: ["product categories", "product names", "brand", "purchase intent keywords"],
    contentPrompts: {
      hero: ["Lead with the strongest collection, product benefit or campaign."],
      services: ["Represent real categories or products only."],
      features: ["Use benefits such as materials, delivery or product qualities only when supplied."],
      testimonials: ["Use verified product or customer reviews only."],
    },
  },
  {
    id: "corporate-industrial",
    label: "Corporate / Industrial",
    archetypeId: "corporate-company",
    keywords: ["manufactur", "industrial", "enterprise", "corporate", "engineering", "factory", "infrastructure"],
    priorities: ["company credibility", "capabilities", "industries", "projects", "certifications", "contact"],
    recommendedSections: ["company", "capabilities", "industries", "projects", "certifications", "leadership", "contact"],
    trustSignals: ["certifications", "project history", "facilities", "years in operation when provided", "client sectors"],
    ctaPatterns: ["Request information", "Discuss requirement", "Contact sales", "View capabilities"],
    seoTopics: ["capabilities", "industries served", "manufacturing or service category", "locations"],
    contentPrompts: {
      hero: ["State what the company does and who it serves without vague corporate language."],
      features: ["Translate capabilities into buyer-relevant outcomes."],
      gallery: ["Use facility, project or product placeholders depending on supplied business context."],
      testimonials: ["Prefer certifications, projects or client proof over generic testimonials."],
    },
  },
];

export function resolveIndustryIntelligence(industry?: string, subindustry?: string): IndustryIntelligencePack | undefined {
  const value = `${industry ?? ""} ${subindustry ?? ""}`.trim().toLowerCase();
  return INDUSTRY_INTELLIGENCE_PACKS.find((pack) => pack.keywords.some((keyword) => value.includes(keyword)));
}
