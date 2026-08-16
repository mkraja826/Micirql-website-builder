import type { Site } from "@micirql/schema";
import { evaluateGlobalSiteShell } from "./site-shell";
import { SITE_INVARIANTS, WEBSITE_ARCHETYPES } from "./website-archetypes";

export type ValidationSeverity = "error" | "warning";

export type WebsiteValidationIssue = {
  code: string;
  severity: ValidationSeverity;
  message: string;
  pageId?: string;
  sectionId?: string;
};

export type WebsiteValidationResult = {
  ready: boolean;
  score: number;
  errors: WebsiteValidationIssue[];
  warnings: WebsiteValidationIssue[];
};

const FAMILY_ALIASES: Record<string, string[]> = {
  navbar: ["navbar"], footer: ["footer"], hero: ["hero"],
  services: ["services", "treatments", "offerings", "courses", "capabilities", "listings", "product-grid"],
  about: ["about", "company", "story"],
  features: ["features", "technology", "expertise", "benefits", "amenities", "outcomes", "industries"],
  process: ["process", "curriculum", "schedule"],
  testimonials: ["testimonials", "proof", "reviews", "clients", "certifications", "case-studies", "stats"],
  gallery: ["gallery", "portfolio", "projects", "featured-project", "featured-properties", "product-demo"],
  team: ["team", "doctor", "faculty", "leadership", "agent", "chef"],
  cta: ["cta", "reservation", "enrolment", "newsletter"],
  contact: ["contact", "location", "map", "store-locator", "service-area"],
};

const VALID_IMAGE_MODES = new Set(["none", "section", "items", "both"]);
const VALID_IMAGE_RATIOS = new Set(["1:1", "4:5", "3:2", "4:3", "16:10", "16:9", "21:9"]);

export function validateWebsite(site: Site, archetypeId: string): WebsiteValidationResult {
  const issues: WebsiteValidationIssue[] = [];
  const archetype = WEBSITE_ARCHETYPES.find((candidate) => candidate.id === archetypeId);
  if (!site.pages.length) {
    issues.push(error("NO_PAGES", "Website must contain at least one page."));
    return finish(issues);
  }

  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0]!;
  const homeFamilies = home.sections.filter((section) => !section.hidden).map((section) => familyFromComponentId(section.component.componentId)).filter(Boolean) as string[];
  for (const shellFamily of SITE_INVARIANTS.requiredShell) if (!homeFamilies.includes(shellFamily)) issues.push(error("MISSING_SITE_SHELL", `${shellFamily} is mandatory on the home page.`, home.id));
  if (homeFamilies[0] !== "navbar") issues.push(error("NAVBAR_POSITION", "Navbar must be the first visible home-page section.", home.id));
  if (homeFamilies.at(-1) !== "footer") issues.push(error("FOOTER_POSITION", "Footer must be the last visible home-page section.", home.id));
  if (!homeFamilies.includes("hero")) issues.push(error("MISSING_HERO", "Home page must contain a hero section.", home.id));

  if (archetype) {
    for (const requirement of archetype.sections.required) if (!satisfiesRequirement(homeFamilies, requirement)) issues.push(error("MISSING_ARCHETYPE_SECTION", `${archetype.name} requires a ${requirement} section.`, home.id));
    for (const recommendation of archetype.sections.recommended) if (!satisfiesRequirement(homeFamilies, recommendation)) issues.push(warning("MISSING_RECOMMENDED_SECTION", `${archetype.name} usually benefits from a ${recommendation} section.`, home.id));
  }

  const visibleSections = site.pages.flatMap((page) => page.sections.filter((section) => !section.hidden).map((section) => ({ page, section })));
  if (!visibleSections.some(({ section }) => hasAction(section.props?.primaryAction))) issues.push(error("MISSING_PRIMARY_CTA", "Website must contain at least one working primary CTA."));

  for (const page of site.pages) {
    const title = page.seo?.title?.trim();
    const description = page.seo?.description?.trim();
    if (!title || !description) issues.push(error("MISSING_SEO", `Page ${page.path} needs an SEO title and description.`, page.id));
    const visible = page.sections.filter((section) => !section.hidden);
    if (!visible.length) issues.push(error("EMPTY_PAGE", `Page ${page.path} has no visible sections.`, page.id));
    const ids = new Set<string>();
    for (const section of visible) {
      if (ids.has(section.id)) issues.push(error("DUPLICATE_SECTION_ID", `Duplicate section id ${section.id}.`, page.id, section.id));
      ids.add(section.id);
      validateImageSlot(section.props, issues, page.id, section.id);
    }
  }

  const shell = evaluateGlobalSiteShell(site);
  for (const message of shell.issues) issues.push(error("GLOBAL_SHELL_DRIFT", message));

  const navbar = visibleSections.find(({ section }) => familyFromComponentId(section.component.componentId) === "navbar");
  if (navbar && !isMiCirqlNavbar(navbar.section.component.componentId)) issues.push(error("MOBILE_NAV_UNVERIFIED", "Navbar must use a MiCirql shell component with guaranteed mobile burger navigation.", navbar.page.id, navbar.section.id));
  return finish(issues);
}

function validateImageSlot(props: Record<string, unknown> | undefined, issues: WebsiteValidationIssue[], pageId: string, sectionId: string) {
  if (!props) return;
  const mode = props.imageSlotMode;
  if (mode !== undefined && (typeof mode !== "string" || !VALID_IMAGE_MODES.has(mode))) issues.push(error("INVALID_IMAGE_SLOT_MODE", "Image slot mode is invalid.", pageId, sectionId));
  for (const key of ["imageRatio", "itemImageRatio"] as const) {
    const ratio = props[key];
    if (ratio !== undefined && (typeof ratio !== "string" || !VALID_IMAGE_RATIOS.has(ratio))) issues.push(error("INVALID_IMAGE_RATIO", `${key} is invalid.`, pageId, sectionId));
  }
  if ((mode === "section" || mode === "both") && !props.imageRatio) issues.push(error("MISSING_SECTION_IMAGE_RATIO", "Section image slot requires an explicit image ratio.", pageId, sectionId));
  if ((mode === "items" || mode === "both") && !props.itemImageRatio) issues.push(error("MISSING_ITEM_IMAGE_RATIO", "Item image slots require an explicit image ratio.", pageId, sectionId));
}

function familyFromComponentId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  for (const family of Object.keys(FAMILY_ALIASES)) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function satisfiesRequirement(families: string[], requirement: string): boolean {
  const directFamily = Object.entries(FAMILY_ALIASES).find(([, aliases]) => aliases.includes(requirement))?.[0] ?? requirement;
  return families.includes(directFamily);
}
function hasAction(value: unknown): boolean { if (!value || typeof value !== "object") return false; const action = value as Record<string, unknown>; return typeof action.label === "string" && action.label.trim().length > 0 && typeof action.href === "string" && action.href.trim().length > 0; }
function isMiCirqlNavbar(componentId: string): boolean { const value = componentId.toLowerCase(); return value.startsWith("navbar.") || value.includes("-nav-"); }
function error(code: string, message: string, pageId?: string, sectionId?: string): WebsiteValidationIssue { return { code, severity: "error", message, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) }; }
function warning(code: string, message: string, pageId?: string, sectionId?: string): WebsiteValidationIssue { return { code, severity: "warning", message, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) }; }
function finish(issues: WebsiteValidationIssue[]): WebsiteValidationResult { const errors = issues.filter((issue) => issue.severity === "error"); const warnings = issues.filter((issue) => issue.severity === "warning"); const score = Math.max(0, 100 - errors.length * 15 - warnings.length * 3); return { ready: errors.length === 0, score, errors, warnings }; }
