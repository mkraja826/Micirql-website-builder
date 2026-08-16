import type { Site, SitePage, SiteSection } from "@micirql/schema";

export type SiteShellSyncResult = {
  site: Site;
  changedPages: string[];
};

/**
 * Treats the home page navbar/footer as the canonical global shell.
 * Every page receives structurally identical shell components and props,
 * with page-local section IDs only. Page body sections remain untouched.
 */
export function syncGlobalSiteShell(site: Site): SiteShellSyncResult {
  const next = structuredClone(site);
  const home = next.pages.find((page) => normalizePath(page.path) === "/") ?? next.pages[0];
  if (!home) return { site: next, changedPages: [] };

  const canonicalNavbar = firstFamily(home, "navbar");
  const canonicalFooter = firstFamily(home, "footer");
  if (!canonicalNavbar || !canonicalFooter) return { site: next, changedPages: [] };

  const changedPages: string[] = [];
  for (const page of next.pages) {
    const before = shellFingerprint(page);
    applyCanonicalShell(page, canonicalNavbar, canonicalFooter);
    const after = shellFingerprint(page);
    if (before !== after) changedPages.push(normalizePath(page.path));
  }

  return { site: next, changedPages };
}

export function evaluateGlobalSiteShell(site: Site): { score: number; issues: string[] } {
  const issues: string[] = [];
  const home = site.pages.find((page) => normalizePath(page.path) === "/") ?? site.pages[0];
  if (!home) return { score: 0, issues: ["Website has no pages."] };
  const canonicalNavbar = firstFamily(home, "navbar");
  const canonicalFooter = firstFamily(home, "footer");
  if (!canonicalNavbar) issues.push("Home page has no canonical navbar.");
  if (!canonicalFooter) issues.push("Home page has no canonical footer.");
  if (!canonicalNavbar || !canonicalFooter) return { score: Math.max(0, 100 - issues.length * 35), issues };

  const navSignature = sectionSignature(canonicalNavbar);
  const footerSignature = sectionSignature(canonicalFooter);
  for (const page of site.pages) {
    const visible = page.sections.filter((section) => !section.hidden);
    const navs = visible.filter((section) => family(section) === "navbar");
    const footers = visible.filter((section) => family(section) === "footer");
    if (navs.length !== 1) issues.push(`${page.path} must contain exactly one navbar.`);
    if (footers.length !== 1) issues.push(`${page.path} must contain exactly one footer.`);
    if (visible[0] && family(visible[0]) !== "navbar") issues.push(`${page.path} navbar is not first.`);
    if (visible.at(-1) && family(visible.at(-1)!) !== "footer") issues.push(`${page.path} footer is not last.`);
    if (navs[0] && sectionSignature(navs[0]) !== navSignature) issues.push(`${page.path} navbar has drifted from the global shell.`);
    if (footers[0] && sectionSignature(footers[0]) !== footerSignature) issues.push(`${page.path} footer has drifted from the global shell.`);
  }

  return { score: Math.max(0, 100 - issues.length * 12), issues };
}

function applyCanonicalShell(page: SitePage, navbar: SiteSection, footer: SiteSection) {
  const body = page.sections.filter((section) => {
    const value = family(section);
    return value !== "navbar" && value !== "footer";
  });
  const pageSlug = slug(page.path === "/" ? "home" : page.path);
  const nav = cloneShellSection(navbar, `${pageSlug}-global-navbar`);
  const foot = cloneShellSection(footer, `${pageSlug}-global-footer`);
  page.sections = [nav, ...body, foot];
}

function cloneShellSection(section: SiteSection, id: string): SiteSection {
  return {
    ...structuredClone(section),
    id,
    hidden: false,
  };
}

function firstFamily(page: SitePage, target: "navbar" | "footer") {
  return page.sections.find((section) => !section.hidden && family(section) === target);
}

function family(section: SiteSection): "navbar" | "footer" | undefined {
  const value = section.component.componentId.toLowerCase();
  if (value.startsWith("navbar.") || value.includes("-nav-")) return "navbar";
  if (value.startsWith("footer.") || value.includes("-footer-") || value.includes("-foot-")) return "footer";
  return undefined;
}

function sectionSignature(section: SiteSection) {
  return JSON.stringify({ component: section.component, props: section.props, bindings: section.bindings, hidden: false });
}

function shellFingerprint(page: SitePage) {
  return JSON.stringify(page.sections.filter((section) => {
    const value = family(section);
    return value === "navbar" || value === "footer";
  }).map((section) => ({ family: family(section), signature: sectionSignature(section), position: page.sections.indexOf(section) })));
}

function normalizePath(path: string) {
  if (path === "/") return "/";
  return `/${path.replace(/^\/+|\/+$/g, "")}`;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
}
