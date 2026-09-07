import type { Site } from "@micirql/schema";

export type PremiumCompositionGrammarIssue = {
  code: string;
  message: string;
  pageId: string;
};

export type PremiumCompositionGrammarResult = {
  site: Site;
  ready: boolean;
  changed: boolean;
  issues: PremiumCompositionGrammarIssue[];
  corrections: string[];
};

type SiteSection = Site["pages"][number]["sections"][number];

const SHELL = new Set(["navbar", "footer"]);
const AUTHORITY = new Set(["about", "team", "testimonials"]);
const DISCOVERY = new Set(["services", "features", "gallery"]);
const DENSE = new Set(["services", "features", "team", "testimonials", "gallery"]);
const BREAKERS = new Set(["about", "process"]);
const CONVERSION = new Set(["cta", "contact", "lead-capture", "form"]);

export function applyPremiumCompositionGrammar(site: Site): PremiumCompositionGrammarResult {
  const next = structuredClone(site);
  const corrections: string[] = [];

  for (const page of next.pages) {
    const visible = page.sections.filter((section) => !section.hidden);
    const content = visible.filter((section) => {
      const family = familyFromId(section.component.componentId);
      return !family || !SHELL.has(family);
    });

    // Render-certified blueprint sections are immutable here. They are validated
    // by the grammar but never silently reordered after certification.
    if (content.some(isVisualLocked)) continue;

    const ordered = normalizePage(content);
    if (!sameOrder(content, ordered)) {
      const hidden = page.sections.filter((section) => section.hidden);
      const shellStart = visible.filter((section) => familyFromId(section.component.componentId) === "navbar");
      const shellEnd = visible.filter((section) => familyFromId(section.component.componentId) === "footer");
      page.sections = [...shellStart, ...ordered, ...shellEnd, ...hidden];
      corrections.push(`${page.id}: normalized premium narrative rhythm`);
    }
  }

  const issues = evaluatePremiumCompositionGrammar(next);
  return { site: next, ready: issues.length === 0, changed: corrections.length > 0, issues, corrections };
}

export function evaluatePremiumCompositionGrammar(site: Site): PremiumCompositionGrammarIssue[] {
  const issues: PremiumCompositionGrammarIssue[] = [];

  for (const page of site.pages) {
    const families = page.sections
      .filter((section) => !section.hidden)
      .map((section) => familyFromId(section.component.componentId))
      .filter((family): family is string => Boolean(family && !SHELL.has(family)));

    if (families.length < 3) continue;

    const heroIndex = families.indexOf("hero");
    if (heroIndex > 0) issues.push(issue(page.id, "HERO_NOT_FIRST", "Hero must lead the content narrative."));

    const authorityIndex = families.findIndex((family) => AUTHORITY.has(family));
    if (families.length >= 6 && (authorityIndex < 0 || authorityIndex > 3)) {
      issues.push(issue(page.id, "AUTHORITY_TOO_LATE", "A trust/authority section must appear within the opening four content sections."));
    }

    const discoveryIndex = families.findIndex((family) => DISCOVERY.has(family));
    if (families.length >= 5 && (discoveryIndex < 0 || discoveryIndex > 3)) {
      issues.push(issue(page.id, "DISCOVERY_TOO_LATE", "Core offer/discovery content must appear within the opening four content sections."));
    }

    let denseRun = 0;
    for (const family of families) {
      denseRun = DENSE.has(family) ? denseRun + 1 : 0;
      if (denseRun > 2) {
        issues.push(issue(page.id, "DENSE_SECTION_RUN", "More than two dense card/grid-style section families appear consecutively."));
        break;
      }
    }

    for (let index = 1; index < families.length; index += 1) {
      if (families[index] === families[index - 1]) {
        issues.push(issue(page.id, "ADJACENT_FAMILY_REPEAT", `Adjacent ${families[index]} sections create repetitive composition.`));
        break;
      }
    }

    const firstConversion = families.findIndex((family) => CONVERSION.has(family));
    if (firstConversion >= 0 && firstConversion < Math.floor(families.length * 0.5) && families.length >= 6) {
      issues.push(issue(page.id, "CONVERSION_TOO_EARLY", "Primary conversion block appears before enough trust/discovery context has been established."));
    }

    const contactIndex = families.indexOf("contact");
    if (contactIndex >= 0 && contactIndex !== families.length - 1) {
      issues.push(issue(page.id, "CONTACT_NOT_LAST", "Contact should close the content narrative when present."));
    }
  }

  return issues;
}

function normalizePage(sections: SiteSection[]): SiteSection[] {
  if (sections.length < 3) return [...sections];
  const working = [...sections];

  moveFamilyTo(working, "hero", 0);

  const contentStart = familyFromId(working[0]?.component.componentId ?? "") === "hero" ? 1 : 0;
  moveFirstMatchingIntoWindow(working, AUTHORITY, contentStart, Math.min(contentStart + 2, working.length - 1));
  moveFirstMatchingIntoWindow(working, DISCOVERY, contentStart, Math.min(contentStart + 3, working.length - 1));

  breakDenseRuns(working);
  moveConversionToTail(working);
  return working;
}

function moveFamilyTo(sections: SiteSection[], family: string, target: number) {
  const index = sections.findIndex((section) => familyFromId(section.component.componentId) === family);
  if (index < 0 || index === target) return;
  const [section] = sections.splice(index, 1);
  if (section) sections.splice(Math.min(target, sections.length), 0, section);
}

function moveFirstMatchingIntoWindow(sections: SiteSection[], accepted: Set<string>, start: number, end: number) {
  if (sections.slice(start, end + 1).some((section) => accepted.has(familyFromId(section.component.componentId) ?? ""))) return;
  const index = sections.findIndex((section, candidateIndex) => candidateIndex > end && accepted.has(familyFromId(section.component.componentId) ?? ""));
  if (index < 0) return;
  const [section] = sections.splice(index, 1);
  if (section) sections.splice(Math.min(end, sections.length), 0, section);
}

function breakDenseRuns(sections: SiteSection[]) {
  for (let index = 2; index < sections.length; index += 1) {
    const current = familyFromId(sections[index]?.component.componentId ?? "");
    const previous = familyFromId(sections[index - 1]?.component.componentId ?? "");
    const beforePrevious = familyFromId(sections[index - 2]?.component.componentId ?? "");
    if (!current || !previous || !beforePrevious || !DENSE.has(current) || !DENSE.has(previous) || !DENSE.has(beforePrevious)) continue;

    const breakerIndex = sections.findIndex((section, candidateIndex) => candidateIndex > index && BREAKERS.has(familyFromId(section.component.componentId) ?? ""));
    if (breakerIndex < 0) continue;
    const [breaker] = sections.splice(breakerIndex, 1);
    if (breaker) sections.splice(index, 0, breaker);
  }
}

function moveConversionToTail(sections: SiteSection[]) {
  const contact = sections.filter((section) => familyFromId(section.component.componentId) === "contact");
  const cta = sections.filter((section) => familyFromId(section.component.componentId) === "cta");
  if (!contact.length && !cta.length) return;

  const remaining = sections.filter((section) => {
    const family = familyFromId(section.component.componentId);
    return family !== "cta" && family !== "contact";
  });
  sections.splice(0, sections.length, ...remaining, ...cta, ...contact);
}

function sameOrder(a: SiteSection[], b: SiteSection[]): boolean {
  return a.length === b.length && a.every((section, index) => section.id === b[index]?.id);
}

function isVisualLocked(section: SiteSection): boolean {
  return section.props?.layoutVisualLock === true && typeof section.props?.layoutBlueprintId === "string";
}

function issue(pageId: string, code: string, message: string): PremiumCompositionGrammarIssue {
  return { pageId, code, message };
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", services: "services", feat: "features", features: "features", proc: "process", process: "process", test: "testimonials", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", contact: "contact", foot: "footer", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}
