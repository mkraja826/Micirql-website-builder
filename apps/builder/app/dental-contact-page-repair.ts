import { siteSchema, type Site, type SitePage, type SiteSection } from "@micirql/schema";
import { sectionDesignId } from "@micirql/sections";

export type DentalContactPageRepairResult = {
  site: Site;
  repaired: boolean;
};

/**
 * The generic page architect may already have created /contact before the Dental
 * multipage layer runs. In that case the Dental architect must still enforce the
 * same contact-section contract it would create for a missing page. Recovered
 * multipage drafts may also carry inherited duplicate SEO titles; those are
 * repaired deterministically here before the strict Dental multipage gate runs.
 */
export function repairExistingDentalContactPage(site: Site): DentalContactPageRepairResult {
  const contactPage = site.pages.find((page) => page.path === "/contact");
  if (!contactPage) return { site, repaired: false };

  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === "/contact");
  if (!page) return { site, repaired: false };

  let repaired = false;
  if (!page.sections.some((section) => !section.hidden && familyFromId(section.component.componentId) === "contact")) {
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
    repaired = true;
  }

  if (page.seo.canonicalPath !== "/contact" || page.seo.indexable !== true) {
    page.seo = {
      ...page.seo,
      canonicalPath: "/contact",
      indexable: true,
    };
    repaired = true;
  }

  if (repairDuplicateSeoTitles(next) > 0) repaired = true;
  return repaired ? { site: siteSchema.parse(next), repaired: true } : { site, repaired: false };
}

function repairDuplicateSeoTitles(site: Site): number {
  const groups = new Map<string, SitePage[]>();
  for (const page of site.pages) {
    const key = page.seo.title.trim().toLowerCase();
    if (!key) continue;
    const pages = groups.get(key) ?? [];
    pages.push(page);
    groups.set(key, pages);
  }

  const duplicateGroups = [...groups.values()].filter((pages) => pages.length > 1);
  if (!duplicateGroups.length) return 0;

  const used = new Set(site.pages.map((page) => page.seo.title.trim().toLowerCase()).filter(Boolean));
  let repairs = 0;

  for (const pages of duplicateGroups) {
    const ordered = [...pages].sort((a, b) => pagePreservationRank(a) - pagePreservationRank(b) || a.path.localeCompare(b.path));
    for (const page of ordered.slice(1)) {
      const previous = page.seo.title.trim().toLowerCase();
      const nextTitle = uniqueSeoTitle(page, site.name, used);
      if (nextTitle.toLowerCase() === previous) continue;
      page.seo = { ...page.seo, title: nextTitle };
      used.add(nextTitle.toLowerCase());
      repairs += 1;
    }
  }

  return repairs;
}

function uniqueSeoTitle(page: SitePage, siteName: string, used: Set<string>): string {
  const pageLabel = page.name.trim() || pathLabel(page.path) || "Dental Care";
  const candidates = [
    `${pageLabel} | ${siteName}`,
    `${pageLabel} | ${pathLabel(page.path)} | ${siteName}`,
    `${pageLabel} — ${pathLabel(page.path)} | ${siteName}`,
  ];

  for (const candidate of candidates) {
    const normalized = truncateSeoTitle(candidate);
    if (!used.has(normalized.toLowerCase())) return normalized;
  }

  const suffix = shortStablePath(page.path);
  return truncateSeoTitle(`${pageLabel} ${suffix} | ${siteName}`);
}

function pagePreservationRank(page: SitePage): number {
  if (page.path === "/") return 0;
  if (page.path === "/contact") return 2;
  return 1;
}

function pathLabel(path: string): string {
  const segment = path.split("/").filter(Boolean).at(-1) ?? "";
  return segment.replace(/[-_]+/g, " ").replace(/\b\w/g, (value) => value.toUpperCase()).trim();
}

function shortStablePath(path: string): string {
  const segment = path.split("/").filter(Boolean).at(-1) ?? "page";
  return segment.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 18) || "page";
}

function truncateSeoTitle(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length <= 70 ? cleaned : cleaned.slice(0, 70).trim();
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
