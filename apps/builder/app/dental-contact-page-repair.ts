import { siteSchema, type Site, type SiteSection } from "@micirql/schema";
import { sectionDesignId } from "@micirql/sections";

export type DentalContactPageRepairResult = {
  site: Site;
  repaired: boolean;
};

/**
 * The generic page architect may already have created /contact before the Dental
 * multipage layer runs. In that case the Dental architect must still enforce the
 * same contact-section contract it would create for a missing page.
 */
export function repairExistingDentalContactPage(site: Site): DentalContactPageRepairResult {
  const contactPage = site.pages.find((page) => page.path === "/contact");
  if (!contactPage) return { site, repaired: false };
  if (contactPage.sections.some((section) => !section.hidden && familyFromId(section.component.componentId) === "contact")) {
    return { site, repaired: false };
  }

  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === "/contact");
  if (!page) return { site, repaired: false };

  const section: SiteSection = {
    id: uniqueSectionId(page.sections, "contact-details"),
    component: {
      componentId: sectionDesignId(next.theme.family, "contact", 2),
      version: "1.0.0",
    },
    props: {
      eyebrow: "Contact",
      heading: "Book a dental consultation",
      body: "Contact the clinic to request an appointment or ask about the next appropriate step for your dental care.",
      ctaLabel: "Contact us",
    },
    bindings: {},
    hidden: false,
  };

  const footerIndex = page.sections.findIndex((item) => familyFromId(item.component.componentId) === "footer");
  if (footerIndex >= 0) page.sections.splice(footerIndex, 0, section);
  else page.sections.push(section);

  page.seo = {
    ...page.seo,
    canonicalPath: "/contact",
    indexable: true,
  };

  return { site: siteSchema.parse(next), repaired: true };
}

function uniqueSectionId(sections: SiteSection[], base: string): string {
  if (!sections.some((section) => section.id === base)) return base;
  let index = 2;
  while (sections.some((section) => section.id === `${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "pricing", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gall: "gallery", team: "team", faq: "faq", pricing: "pricing", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}
