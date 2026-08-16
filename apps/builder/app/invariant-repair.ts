import type { Site, SiteSection } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily } from "@micirql/sections";
import { WEBSITE_ARCHETYPES, validateWebsite, type WebsiteValidationResult } from "@micirql/design-engine";

export type RepairResult = {
  site: Site;
  repaired: boolean;
  repairs: string[];
  readiness: WebsiteValidationResult;
};

const REQUIREMENT_TO_FAMILY: Record<string, SectionFamily> = {
  navbar: "navbar", footer: "footer", hero: "hero",
  services: "services", treatments: "services", offerings: "services", courses: "services", capabilities: "services", listings: "services", "product-grid": "services",
  about: "about", company: "about", story: "about",
  features: "features", technology: "features", expertise: "features", benefits: "features", amenities: "features", outcomes: "features", industries: "features",
  process: "process", curriculum: "process", schedule: "process",
  testimonials: "testimonials", proof: "testimonials", reviews: "testimonials", clients: "testimonials", certifications: "testimonials", "case-studies": "testimonials", stats: "testimonials",
  gallery: "gallery", portfolio: "gallery", projects: "gallery", "featured-project": "gallery", "featured-properties": "gallery", "product-demo": "gallery",
  team: "team", doctor: "team", faculty: "team", leadership: "team", agent: "team", chef: "team",
  cta: "cta", reservation: "cta", enrolment: "cta", newsletter: "cta",
  contact: "contact", location: "contact", map: "contact", "store-locator": "contact", "service-area": "contact",
};

export function repairWebsiteInvariants(site: Site, archetypeId: string): RepairResult {
  const next = structuredClone(site);
  const repairs: string[] = [];
  const archetype = WEBSITE_ARCHETYPES.find((candidate) => candidate.id === archetypeId);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0]!;

  ensureFamily(home.sections, next, "navbar", "navbar", repairs);
  ensureFamily(home.sections, next, "hero", "hero", repairs);
  for (const requirement of archetype?.sections.required ?? []) {
    const family = REQUIREMENT_TO_FAMILY[requirement];
    if (family) ensureFamily(home.sections, next, family, requirement, repairs);
  }
  ensurePrimaryCta(home.sections, next, repairs);
  ensureFamily(home.sections, next, "footer", "footer", repairs);
  normalizeShellOrder(home.sections, repairs);

  const readiness = validateWebsite(next, archetypeId);
  return { site: next, repaired: repairs.length > 0, repairs, readiness };
}

function ensureFamily(sections: SiteSection[], site: Site, family: SectionFamily, semanticLabel: string, repairs: string[]) {
  if (sections.some((section) => !section.hidden && familyFromComponentId(section.component.componentId) === family)) return;
  sections.push(makeSection(site, family, semanticLabel));
  repairs.push(`inserted ${semanticLabel}`);
}

function makeSection(site: Site, family: SectionFamily, semanticLabel: string): SiteSection {
  const base = {
    id: family === "contact" ? "contact" : `auto-${family}-${slug(semanticLabel)}`,
    component: { componentId: sectionDesignId(site.theme.family, family, preferredVariant(family)), version: "1.0.0" },
    bindings: {},
    hidden: false,
  };
  const name = site.name;

  if (family === "navbar") return { ...base, props: { title: name, primaryAction: { label: "Contact", href: "#contact" }, imageSlotMode: "none" } };
  if (family === "hero") return { ...base, props: { eyebrow: semanticLabel === "hero" ? "Welcome" : semanticLabel, title: `${name}, built around what matters to you`, description: "Clear information, trusted expertise and an easy next step.", primaryAction: { label: "Get started", href: "#contact" }, imageSlotMode: "section", imageRatio: "16:10", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "services") return { ...base, props: { eyebrow: labelize(semanticLabel), title: `Explore our ${labelize(semanticLabel).toLowerCase()}`, description: `A clear overview of the ${labelize(semanticLabel).toLowerCase()} available from ${name}.`, items: [{ title: "Option one", description: "Add the most important offering here." }, { title: "Option two", description: "Add another high-priority offering here." }, { title: "Option three", description: "Add a supporting offering here." }], imageSlotMode: "items", itemImageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "about") return { ...base, props: { eyebrow: "About", title: `Why ${name}`, description: "Introduce the business, its experience and what makes it different.", imageSlotMode: "section", imageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "features") return { ...base, props: { eyebrow: labelize(semanticLabel), title: `What sets ${name} apart`, items: [{ title: "Quality", description: "Explain a meaningful strength." }, { title: "Experience", description: "Show relevant expertise." }, { title: "Support", description: "Explain the customer experience." }], imageSlotMode: "items", itemImageRatio: "4:3", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "process") return { ...base, props: { eyebrow: labelize(semanticLabel), title: "A simple, clear process", items: [{ title: "Discover", description: "Understand the requirement." }, { title: "Plan", description: "Choose the right approach." }, { title: "Deliver", description: "Move forward with confidence." }], imageSlotMode: "none" } };
  if (family === "testimonials") return { ...base, props: { eyebrow: labelize(semanticLabel), title: "Trust built through results", items: [{ title: "Client experience", description: "Add a verified testimonial or proof point." }, { title: "Trusted outcome", description: "Add another proof point here." }], imageSlotMode: "none" } };
  if (family === "gallery") return { ...base, props: { eyebrow: labelize(semanticLabel), title: `A closer look at ${name}`, items: [{ title: "Gallery item" }, { title: "Gallery item" }, { title: "Gallery item" }], imageSlotMode: "items", itemImageRatio: "3:2", imageFit: "cover", imageFocalPoint: "center" } };
  if (family === "team") return { ...base, props: { eyebrow: labelize(semanticLabel), title: "Meet the people behind the work", items: [{ title: "Team member", description: "Role or expertise" }, { title: "Team member", description: "Role or expertise" }], imageSlotMode: "items", itemImageRatio: "4:5", imageFit: "cover", imageFocalPoint: "face-safe" } };
  if (family === "cta") return { ...base, props: { eyebrow: "Next step", title: "Ready to move forward?", description: `Connect with ${name} and take the next step.`, primaryAction: { label: "Contact us", href: "#contact" }, imageSlotMode: "none" } };
  if (family === "contact") return { ...base, props: { eyebrow: labelize(semanticLabel), title: `Contact ${name}`, description: "Send an enquiry and we’ll help with the next step.", primaryAction: { label: "Get in touch", href: "mailto:hello@example.com" }, formAction: "contact", imageSlotMode: "none" } };
  return { ...base, props: { title: name, description: `© ${name}. All rights reserved.`, imageSlotMode: "none" } };
}

function ensurePrimaryCta(sections: SiteSection[], site: Site, repairs: string[]) {
  const hasCta = sections.some((section) => {
    const value = section.props?.primaryAction;
    if (!value || typeof value !== "object") return false;
    const action = value as Record<string, unknown>;
    return Boolean(typeof action.label === "string" && action.label.trim() && typeof action.href === "string" && action.href.trim());
  });
  if (hasCta) return;
  const hero = sections.find((section) => familyFromComponentId(section.component.componentId) === "hero");
  if (hero) {
    hero.props = { ...hero.props, primaryAction: { label: "Get started", href: "#contact" } };
    repairs.push("added primary CTA to hero");
    return;
  }
  sections.push(makeSection(site, "cta", "cta"));
  repairs.push("inserted CTA");
}

function normalizeShellOrder(sections: SiteSection[], repairs: string[]) {
  const before = sections.map((section) => section.id).join("|");
  const navbar = sections.filter((section) => familyFromComponentId(section.component.componentId) === "navbar");
  const footer = sections.filter((section) => familyFromComponentId(section.component.componentId) === "footer");
  const body = sections.filter((section) => {
    const family = familyFromComponentId(section.component.componentId);
    return family !== "navbar" && family !== "footer";
  });
  sections.splice(0, sections.length, ...navbar.slice(0, 1), ...body, ...footer.slice(0, 1));
  if (before !== sections.map((section) => section.id).join("|")) repairs.push("normalized navbar/footer order");
}

function preferredVariant(family: SectionFamily): 1 | 2 | 3 | 4 | 5 {
  if (family === "navbar" || family === "footer") return 1;
  if (family === "hero" || family === "contact") return 2;
  return 1;
}

function familyFromComponentId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function labelize(value: string) {
  return value.split("-").map((part) => part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part).join(" ");
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}
