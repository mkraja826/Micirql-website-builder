import type { Site, SitePage } from "@micirql/schema";
import type { OnboardingProfile } from "./preset-ranking";
import { requestedDentalTreatments, type DentalTreatmentId } from "./dental-specialty";

export type DentalMultipageQualityIssue = {
  code:
    | "TREATMENT_PAGE_MISSING"
    | "TREATMENT_PAGE_STRUCTURE_INCOMPLETE"
    | "BREADCRUMB_INCOMPLETE"
    | "PAGE_SEO_INCOMPLETE"
    | "CONTACT_PAGE_MISSING"
    | "CONTACT_LINK_MISSING"
    | "HOME_INTERNAL_LINK_MISSING"
    | "NAVIGATION_LINK_MISSING"
    | "DUPLICATE_PAGE_PATH"
    | "DUPLICATE_SEO_TITLE";
  severity: "error" | "warning";
  detail: string;
  pagePath?: string;
};

export type DentalMultipageQualityResult = {
  ready: boolean;
  score: number;
  expectedTreatmentPaths: string[];
  issues: DentalMultipageQualityIssue[];
};

const PATHS: Record<Exclude<DentalTreatmentId, "general">, string> = {
  implant: "/treatments/dental-implants",
  cosmetic: "/treatments/cosmetic-dentistry",
  orthodontics: "/treatments/orthodontics",
  endodontics: "/treatments/root-canal-treatment",
  rehabilitation: "/treatments/full-mouth-rehabilitation",
  crowns: "/treatments/dental-crowns",
};

const REQUIRED_TREATMENT_FAMILIES = ["navbar", "hero", "about", "process", "faq", "cta", "footer"];

export function evaluateDentalMultipageQuality(site: Site, profile: OnboardingProfile): DentalMultipageQualityResult {
  const expectedTreatmentPaths = [...new Set(requestedDentalTreatments(profile).map((entry) => entry.id))]
    .filter((id): id is Exclude<DentalTreatmentId, "general"> => id !== "general")
    .slice(0, 4)
    .map((id) => PATHS[id]);
  if (!expectedTreatmentPaths.length || site.seoBlueprint.servicePages === false) {
    return { ready: true, score: 100, expectedTreatmentPaths: [], issues: [] };
  }

  const issues: DentalMultipageQualityIssue[] = [];
  const pathCounts = count(site.pages.map((page) => page.path));
  for (const [path, amount] of pathCounts) if (amount > 1) {
    issues.push({ code: "DUPLICATE_PAGE_PATH", severity: "error", detail: `Page path ${path} occurs ${amount} times.`, pagePath: path });
  }
  const titleCounts = count(site.pages.map((page) => page.seo.title.trim().toLowerCase()).filter(Boolean));
  for (const [title, amount] of titleCounts) if (amount > 1) {
    issues.push({ code: "DUPLICATE_SEO_TITLE", severity: "warning", detail: `SEO title ${title} occurs ${amount} times.` });
  }

  const home = site.pages.find((page) => page.path === "/");
  const contact = site.pages.find((page) => page.path === "/contact");
  if (!contact || !hasFamily(contact, "contact")) {
    issues.push({ code: "CONTACT_PAGE_MISSING", severity: "error", detail: "Multi-page Dental sites need a dedicated /contact page with a contact section.", pagePath: "/contact" });
  }

  for (const path of expectedTreatmentPaths) {
    const page = site.pages.find((candidate) => candidate.path === path);
    if (!page) {
      issues.push({ code: "TREATMENT_PAGE_MISSING", severity: "error", detail: `Expected treatment page ${path} was not generated.`, pagePath: path });
      continue;
    }
    const missingFamilies = REQUIRED_TREATMENT_FAMILIES.filter((family) => !hasFamily(page, family));
    if (missingFamilies.length) {
      issues.push({ code: "TREATMENT_PAGE_STRUCTURE_INCOMPLETE", severity: "error", detail: `${path} is missing ${missingFamilies.join(", ")}.`, pagePath: path });
    }
    if (!hasBreadcrumbContract(page)) {
      issues.push({ code: "BREADCRUMB_INCOMPLETE", severity: "error", detail: `${path} must visibly link Home to the current treatment page.`, pagePath: path });
    }
    if (!page.seo.indexable || page.seo.canonicalPath !== page.path || !page.seo.primaryKeyword || page.seo.title.length < 8 || page.seo.description.length < 40) {
      issues.push({ code: "PAGE_SEO_INCOMPLETE", severity: "error", detail: `${path} needs unique indexable SEO metadata, canonical path and a treatment keyword.`, pagePath: path });
    }
    if (!containsHref(page, "/contact")) {
      issues.push({ code: "CONTACT_LINK_MISSING", severity: "error", detail: `${path} does not provide a route to the consultation page.`, pagePath: path });
    }
    if (home && !containsHref(home, path)) {
      issues.push({ code: "HOME_INTERNAL_LINK_MISSING", severity: "error", detail: `The homepage does not link to ${path}.`, pagePath: path });
    }
    if (!site.navigation.some((item) => item.href === path)) {
      issues.push({ code: "NAVIGATION_LINK_MISSING", severity: "error", detail: `${path} is absent from the site navigation model.`, pagePath: path });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.length - errors;
  const score = Math.max(0, Math.min(100, 100 - errors * 10 - warnings * 3));
  return { ready: errors === 0 && score >= 90, score, expectedTreatmentPaths, issues };
}

function hasFamily(page: SitePage, family: string): boolean {
  return page.sections.some((section) => !section.hidden && familyFromId(section.component.componentId) === family);
}

function hasBreadcrumbContract(page: SitePage): boolean {
  const hero = page.sections.find((section) => !section.hidden && familyFromId(section.component.componentId) === "hero");
  const breadcrumbs = Array.isArray(hero?.props.breadcrumbs) ? hero?.props.breadcrumbs : [];
  if (breadcrumbs.length < 2) return false;
  const links = breadcrumbs.map((item) => item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : undefined);
  return links[0]?.href === "/" && links.at(-1)?.href === page.path && links.every((item) => typeof item?.label === "string" && item.label.trim());
}

function containsHref(page: SitePage, href: string): boolean {
  return page.sections.some((section) => containsHrefValue(section.props, href));
}

function containsHrefValue(value: unknown, href: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsHrefValue(item, href));
  const record = value as Record<string, unknown>;
  if (record.href === href) return true;
  return Object.values(record).some((item) => containsHrefValue(item, href));
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const legacy = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "pricing", "cta", "contact", "footer"];
  for (const family of legacy) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gall: "gallery", team: "team", faq: "faq", pricing: "pricing", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function count(values: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}
