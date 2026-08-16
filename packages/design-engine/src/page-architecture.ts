import type { Site } from "@micirql/schema";
import type { IndustryIntelligencePack } from "./industry-intelligence";

export type PageRequirement = {
  id: string;
  name: string;
  path: string;
  level: "required" | "recommended" | "optional";
  purpose: string;
  preferredSections: string[];
};

export type IndustryPageArchitecture = {
  industryPackId: string;
  pages: PageRequirement[];
};

export const INDUSTRY_PAGE_ARCHITECTURES: IndustryPageArchitecture[] = [
  {
    industryPackId: "dental-clinic",
    pages: [
      page("home", "Home", "/", "required", "Establish trust and convert visitors into consultations.", ["hero", "treatments", "doctor", "technology", "testimonials", "cta", "contact"]),
      page("treatments", "Treatments", "/treatments", "required", "Explain the clinic's real treatment offering clearly.", ["hero", "services", "features", "faq", "cta"]),
      page("doctor", "Doctor", "/doctor", "recommended", "Present clinician expertise using supplied credentials only.", ["hero", "team", "about", "proof", "cta"]),
      page("cases", "Cases", "/cases", "recommended", "Show verified treatment cases when the clinic supplies them.", ["hero", "gallery", "testimonials", "cta"]),
      page("contact", "Contact", "/contact", "required", "Make appointment, call and location actions easy.", ["hero", "contact", "location", "cta"]),
      page("blog", "Insights", "/blog", "optional", "Support patient education and search discovery.", ["hero", "services", "cta"]),
    ],
  },
  {
    industryPackId: "restaurant-cafe",
    pages: [
      page("home", "Home", "/", "required", "Communicate cuisine, atmosphere and reservation intent.", ["hero", "services", "gallery", "testimonials", "location", "cta"]),
      page("menu", "Menu", "/menu", "required", "Present actual menu categories and signature offerings.", ["hero", "services", "features", "cta"]),
      page("gallery", "Gallery", "/gallery", "recommended", "Show food, venue and atmosphere photography.", ["hero", "gallery", "cta"]),
      page("about", "Our Story", "/about", "recommended", "Tell the restaurant story when real details are provided.", ["hero", "about", "team", "cta"]),
      page("contact", "Visit", "/contact", "required", "Prioritize location, hours, directions and reservation actions.", ["hero", "contact", "location", "cta"]),
    ],
  },
  {
    industryPackId: "saas-software",
    pages: [
      page("home", "Home", "/", "required", "Explain the product outcome and drive demo or signup.", ["hero", "features", "proof", "cta"]),
      page("product", "Product", "/product", "required", "Explain features, workflows and product value.", ["hero", "features", "gallery", "process", "cta"]),
      page("solutions", "Solutions", "/solutions", "recommended", "Organize real use cases or audience-specific solutions.", ["hero", "services", "features", "proof", "cta"]),
      page("pricing", "Pricing", "/pricing", "recommended", "Present actual pricing only when supplied.", ["hero", "services", "features", "faq", "cta"]),
      page("resources", "Resources", "/resources", "optional", "Support product education and organic discovery.", ["hero", "services", "cta"]),
      page("contact", "Contact", "/contact", "required", "Provide sales/demo contact path.", ["hero", "contact", "cta"]),
    ],
  },
  {
    industryPackId: "real-estate",
    pages: [
      page("home", "Home", "/", "required", "Introduce projects/properties and drive enquiries.", ["hero", "gallery", "features", "proof", "cta"]),
      page("properties", "Properties", "/properties", "required", "Present actual properties or projects.", ["hero", "gallery", "services", "features", "cta"]),
      page("about", "About", "/about", "recommended", "Establish developer, broker or agency credibility.", ["hero", "about", "team", "proof", "cta"]),
      page("contact", "Contact", "/contact", "required", "Drive enquiries and site visits.", ["hero", "contact", "location", "cta"]),
    ],
  },
  {
    industryPackId: "professional-consulting",
    pages: [
      page("home", "Home", "/", "required", "Establish expertise and generate qualified leads.", ["hero", "services", "proof", "team", "cta"]),
      page("services", "Services", "/services", "required", "Explain real service offerings and outcomes.", ["hero", "services", "process", "proof", "cta"]),
      page("about", "About", "/about", "recommended", "Build authority through real team and experience details.", ["hero", "about", "team", "proof", "cta"]),
      page("work", "Case Studies", "/case-studies", "recommended", "Show substantiated client work when supplied.", ["hero", "gallery", "testimonials", "cta"]),
      page("contact", "Contact", "/contact", "required", "Create a clear consultation or proposal path.", ["hero", "contact", "cta"]),
    ],
  },
  {
    industryPackId: "education-training",
    pages: [
      page("home", "Home", "/", "required", "Explain learning outcomes and drive enrolment.", ["hero", "services", "features", "proof", "cta"]),
      page("courses", "Courses", "/courses", "required", "Present actual programs, levels and outcomes.", ["hero", "services", "features", "process", "cta"]),
      page("faculty", "Faculty", "/faculty", "recommended", "Present real faculty credentials.", ["hero", "team", "about", "cta"]),
      page("contact", "Admissions", "/contact", "required", "Make enquiry and enrolment actions clear.", ["hero", "contact", "faq", "cta"]),
    ],
  },
  {
    industryPackId: "ecommerce-retail",
    pages: [
      page("home", "Home", "/", "required", "Drive product discovery and purchase intent.", ["hero", "services", "features", "testimonials", "cta"]),
      page("shop", "Shop", "/shop", "required", "Present real products or categories.", ["hero", "services", "features", "cta"]),
      page("about", "About", "/about", "optional", "Tell the brand story when useful.", ["hero", "about", "features", "cta"]),
      page("contact", "Contact", "/contact", "recommended", "Provide support and store information where applicable.", ["hero", "contact", "faq"]),
    ],
  },
  {
    industryPackId: "corporate-industrial",
    pages: [
      page("home", "Home", "/", "required", "Establish corporate credibility and capabilities.", ["hero", "about", "features", "proof", "cta"]),
      page("capabilities", "Capabilities", "/capabilities", "required", "Explain real capabilities and buyer-relevant outcomes.", ["hero", "services", "features", "process", "cta"]),
      page("industries", "Industries", "/industries", "recommended", "Explain actual sectors served.", ["hero", "services", "gallery", "proof", "cta"]),
      page("about", "Company", "/about", "recommended", "Present history, leadership and facilities using supplied facts.", ["hero", "about", "team", "proof", "cta"]),
      page("contact", "Contact", "/contact", "required", "Route sales and requirement enquiries.", ["hero", "contact", "cta"]),
    ],
  },
];

export type PageArchitectureEvaluation = {
  score: number;
  missingRequired: PageRequirement[];
  missingRecommended: PageRequirement[];
};

export function pageArchitectureForIndustry(pack?: IndustryIntelligencePack): IndustryPageArchitecture | undefined {
  if (!pack) return undefined;
  return INDUSTRY_PAGE_ARCHITECTURES.find((architecture) => architecture.industryPackId === pack.id);
}

export function evaluatePageArchitecture(site: Site, pack?: IndustryIntelligencePack): PageArchitectureEvaluation {
  const architecture = pageArchitectureForIndustry(pack);
  if (!architecture) return { score: 90, missingRequired: [], missingRecommended: [] };
  const paths = new Set(site.pages.map((page) => normalizePath(page.path)));
  const missingRequired = architecture.pages.filter((page) => page.level === "required" && !paths.has(normalizePath(page.path)));
  const missingRecommended = architecture.pages.filter((page) => page.level === "recommended" && !paths.has(normalizePath(page.path)));
  const score = Math.max(0, 100 - missingRequired.length * 18 - missingRecommended.length * 6);
  return { score, missingRequired, missingRecommended };
}

export function plannerPageArchitecture(pack?: IndustryIntelligencePack) {
  const architecture = pageArchitectureForIndustry(pack);
  if (!architecture) return undefined;
  return architecture.pages.map((page) => ({
    name: page.name,
    path: page.path,
    level: page.level,
    purpose: page.purpose,
    preferredSections: page.preferredSections,
  }));
}

function page(id: string, name: string, path: string, level: PageRequirement["level"], purpose: string, preferredSections: string[]): PageRequirement {
  return { id, name, path, level, purpose, preferredSections };
}

function normalizePath(path: string): string {
  if (path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}
