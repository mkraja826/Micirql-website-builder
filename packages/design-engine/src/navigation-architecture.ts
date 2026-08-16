import type { Site } from "@micirql/schema";
import { resolveIndustryIntelligence } from "./industry-intelligence";
import { pageArchitectureForIndustry } from "./page-architecture";

export type NavigationItem = { label: string; href: string };
export type NavigationGroup = { label: string; items: NavigationItem[] };
export type NavigationArchitecture = {
  primary: NavigationItem[];
  groups: NavigationGroup[];
  footerGroups: NavigationGroup[];
};

/**
 * Builds navigation from actual site pages. Industry architecture only influences
 * ordering/grouping; it never creates links to pages that do not exist.
 */
export function buildNavigationArchitecture(site: Site, industry?: string, subindustry?: string): NavigationArchitecture {
  const pack = resolveIndustryIntelligence(industry, subindustry);
  const architecture = pageArchitectureForIndustry(pack);
  const actual = site.pages.map((page) => ({ label: page.name, href: normalizePath(page.path) }));
  const byPath = new Map(actual.map((item) => [item.href, item]));
  const ordered: NavigationItem[] = [];

  for (const page of architecture?.pages ?? []) {
    const item = byPath.get(normalizePath(page.path));
    if (item && !ordered.some((candidate) => candidate.href === item.href)) ordered.push(item);
  }
  for (const item of actual) if (!ordered.some((candidate) => candidate.href === item.href)) ordered.push(item);

  const home = ordered.find((item) => item.href === "/");
  const contact = ordered.find((item) => /contact|visit|admission/i.test(item.label) || item.href === "/contact");
  const content = ordered.filter((item) => item !== home && item !== contact);

  // Keep the desktop navbar calm. 6 or fewer pages remain flat; larger sites group secondary content.
  const primary: NavigationItem[] = [home, ...content.slice(0, content.length > 4 ? 3 : content.length), contact]
    .filter((item): item is NavigationItem => Boolean(item));

  const overflow = content.filter((item) => !primary.some((candidate) => candidate.href === item.href));
  const groups: NavigationGroup[] = overflow.length ? [{ label: groupLabel(pack?.id), items: overflow }] : [];

  const footerMain = ordered.filter((item) => item.href !== "/").slice(0, 6);
  const footerMore = ordered.filter((item) => item.href !== "/" && !footerMain.some((candidate) => candidate.href === item.href));
  const footerGroups: NavigationGroup[] = [
    { label: "Explore", items: footerMain },
    ...(footerMore.length ? [{ label: "More", items: footerMore }] : []),
  ];

  return { primary: dedupe(primary), groups, footerGroups };
}

export function syncSiteNavigation(site: Site, industry?: string, subindustry?: string): Site {
  const next = structuredClone(site);
  const nav = buildNavigationArchitecture(next, industry, subindustry);
  next.navigation = nav.primary.map((item) => ({ label: item.label, href: item.href }));

  for (const page of next.pages) {
    for (const section of page.sections) {
      const id = section.component.componentId.toLowerCase();
      if (isFamily(id, "navbar", "nav")) {
        section.props = {
          ...section.props,
          items: nav.primary.map((item) => ({ title: item.label, href: item.href })),
          navigationGroups: nav.groups.map((group) => ({ label: group.label, items: group.items.map((item) => ({ title: item.label, href: item.href })) })),
        };
      }
      if (isFamily(id, "footer", "foot")) {
        section.props = {
          ...section.props,
          items: nav.footerGroups.flatMap((group) => group.items).map((item) => ({ title: item.label, href: item.href })),
          navigationGroups: nav.footerGroups.map((group) => ({ label: group.label, items: group.items.map((item) => ({ title: item.label, href: item.href })) })),
        };
      }
    }
  }
  return next;
}

export function evaluateNavigationArchitecture(site: Site): { score: number; issues: string[] } {
  const issues: string[] = [];
  const pagePaths = new Set(site.pages.map((page) => normalizePath(page.path)));
  const navPaths = site.navigation.map((item) => normalizePath(item.href));

  if (!navPaths.includes("/")) issues.push("Home is missing from primary navigation.");
  for (const href of navPaths) if (href.startsWith("/") && !pagePaths.has(href)) issues.push(`Navigation points to missing page ${href}.`);
  if (new Set(navPaths).size !== navPaths.length) issues.push("Primary navigation contains duplicate links.");
  if (site.navigation.length > 6) issues.push("Primary navigation is too crowded for the default desktop shell.");
  const score = Math.max(0, 100 - issues.length * 18);
  return { score, issues };
}

function groupLabel(packId?: string): string {
  if (packId === "dental-clinic") return "More";
  if (packId === "saas-software") return "Resources";
  if (packId === "restaurant-cafe") return "Explore";
  if (packId === "corporate-industrial") return "Company";
  return "More";
}

function isFamily(componentId: string, family: string, code: string): boolean {
  return componentId.startsWith(`${family}.`) || componentId.includes(`-${code}-`);
}

function dedupe(items: NavigationItem[]): NavigationItem[] {
  const seen = new Set<string>();
  return items.filter((item) => !seen.has(item.href) && seen.add(item.href));
}

function normalizePath(path: string): string {
  if (path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}
