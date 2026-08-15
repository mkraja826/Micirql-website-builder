import { z } from "zod";
import type { Domain } from "@micirql/schema";

export const subtypeRuleSchema = z.object({
  id: z.string().min(1),
  domain: z.string().min(1),
  label: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  extraRequiredFacts: z.array(z.string()).default([]),
  extraRecommendedFacts: z.array(z.string()).default([]),
  extraActions: z.array(z.string()).default([]),
  extraPages: z.array(z.object({ slug: z.string().startsWith("/"), label: z.string().min(1), purpose: z.string().min(1), seoIntent: z.enum(["local", "commercial", "transactional", "informational", "brand", "mixed"]) })).default([]),
  seoTopics: z.array(z.string()).default([]),
  structuredDataTypes: z.array(z.string()).default([]),
  preferredSections: z.array(z.string()).default([]),
  avoidByDefault: z.array(z.string()).default([]),
});

export type SubtypeRule = z.infer<typeof subtypeRuleSchema> & { domain: Domain };

export const subtypeRules = [
  { id: "dental", domain: "clinic", label: "Dental Clinic", aliases: ["dentist", "dental hospital"], extraRequiredFacts: ["treatments", "dentists", "implant or specialist services where applicable"], extraRecommendedFacts: ["before-after cases", "technology", "specialist experience"], extraActions: ["case.enquiry"], extraPages: [{ slug: "/treatments", label: "Treatments", purpose: "Treatment discovery and SEO", seoIntent: "commercial" }], seoTopics: ["dental implants", "root canal", "cosmetic dentistry", "guided implants"], structuredDataTypes: ["Dentist"], preferredSections: ["services", "team", "gallery", "testimonials"], avoidByDefault: ["guaranteed treatment outcomes"] },
  { id: "dermatology", domain: "clinic", label: "Dermatology Clinic", aliases: ["skin clinic"], extraRequiredFacts: ["conditions treated", "procedures", "dermatologists"], extraRecommendedFacts: ["technology", "clinical credentials"], extraPages: [{ slug: "/conditions", label: "Conditions", purpose: "Condition-led discovery", seoIntent: "informational" }], seoTopics: ["acne treatment", "skin clinic", "laser treatment"], structuredDataTypes: ["MedicalClinic", "Physician"], preferredSections: ["services", "team", "process"], avoidByDefault: ["before-after claims without consent"] },
  { id: "physiotherapy", domain: "clinic", label: "Physiotherapy", aliases: ["physio"], extraRequiredFacts: ["conditions", "therapies", "physiotherapists"], extraPages: [{ slug: "/conditions", label: "Conditions", purpose: "Condition discovery", seoIntent: "informational" }], seoTopics: ["physiotherapy", "sports injury", "back pain"], structuredDataTypes: ["MedicalClinic"], preferredSections: ["services", "process", "team"] },
  { id: "diagnostics", domain: "clinic", label: "Diagnostics Center", aliases: ["lab", "diagnostic lab"], extraRequiredFacts: ["tests", "sample collection", "locations"], extraActions: ["test.request"], extraPages: [{ slug: "/tests", label: "Tests", purpose: "Test catalogue", seoIntent: "commercial" }], seoTopics: ["diagnostic tests", "blood tests", "home sample collection"], structuredDataTypes: ["MedicalClinic", "LocalBusiness"], preferredSections: ["services", "features", "contact"] },

  { id: "campaign", domain: "landing-page", label: "Campaign Landing Page", aliases: ["ad campaign"], extraRequiredFacts: ["campaign source", "offer", "single conversion event"], seoTopics: [], preferredSections: ["hero", "features", "testimonials", "cta"] },
  { id: "event", domain: "landing-page", label: "Event Landing Page", aliases: ["conference", "webinar"], extraRequiredFacts: ["event date", "venue or meeting link", "agenda"], extraActions: ["event.register"], extraPages: [], seoTopics: ["event name", "event location"], structuredDataTypes: ["Event"], preferredSections: ["hero", "features", "process", "cta"] },
  { id: "waitlist", domain: "landing-page", label: "Waitlist Landing Page", aliases: ["coming soon"], extraRequiredFacts: ["value proposition", "launch expectation"], extraActions: ["waitlist.join"], preferredSections: ["hero", "features", "cta"] },

  { id: "broker", domain: "real-estate", label: "Real Estate Broker", aliases: ["agent"], extraRequiredFacts: ["agent profile", "service areas"], extraActions: ["visit.request"], seoTopics: ["real estate agent", "property consultant"], structuredDataTypes: ["RealEstateAgent"], preferredSections: ["gallery", "team", "testimonials"] },
  { id: "developer", domain: "real-estate", label: "Property Developer", aliases: ["builder"], extraRequiredFacts: ["projects", "project status", "approvals"], extraActions: ["brochure.request"], extraPages: [{ slug: "/projects", label: "Projects", purpose: "Project portfolio", seoIntent: "commercial" }], seoTopics: ["new projects", "apartments", "villas"], structuredDataTypes: ["Organization", "Residence"], preferredSections: ["gallery", "features", "process"] },

  { id: "restaurant", domain: "restaurant", label: "Restaurant", aliases: ["dining"], extraRequiredFacts: ["cuisine", "menu", "reservation policy"], extraActions: ["reservation.request"], seoTopics: ["restaurant", "best restaurant", "cuisine"], structuredDataTypes: ["Restaurant", "Menu"], preferredSections: ["gallery", "services", "testimonials"] },
  { id: "cafe", domain: "restaurant", label: "Cafe", aliases: ["coffee shop"], extraRequiredFacts: ["menu", "hours", "specialties"], seoTopics: ["cafe", "coffee", "breakfast"], structuredDataTypes: ["CafeOrCoffeeShop"], preferredSections: ["hero", "gallery", "about"] },
  { id: "bakery", domain: "restaurant", label: "Bakery", aliases: ["patisserie"], extraRequiredFacts: ["products", "order policy"], extraActions: ["order.enquiry"], seoTopics: ["bakery", "cakes", "pastries"], structuredDataTypes: ["Bakery"], preferredSections: ["gallery", "services", "cta"] },

  { id: "consulting", domain: "corporate", label: "Consulting Firm", aliases: ["consultancy"], extraRequiredFacts: ["expertise areas", "industries served"], extraRecommendedFacts: ["case studies", "leadership expertise"], seoTopics: ["consulting services", "business consulting"], structuredDataTypes: ["ProfessionalService"], preferredSections: ["services", "process", "team"] },
  { id: "manufacturing", domain: "corporate", label: "Manufacturing Company", aliases: ["manufacturer"], extraRequiredFacts: ["products", "capabilities", "facilities"], extraRecommendedFacts: ["certifications", "quality systems"], extraPages: [{ slug: "/capabilities", label: "Capabilities", purpose: "Operational capabilities", seoIntent: "commercial" }], seoTopics: ["manufacturer", "industrial products"], structuredDataTypes: ["Organization"], preferredSections: ["features", "gallery", "process"] },

  { id: "b2b-saas", domain: "saas", label: "B2B SaaS", aliases: ["business software"], extraRequiredFacts: ["buyer persona", "use cases", "integrations"], extraActions: ["demo.request"], extraPages: [{ slug: "/use-cases", label: "Use Cases", purpose: "Buyer-specific discovery", seoIntent: "commercial" }], seoTopics: ["software for", "platform for", "automation"], structuredDataTypes: ["SoftwareApplication"], preferredSections: ["features", "process", "testimonials"] },
  { id: "ai-product", domain: "saas", label: "AI Product", aliases: ["ai software"], extraRequiredFacts: ["AI capability", "data handling", "limitations"], extraRecommendedFacts: ["model/provider transparency", "security"], seoTopics: ["AI platform", "AI automation"], structuredDataTypes: ["SoftwareApplication"], preferredSections: ["features", "process", "cta"], avoidByDefault: ["unverified AI accuracy claims"] },
  { id: "developer-tool", domain: "saas", label: "Developer Tool", aliases: ["devtool"], extraRequiredFacts: ["supported platforms", "API or SDK", "documentation"], extraActions: ["signup.start"], extraPages: [{ slug: "/docs", label: "Docs", purpose: "Developer onboarding", seoIntent: "informational" }], seoTopics: ["developer tool", "API", "SDK"], structuredDataTypes: ["SoftwareApplication"], preferredSections: ["features", "process"] },

  { id: "designer", domain: "portfolio", label: "Designer Portfolio", aliases: ["ui designer", "graphic designer"], extraRequiredFacts: ["projects", "design disciplines"], seoTopics: ["designer", "portfolio"], structuredDataTypes: ["Person", "CreativeWork"], preferredSections: ["gallery", "about", "testimonials"] },
  { id: "developer", domain: "portfolio", label: "Developer Portfolio", aliases: ["software developer", "web developer"], extraRequiredFacts: ["projects", "technology stack"], seoTopics: ["developer", "web developer"], structuredDataTypes: ["Person", "SoftwareSourceCode"], preferredSections: ["gallery", "features", "about"] },
  { id: "photographer", domain: "portfolio", label: "Photographer Portfolio", aliases: ["photography"], extraRequiredFacts: ["portfolio categories", "service locations"], seoTopics: ["photographer", "photography"], structuredDataTypes: ["Person", "ImageObject"], preferredSections: ["gallery", "hero", "contact"] },

  { id: "builder", domain: "construction", label: "Builder / General Contractor", aliases: ["contractor"], extraRequiredFacts: ["project types", "service areas", "licenses where required"], extraActions: ["quote.request", "sitevisit.request"], seoTopics: ["builder", "contractor", "construction company"], structuredDataTypes: ["HomeAndConstructionBusiness"], preferredSections: ["services", "gallery", "process"] },
  { id: "interiors", domain: "construction", label: "Interior Design / Fit-out", aliases: ["interior designer"], extraRequiredFacts: ["services", "project styles", "portfolio"], extraActions: ["consultation.request"], seoTopics: ["interior designer", "interior design"], structuredDataTypes: ["HomeAndConstructionBusiness"], preferredSections: ["gallery", "services", "testimonials"] },
  { id: "electrical", domain: "construction", label: "Electrical Services", aliases: ["electrician"], extraRequiredFacts: ["services", "service area", "emergency availability if real"], extraActions: ["service.request"], seoTopics: ["electrician", "electrical services"], structuredDataTypes: ["Electrician"], preferredSections: ["services", "features", "contact"] },
  { id: "maintenance", domain: "construction", label: "Maintenance Services", aliases: ["facility maintenance"], extraRequiredFacts: ["service categories", "coverage area", "response model"], extraActions: ["service.request"], seoTopics: ["maintenance services", "facility maintenance"], structuredDataTypes: ["HomeAndConstructionBusiness"], preferredSections: ["services", "process", "contact"] },

  { id: "academy", domain: "education", label: "Academy / Training Institute", aliases: ["training institute"], extraRequiredFacts: ["courses", "faculty", "schedule"], extraActions: ["enrolment.enquiry"], extraPages: [{ slug: "/courses", label: "Courses", purpose: "Course discovery", seoIntent: "commercial" }], seoTopics: ["training institute", "courses"], structuredDataTypes: ["EducationalOrganization", "Course"], preferredSections: ["services", "team", "testimonials"] },
  { id: "online-course", domain: "education", label: "Online Course", aliases: ["elearning"], extraRequiredFacts: ["curriculum", "instructor", "delivery format"], extraActions: ["enrolment.enquiry"], seoTopics: ["online course", "learn online"], structuredDataTypes: ["Course"], preferredSections: ["features", "process", "testimonials"] },
  { id: "tutor", domain: "education", label: "Tutor / Coaching", aliases: ["coaching center"], extraRequiredFacts: ["subjects", "levels", "availability"], extraActions: ["trial.request"], seoTopics: ["tutor", "coaching"], structuredDataTypes: ["EducationalOrganization"], preferredSections: ["services", "team", "contact"] },

  { id: "hotel", domain: "hospitality", label: "Hotel", aliases: ["business hotel"], extraRequiredFacts: ["rooms", "amenities", "location", "booking method"], extraActions: ["booking.request"], extraPages: [{ slug: "/rooms", label: "Rooms", purpose: "Room discovery", seoIntent: "commercial" }], seoTopics: ["hotel", "rooms", "stay"], structuredDataTypes: ["Hotel"], preferredSections: ["gallery", "features", "testimonials", "contact"] },
  { id: "resort", domain: "hospitality", label: "Resort", aliases: ["holiday resort"], extraRequiredFacts: ["rooms or villas", "experiences", "amenities", "location"], extraActions: ["booking.request"], extraPages: [{ slug: "/experiences", label: "Experiences", purpose: "Experience discovery", seoIntent: "commercial" }], seoTopics: ["resort", "vacation", "getaway"], structuredDataTypes: ["Resort"], preferredSections: ["gallery", "features", "services", "testimonials"] },
  { id: "homestay", domain: "hospitality", label: "Homestay / Guesthouse", aliases: ["guest house", "bnb"], extraRequiredFacts: ["rooms", "host information", "house rules", "location"], extraActions: ["booking.request"], seoTopics: ["homestay", "guesthouse"], structuredDataTypes: ["LodgingBusiness"], preferredSections: ["gallery", "about", "contact"] }
] satisfies SubtypeRule[];

export function subtypesForDomain(domain: Domain): SubtypeRule[] {
  return subtypeRules.filter((rule) => rule.domain === domain);
}

export function getSubtypeRule(domain: Domain, subtype: string): SubtypeRule | undefined {
  const normalized = subtype.trim().toLowerCase();
  return subtypeRules.find((rule) => rule.domain === domain && (rule.id === normalized || rule.aliases.some((alias) => alias.toLowerCase() === normalized)));
}
