import type { Site } from "@micirql/schema";

export type FirstBuildQualityIssue = {
  code: string;
  message: string;
  severity: "blocker" | "warning";
  sectionId?: string;
};

export type FirstBuildQualityResult = {
  ready: boolean;
  score: number;
  issues: FirstBuildQualityIssue[];
  metrics: {
    visibleSections: number;
    contentSections: number;
    shallowSections: number;
    repeatedComponentVariants: number;
    distinctPrimaryCtas: number;
    coverage: {
      shell: boolean;
      opening: boolean;
      offering: boolean;
      trust: boolean;
      conversion: boolean;
    };
  };
};

const SHELL = new Set(["navbar", "footer"]);
const OFFERING = new Set(["services", "features", "about", "pricing"]);
const TRUST = new Set(["testimonials", "team", "about", "process", "gallery"]);
const CONVERSION = new Set(["cta", "contact", "lead-capture", "form"]);
const TEXT_KEYS = ["body", "description", "summary", "intro", "copy", "text"];
const GENERIC_HEADINGS = new Set(["home", "about", "services", "features", "process", "testimonials", "gallery", "team", "contact"]);
const GENERIC_PRIMARY_CTAS = new Set(["get started", "learn more", "next", "continue"]);

export function evaluateFirstBuildQuality(site: Site): FirstBuildQualityResult {
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  if (!home) {
    return {
      ready: false,
      score: 0,
      issues: [{ code: "HOME_PAGE_MISSING", message: "The generated website has no home page.", severity: "blocker" }],
      metrics: {
        visibleSections: 0,
        contentSections: 0,
        shallowSections: 0,
        repeatedComponentVariants: 0,
        distinctPrimaryCtas: 0,
        coverage: { shell: false, opening: false, offering: false, trust: false, conversion: false },
      },
    };
  }

  const visible = home.sections.filter((section) => !section.hidden);
  const families = visible.map((section) => familyFromId(section.component.componentId));
  const coverage = {
    shell: families.includes("navbar") && families.includes("footer"),
    opening: families.includes("hero"),
    offering: families.some((family) => Boolean(family && OFFERING.has(family))),
    trust: families.some((family) => Boolean(family && TRUST.has(family))),
    conversion: families.some((family) => Boolean(family && CONVERSION.has(family))),
  };

  const issues: FirstBuildQualityIssue[] = [];
  if (!coverage.shell) issues.push({ code: "SHELL_INCOMPLETE", message: "The home page should include both navigation and footer shell sections.", severity: "blocker" });
  if (!coverage.opening) issues.push({ code: "HERO_MISSING", message: "The home page needs a clear hero/opening section.", severity: "blocker" });
  if (!coverage.offering) issues.push({ code: "OFFERING_MISSING", message: "The home page needs a clear services, features, about, or pricing section.", severity: "blocker" });
  if (!coverage.trust) issues.push({ code: "TRUST_MISSING", message: "The home page needs at least one trust-building section such as team, testimonials, process, about, or gallery.", severity: "blocker" });
  if (!coverage.conversion) issues.push({ code: "CONVERSION_MISSING", message: "The home page needs a late conversion section such as CTA, contact, lead capture, or form.", severity: "blocker" });

  const contentSections = visible.filter((section) => {
    const family = familyFromId(section.component.componentId);
    return Boolean(family && !SHELL.has(family));
  });
  const shallowSections = contentSections.filter((section) => sectionIsShallow(section.props));
  for (const section of shallowSections) {
    issues.push({ code: "SHALLOW_SECTION", message: "This section has a heading but not enough supporting copy or item detail.", severity: "blocker", sectionId: section.id });
  }

  for (const section of contentSections) {
    const heading = firstString(section.props, ["heading", "title"]);
    if (heading && isScaffoldHeading(heading)) {
      issues.push({ code: "SCAFFOLD_COPY", message: `Generated heading still looks like scaffold copy: ${heading}`, severity: "blocker", sectionId: section.id });
    }
    const primaryLabel = primaryCtaLabel(section.props);
    if (primaryLabel && GENERIC_PRIMARY_CTAS.has(primaryLabel.toLowerCase())) {
      issues.push({ code: "GENERIC_PRIMARY_CTA", message: `Primary CTA is too generic for a premium first build: ${primaryLabel}`, severity: "warning", sectionId: section.id });
    }
  }

  const componentCounts = new Map<string, number>();
  for (const section of visible) componentCounts.set(section.component.componentId, (componentCounts.get(section.component.componentId) ?? 0) + 1);
  const repeatedComponentVariants = [...componentCounts.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
  if (repeatedComponentVariants > 0) issues.push({ code: "REPEATED_VARIANT", message: "The page repeats the same component variant and may feel templated.", severity: "warning" });

  const ctaLabels = new Set<string>();
  for (const section of visible) collectCtaLabels(section.props, ctaLabels);
  if (ctaLabels.size > 4) issues.push({ code: "CTA_FRAGMENTATION", message: "Too many different primary CTA labels weaken conversion consistency.", severity: "warning" });

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.length - blockerCount;
  const score = Math.max(0, Math.min(100, 100 - blockerCount * 12 - warningCount * 4));
  return {
    ready: blockerCount === 0 && score >= 88,
    score,
    issues,
    metrics: {
      visibleSections: visible.length,
      contentSections: contentSections.length,
      shallowSections: shallowSections.length,
      repeatedComponentVariants,
      distinctPrimaryCtas: ctaLabels.size,
      coverage,
    },
  };
}

function sectionIsShallow(props: Record<string, unknown>): boolean {
  const heading = firstString(props, ["heading", "title"]);
  if (!heading) return false;
  const body = firstString(props, TEXT_KEYS);
  if (body && wordCount(body) >= 8) return false;

  const items = Array.isArray(props.items) ? props.items : [];
  if (items.length > 0) {
    const detailed = items.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      const detail = firstString(record, ["description", "body", "summary", "text"]);
      return Boolean(detail && wordCount(detail) >= 6);
    }).length;
    if (detailed >= Math.min(2, items.length)) return false;
  }
  return true;
}

function isScaffoldHeading(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "");
  if (GENERIC_HEADINGS.has(normalized)) return true;
  if (/^(ready to discuss|a clear overview of|what matters about|explore) (home|services|treatments|contact|doctor|cases)$/.test(normalized)) return true;
  if (/all dental related treatments/.test(normalized)) return true;
  return excessiveCaps(value);
}

function excessiveCaps(value: string): boolean {
  const letters = [...value].filter((char) => /[a-z]/i.test(char));
  if (letters.length < 20 || value.trim().split(/\s+/).length < 4) return false;
  const upper = letters.filter((char) => char === char.toUpperCase()).length;
  return upper / letters.length >= 0.78;
}

function primaryCtaLabel(props: Record<string, unknown>): string {
  const action = props.primaryAction;
  if (!action || typeof action !== "object" || Array.isArray(action)) return "";
  const label = (action as Record<string, unknown>).label;
  return typeof label === "string" ? label.trim() : "";
}

function collectCtaLabels(value: unknown, labels: Set<string>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectCtaLabels(item, labels);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const key of ["primaryAction", "primaryCta", "cta", "action"]) {
    const action = record[key];
    if (action && typeof action === "object" && !Array.isArray(action)) {
      const label = (action as Record<string, unknown>).label;
      if (typeof label === "string" && label.trim()) labels.add(label.trim().toLowerCase());
    }
  }
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", services: "services", feat: "features", features: "features", proc: "process", process: "process", test: "testimonials", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", contact: "contact", foot: "footer", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}
