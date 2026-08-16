import type { Site, SitePage, SiteSection } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { resolveIndustryIntelligence } from "./industry-intelligence";
import { pageArchitectureForIndustry, type PageRequirement } from "./page-architecture";

const SEMANTIC_TO_FAMILY: Record<string, SectionFamily> = {
  hero: "hero",
  treatments: "services", services: "services", menu: "services", courses: "services", capabilities: "services", properties: "services", pricing: "services",
  doctor: "team", faculty: "team", team: "team", leadership: "team", agent: "team",
  technology: "features", expertise: "features", amenities: "features", outcomes: "features", industries: "features", benefits: "features", integrations: "features", "use-cases": "features", faq: "features",
  proof: "testimonials", testimonials: "testimonials", reviews: "testimonials", certifications: "testimonials", "case-studies": "testimonials",
  gallery: "gallery", projects: "gallery", "product-demo": "gallery", "featured-properties": "gallery",
  process: "process", curriculum: "process",
  about: "about", company: "about", story: "about",
  cta: "cta", reservation: "cta",
  contact: "contact", location: "contact",
};

export type PageConstructionResult = {
  site: Site;
  createdPages: string[];
  updatedPages: string[];
};

/**
 * Deterministically ensures industry page architecture exists.
 * AI may later enrich copy, but it does not decide which core pages exist.
 */
export function ensureIndustryPages(site: Site, industry?: string, subindustry?: string): PageConstructionResult {
  const next = structuredClone(site);
  const pack = resolveIndustryIntelligence(industry, subindustry);
  const architecture = pageArchitectureForIndustry(pack);
  if (!architecture) return { site: next, createdPages: [], updatedPages: [] };

  const createdPages: string[] = [];
  const updatedPages: string[] = [];
  const byPath = new Map(next.pages.map((page) => [normalizePath(page.path), page]));

  for (const requirement of architecture.pages.filter((page) => page.level !== "optional")) {
    const path = normalizePath(requirement.path);
    const existing = byPath.get(path);
    if (!existing) {
      const page = makePage(next, requirement, industry);
      next.pages.push(page);
      byPath.set(path, page);
      createdPages.push(path);
    } else if (ensurePageSectionSequence(next, existing, requirement, industry)) {
      updatedPages.push(path);
    }
  }

  next.pages.sort((a, b) => pageOrder(a.path, architecture.pages) - pageOrder(b.path, architecture.pages));
  return { site: next, createdPages, updatedPages };
}

function makePage(site: Site, requirement: PageRequirement, industry?: string): SitePage {
  const pageId = requirement.id === "home" ? "home" : `page-${slug(requirement.id)}`;
  return {
    id: pageId,
    path: normalizePath(requirement.path),
    name: requirement.name,
    sections: buildSections(site, requirement, industry),
    seo: {
      title: `${requirement.name} | ${site.name}`,
      description: requirement.purpose,
    },
  };
}

function ensurePageSectionSequence(site: Site, page: SitePage, requirement: PageRequirement, industry?: string): boolean {
  const existingFamilies = page.sections.map((section) => familyFromComponentId(section.component.componentId)).filter(Boolean) as SectionFamily[];
  let changed = false;
  for (const semantic of requirement.preferredSections) {
    const family = SEMANTIC_TO_FAMILY[semantic];
    if (!family || existingFamilies.includes(family)) continue;
    page.sections.push(makeSection(site, page, family, semantic, industry));
    existingFamilies.push(family);
    changed = true;
  }

  const ordered = orderSections(page.sections, requirement.preferredSections);
  if (ordered.map((section) => section.id).join("|") !== page.sections.map((section) => section.id).join("|")) {
    page.sections = ordered;
    changed = true;
  }
  return changed;
}

function buildSections(site: Site, requirement: PageRequirement, industry?: string): SiteSection[] {
  const seen = new Set<SectionFamily>();
  const sections: SiteSection[] = [];
  for (const semantic of requirement.preferredSections) {
    const family = SEMANTIC_TO_FAMILY[semantic];
    if (!family || seen.has(family)) continue;
    seen.add(family);
    sections.push(makeSection(site, { id: requirement.id, path: requirement.path, name: requirement.name } as SitePage, family, semantic, industry));
  }
  if (!seen.has("hero")) sections.unshift(makeSection(site, { id: requirement.id, path: requirement.path, name: requirement.name } as SitePage, "hero", "hero", industry));
  return sections;
}

function makeSection(site: Site, page: Pick<SitePage, "id" | "name" | "path">, family: SectionFamily, semantic: string, industry?: string): SiteSection {
  const id = `${slug(page.id)}-${slug(semantic)}-${family}`;
  const actionId = defaultNativeAction(industry, semantic);
  const base = {
    id,
    component: { componentId: sectionDesignId(site.theme.family, family, preferredVariant(family)), version: "1.0.0" },
    bindings: family === "cta" || family === "contact" ? { [defaultBindingKey(actionId)]: { actionId } } : {},
    hidden: false,
  };
  const subject = page.name;

  if (family === "hero") return { ...base, props: { eyebrow: subject, title: `${subject} from ${site.name}`, description: `Explore ${subject.toLowerCase()} and find the right next step.`, primaryAction: { label: "Contact us", href: "/contact" }, imageSlotMode: "section", imageRatio: "16:10", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "services") return { ...base, props: { eyebrow: labelize(semantic), title: `${subject}`, description: `A clear overview of ${subject.toLowerCase()}.`, items: [{ title: "Primary offering", description: "Add the most important real offering here." }, { title: "Supporting offering", description: "Add another verified offering here." }, { title: "Additional offering", description: "Add another relevant option here." }], imageSlotMode: "items", itemImageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "team") return { ...base, props: { eyebrow: labelize(semantic), title: `Meet the people behind ${site.name}`, items: [{ title: "Team member", description: "Add real role or credentials." }], imageSlotMode: "items", itemImageRatio: "4:5", imageFit: "cover", imageFocalPoint: "face-safe" } };
  if (family === "features") return { ...base, props: { eyebrow: labelize(semantic), title: `What matters about ${subject.toLowerCase()}`, items: [{ title: "Point one", description: "Add a verified detail." }, { title: "Point two", description: "Add another verified detail." }, { title: "Point three", description: "Add another relevant detail." }], imageSlotMode: "none" } };
  if (family === "testimonials") return { ...base, props: { eyebrow: labelize(semantic), title: "Proof and trust", items: [{ title: "Verified proof", description: "Add a real review, certification or case result when supplied." }], imageSlotMode: "none" } };
  if (family === "gallery") return { ...base, props: { eyebrow: labelize(semantic), title: `${subject} gallery`, items: [{ title: "Image slot" }, { title: "Image slot" }, { title: "Image slot" }], imageSlotMode: "items", itemImageRatio: "3:2", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "process") return { ...base, props: { eyebrow: labelize(semantic), title: "How it works", items: [{ title: "Step one", description: "Describe the first real step." }, { title: "Step two", description: "Describe the next step." }, { title: "Step three", description: "Describe the final step." }], imageSlotMode: "none" } };
  if (family === "about") return { ...base, props: { eyebrow: labelize(semantic), title: `About ${site.name}`, description: "Add the real business story, experience and differentiators here.", imageSlotMode: "section", imageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "cta") return { ...base, props: { eyebrow: "Next step", title: `Ready to discuss ${subject.toLowerCase()}?`, primaryAction: { label: defaultCtaLabel(actionId), href: "/contact" }, imageSlotMode: "none" } };
  if (family === "contact") return { ...base, props: { eyebrow: "Contact", title: `Contact ${site.name}`, description: "Send an enquiry and continue from here.", primaryAction: { label: defaultCtaLabel(actionId), href: "#enquiry" }, formAction: "contact", imageSlotMode: "none" } };
  return { ...base, props: { title: subject, imageSlotMode: "none" } };
}

function defaultNativeAction(industry?: string, semantic?: string): string {
  const value = `${industry ?? ""} ${semantic ?? ""}`.toLowerCase();
  if (/dental|dentist|clinic|health|medical/.test(value)) return "appointment.request";
  if (/restaurant|cafe|food|dining|reservation/.test(value)) return "reservation.request";
  if (/real estate|real-estate|property|realtor/.test(value)) return "property.enquiry";
  if (/saas|software|technology|tech|product/.test(value)) return "demo.request";
  if (/education|training|school|college|course|academy/.test(value)) return "enrollment.enquiry";
  if (/hotel|hospitality|resort|stay|accommodation/.test(value)) return "booking.request";
  if (/consult|agency|professional|construction|industrial|corporate|service/.test(value)) return "quote.request";
  return "lead.create";
}

function defaultBindingKey(actionId: string): string {
  if (actionId.includes("appointment")) return "appointment";
  if (actionId.includes("reservation")) return "reservation";
  if (actionId.includes("property")) return "propertyEnquiry";
  if (actionId.includes("demo")) return "demo";
  if (actionId.includes("enrollment")) return "enrollment";
  if (actionId.includes("booking")) return "booking";
  if (actionId.includes("quote")) return "quote";
  return "submit";
}

function defaultCtaLabel(actionId: string): string {
  if (actionId === "appointment.request") return "Request appointment";
  if (actionId === "reservation.request") return "Request reservation";
  if (actionId === "property.enquiry") return "Enquire now";
  if (actionId === "demo.request") return "Request demo";
  if (actionId === "enrollment.enquiry") return "Enquire now";
  if (actionId === "booking.request") return "Request booking";
  if (actionId === "quote.request") return "Request quote";
  return "Send enquiry";
}

function orderSections(sections: SiteSection[], preferred: string[]): SiteSection[] {
  const desired = preferred.map((semantic) => SEMANTIC_TO_FAMILY[semantic]).filter(Boolean) as SectionFamily[];
  const rank = new Map(desired.map((family, index) => [family, index]));
  return [...sections].sort((a, b) => (rank.get(familyFromComponentId(a.component.componentId) as SectionFamily) ?? 999) - (rank.get(familyFromComponentId(b.component.componentId) as SectionFamily) ?? 999));
}

function familyFromComponentId(componentId: string): SectionFamily | undefined {
  const value = componentId.toLowerCase();
  const families: SectionFamily[] = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, SectionFamily> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function preferredVariant(family: SectionFamily): 1 | 2 | 3 | 4 | 5 {
  if (family === "hero" || family === "contact") return 2;
  return 1;
}
function pageOrder(path: string, requirements: PageRequirement[]) { const index = requirements.findIndex((page) => normalizePath(page.path) === normalizePath(path)); return index < 0 ? 999 : index; }
function normalizePath(path: string) { if (path === "/") return "/"; return `/${path.replace(/^\/+|\/+$/g, "")}`; }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page"; }
function labelize(value: string) { return value.split("-").map((part) => part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part).join(" "); }