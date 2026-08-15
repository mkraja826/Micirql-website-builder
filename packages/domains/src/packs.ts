import type { DomainPack } from "./types";

export const domainPacks: DomainPack[] = [
  {
    domain: "clinic",
    label: "Healthcare / Clinic",
    primaryGoals: ["appointments", "qualified enquiries", "local discovery", "trust"],
    commonSubtypes: ["dental", "medical", "physiotherapy", "dermatology", "diagnostics"],
    requiredBusinessFacts: ["services", "clinicians", "locations", "opening hours", "contact details"],
    recommendedTrustSignals: ["doctor credentials", "experience", "case outcomes", "reviews", "technology", "accreditations"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Trust and conversion overview", sectionFamilies: ["navbar", "hero", "services", "testimonials", "cta", "contact", "footer"], seoIntent: "local" },
      { slug: "/services", label: "Treatments / Services", required: true, purpose: "Service discovery", sectionFamilies: ["hero", "services", "features", "cta"], seoIntent: "commercial" },
      { slug: "/doctors", label: "Doctors", required: true, purpose: "Clinical authority", sectionFamilies: ["hero", "team", "testimonials", "cta"], seoIntent: "brand" },
      { slug: "/about", label: "About", required: true, purpose: "Clinic credibility", sectionFamilies: ["hero", "about", "features", "team"], seoIntent: "brand" },
      { slug: "/contact", label: "Contact / Appointment", required: true, purpose: "Lead and appointment capture", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create", "appointment.request"],
    optionalActions: ["newsletter.subscribe", "case.enquiry", "chat.start"],
    seo: { defaultScope: "local", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: true, blogRecommended: true, structuredDataTypes: ["MedicalClinic", "Dentist", "Physician", "FAQPage", "BreadcrumbList"] },
    preferredSectionOrder: ["navbar", "hero", "services", "features", "process", "testimonials", "team", "cta", "contact", "footer"],
    avoidByDefault: ["unverified medical claims", "fake outcomes", "fake booking availability"]
  },
  {
    domain: "landing-page",
    label: "Landing Page",
    primaryGoals: ["single conversion goal", "lead capture", "campaign response"],
    commonSubtypes: ["campaign", "product launch", "event", "waitlist", "lead magnet"],
    requiredBusinessFacts: ["offer", "audience", "primary CTA", "proof", "conversion goal"],
    recommendedTrustSignals: ["customer logos", "testimonials", "results", "guarantees where valid"],
    defaultPages: [{ slug: "/", label: "Landing Page", required: true, purpose: "Focused conversion journey", sectionFamilies: ["navbar", "hero", "features", "process", "testimonials", "cta", "contact", "footer"], seoIntent: "transactional" }],
    requiredActions: ["lead.create"],
    optionalActions: ["newsletter.subscribe", "booking.request"],
    seo: { defaultScope: "mixed", askLocations: false, askLanguages: true, serviceOrTopicPages: false, locationPages: false, blogRecommended: false, structuredDataTypes: ["WebPage", "FAQPage"] },
    preferredSectionOrder: ["navbar", "hero", "features", "process", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["large navigation trees", "unrelated pages", "multiple competing primary CTAs"]
  },
  {
    domain: "real-estate",
    label: "Real Estate",
    primaryGoals: ["property enquiries", "project discovery", "agent leads"],
    commonSubtypes: ["broker", "developer", "project marketing", "property consultant"],
    requiredBusinessFacts: ["properties or projects", "locations", "agent details", "amenities", "contact details"],
    recommendedTrustSignals: ["RERA or local registration where applicable", "developer credentials", "project status", "location details", "testimonials"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Featured properties and lead capture", sectionFamilies: ["navbar", "hero", "gallery", "features", "testimonials", "contact", "footer"], seoIntent: "commercial" },
      { slug: "/properties", label: "Properties", required: true, purpose: "Property discovery", sectionFamilies: ["hero", "gallery", "features", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: true, purpose: "Agency credibility", sectionFamilies: ["hero", "about", "team", "testimonials"], seoIntent: "brand" },
      { slug: "/contact", label: "Contact", required: true, purpose: "Enquiries", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create", "property.enquiry"],
    optionalActions: ["visit.request", "brochure.request", "call.request"],
    seo: { defaultScope: "local", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: true, blogRecommended: true, structuredDataTypes: ["RealEstateAgent", "Residence", "BreadcrumbList"] },
    preferredSectionOrder: ["navbar", "hero", "gallery", "features", "process", "testimonials", "team", "contact", "footer"],
    avoidByDefault: ["fake scarcity", "unverified prices", "invented availability"]
  },
  {
    domain: "restaurant",
    label: "Restaurant / Cafe",
    primaryGoals: ["reservations", "calls", "directions", "menu discovery"],
    commonSubtypes: ["restaurant", "cafe", "bakery", "bar", "cloud kitchen"],
    requiredBusinessFacts: ["menu", "location", "hours", "contact details", "reservation policy"],
    recommendedTrustSignals: ["food photography", "chef story", "reviews", "awards", "location information"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Dining proposition", sectionFamilies: ["navbar", "hero", "gallery", "about", "testimonials", "cta", "footer"], seoIntent: "local" },
      { slug: "/menu", label: "Menu", required: true, purpose: "Menu discovery", sectionFamilies: ["hero", "services", "gallery", "cta"], seoIntent: "commercial" },
      { slug: "/contact", label: "Visit / Reserve", required: true, purpose: "Reservation and location", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["reservation.request"],
    optionalActions: ["lead.create", "newsletter.subscribe"],
    seo: { defaultScope: "local", askLocations: true, askLanguages: true, serviceOrTopicPages: false, locationPages: true, blogRecommended: false, structuredDataTypes: ["Restaurant", "Menu", "LocalBusiness"] },
    preferredSectionOrder: ["navbar", "hero", "gallery", "about", "services", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["fake reservation availability", "invented menu items", "heavy autoplay media"]
  },
  {
    domain: "corporate",
    label: "Corporate / Business",
    primaryGoals: ["credibility", "enquiries", "service discovery", "recruitment"],
    commonSubtypes: ["consulting", "professional services", "manufacturing", "B2B services"],
    requiredBusinessFacts: ["services", "company profile", "locations", "leadership", "contact details"],
    recommendedTrustSignals: ["clients", "certifications", "case studies", "leadership", "years in business"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Corporate overview", sectionFamilies: ["navbar", "hero", "services", "features", "testimonials", "cta", "footer"], seoIntent: "commercial" },
      { slug: "/services", label: "Services", required: true, purpose: "Service discovery", sectionFamilies: ["hero", "services", "process", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: true, purpose: "Company credibility", sectionFamilies: ["hero", "about", "team", "features"], seoIntent: "brand" },
      { slug: "/contact", label: "Contact", required: true, purpose: "Business enquiries", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create"],
    optionalActions: ["newsletter.subscribe", "document.request", "career.enquiry"],
    seo: { defaultScope: "national", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: false, blogRecommended: true, structuredDataTypes: ["Organization", "Service", "BreadcrumbList"] },
    preferredSectionOrder: ["navbar", "hero", "services", "features", "process", "testimonials", "team", "cta", "contact", "footer"],
    avoidByDefault: ["generic stock claims", "fake client logos", "unverified certifications"]
  },
  {
    domain: "saas",
    label: "SaaS / Technology",
    primaryGoals: ["demo requests", "signups", "product understanding", "lead capture"],
    commonSubtypes: ["software", "AI product", "developer tool", "B2B SaaS"],
    requiredBusinessFacts: ["product", "target users", "features", "pricing approach", "primary CTA"],
    recommendedTrustSignals: ["customer logos", "security information", "integrations", "case studies", "uptime or performance claims when verified"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Product proposition", sectionFamilies: ["navbar", "hero", "features", "process", "testimonials", "cta", "footer"], seoIntent: "commercial" },
      { slug: "/features", label: "Features", required: true, purpose: "Product capability discovery", sectionFamilies: ["hero", "features", "process", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: false, purpose: "Company credibility", sectionFamilies: ["hero", "about", "team"], seoIntent: "brand" },
      { slug: "/contact", label: "Demo / Contact", required: true, purpose: "Lead capture", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create"],
    optionalActions: ["demo.request", "newsletter.subscribe", "signup.start"],
    seo: { defaultScope: "international", askLocations: false, askLanguages: true, serviceOrTopicPages: true, locationPages: false, blogRecommended: true, structuredDataTypes: ["SoftwareApplication", "Organization", "FAQPage"] },
    preferredSectionOrder: ["navbar", "hero", "features", "process", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["fake integrations", "invented security certifications", "unverified performance claims"]
  },
  {
    domain: "portfolio",
    label: "Portfolio / Personal Brand",
    primaryGoals: ["showcase work", "enquiries", "authority", "personal discovery"],
    commonSubtypes: ["designer", "developer", "consultant", "photographer", "creator"],
    requiredBusinessFacts: ["bio", "work or cases", "skills or services", "contact details"],
    recommendedTrustSignals: ["case studies", "client testimonials", "recognition", "published work"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Personal positioning", sectionFamilies: ["navbar", "hero", "gallery", "about", "testimonials", "cta", "footer"], seoIntent: "brand" },
      { slug: "/work", label: "Work", required: true, purpose: "Portfolio showcase", sectionFamilies: ["hero", "gallery", "features", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: false, purpose: "Biography and authority", sectionFamilies: ["hero", "about", "features"], seoIntent: "brand" },
      { slug: "/contact", label: "Contact", required: true, purpose: "Project enquiries", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create"],
    optionalActions: ["newsletter.subscribe", "call.request"],
    seo: { defaultScope: "mixed", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: false, blogRecommended: true, structuredDataTypes: ["Person", "ProfilePage", "CreativeWork"] },
    preferredSectionOrder: ["navbar", "hero", "gallery", "about", "features", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["fake clients", "fake awards"]
  },
  {
    domain: "construction",
    label: "Construction / Home Services",
    primaryGoals: ["quote requests", "calls", "local leads", "project credibility"],
    commonSubtypes: ["builder", "contractor", "interiors", "electrical", "plumbing", "maintenance"],
    requiredBusinessFacts: ["services", "service area", "projects", "licenses where relevant", "contact details"],
    recommendedTrustSignals: ["project gallery", "licenses", "insurance", "reviews", "years of experience"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Local service conversion", sectionFamilies: ["navbar", "hero", "services", "gallery", "testimonials", "cta", "footer"], seoIntent: "local" },
      { slug: "/services", label: "Services", required: true, purpose: "Service discovery", sectionFamilies: ["hero", "services", "process", "cta"], seoIntent: "commercial" },
      { slug: "/projects", label: "Projects", required: true, purpose: "Work showcase", sectionFamilies: ["hero", "gallery", "features", "cta"], seoIntent: "commercial" },
      { slug: "/contact", label: "Quote / Contact", required: true, purpose: "Quote capture", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create", "quote.request"],
    optionalActions: ["sitevisit.request", "call.request"],
    seo: { defaultScope: "local", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: true, blogRecommended: true, structuredDataTypes: ["HomeAndConstructionBusiness", "Service", "LocalBusiness"] },
    preferredSectionOrder: ["navbar", "hero", "services", "gallery", "process", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["unverified licenses", "fake project imagery", "fake pricing"]
  },
  {
    domain: "education",
    label: "Education / Training",
    primaryGoals: ["enrolment enquiries", "course discovery", "authority", "lead capture"],
    commonSubtypes: ["academy", "training institute", "tutor", "online course", "coaching"],
    requiredBusinessFacts: ["courses", "audience", "instructors", "delivery format", "contact details"],
    recommendedTrustSignals: ["instructor credentials", "student outcomes", "testimonials", "curriculum", "certification details where valid"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Education proposition", sectionFamilies: ["navbar", "hero", "services", "features", "testimonials", "cta", "footer"], seoIntent: "commercial" },
      { slug: "/courses", label: "Courses", required: true, purpose: "Course discovery", sectionFamilies: ["hero", "services", "process", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: true, purpose: "Institution credibility", sectionFamilies: ["hero", "about", "team", "testimonials"], seoIntent: "brand" },
      { slug: "/contact", label: "Enquire", required: true, purpose: "Enrolment leads", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["lead.create", "course.enquiry"],
    optionalActions: ["newsletter.subscribe", "counselling.request"],
    seo: { defaultScope: "regional", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: true, blogRecommended: true, structuredDataTypes: ["EducationalOrganization", "Course", "Person"] },
    preferredSectionOrder: ["navbar", "hero", "services", "features", "process", "team", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["fake accreditation", "guaranteed outcome claims"]
  },
  {
    domain: "hospitality",
    label: "Hospitality / Travel",
    primaryGoals: ["booking enquiries", "calls", "property discovery", "destination confidence"],
    commonSubtypes: ["hotel", "resort", "homestay", "tour operator", "travel service"],
    requiredBusinessFacts: ["rooms or experiences", "location", "amenities", "contact details", "booking approach"],
    recommendedTrustSignals: ["property photography", "guest reviews", "amenities", "location", "policies"],
    defaultPages: [
      { slug: "/", label: "Home", required: true, purpose: "Property or experience proposition", sectionFamilies: ["navbar", "hero", "gallery", "features", "testimonials", "cta", "footer"], seoIntent: "local" },
      { slug: "/stay", label: "Rooms / Experiences", required: true, purpose: "Inventory discovery", sectionFamilies: ["hero", "gallery", "services", "features", "cta"], seoIntent: "commercial" },
      { slug: "/about", label: "About", required: false, purpose: "Property story", sectionFamilies: ["hero", "about", "gallery"], seoIntent: "brand" },
      { slug: "/contact", label: "Book / Contact", required: true, purpose: "Booking enquiry", sectionFamilies: ["hero", "contact", "cta"], seoIntent: "transactional" }
    ],
    requiredActions: ["booking.request"],
    optionalActions: ["lead.create", "newsletter.subscribe"],
    seo: { defaultScope: "international", askLocations: true, askLanguages: true, serviceOrTopicPages: true, locationPages: true, blogRecommended: true, structuredDataTypes: ["Hotel", "LodgingBusiness", "TouristTrip", "LocalBusiness"] },
    preferredSectionOrder: ["navbar", "hero", "gallery", "features", "services", "testimonials", "cta", "contact", "footer"],
    avoidByDefault: ["fake availability", "fake room pricing", "invented amenities"]
  }
];
