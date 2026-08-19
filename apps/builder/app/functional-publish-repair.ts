import { siteSchema, type Site } from "@micirql/schema";
import { evaluateFunctionalPublishGate } from "./functional-publish-gate";

export type FunctionalPublishRepairResult = {
  site: Site;
  repaired: boolean;
  repairs: string[];
  remainingIssues: ReturnType<typeof evaluateFunctionalPublishGate>["issues"];
};

const unsafeProtocol = /^(?:javascript|data|file|vbscript):/i;
const conversionWords = /(book|appointment|contact|call|quote|enquir|consult|reserve|schedule|get started)/i;
const contactWords = /(contact|book|appointment|enquir|consult|schedule)/i;

type Action = { label?: string; href?: string };

export function repairFunctionalPublishIssues(site: Site): FunctionalPublishRepairResult {
  const next = structuredClone(site);
  const repairs: string[] = [];
  const contactPage = findContactPage(next);
  const contactDestination = contactPage?.path;

  repairNavigation(next, repairs);

  for (const page of next.pages) {
    for (const section of page.sections) {
      repairActionTree(section.props, contactDestination, page.path, section.id, repairs);
    }
  }

  if (contactDestination && !hasUsableConversion(next)) {
    const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
    const candidate = home?.sections.find((section) => {
      const id = section.component.componentId.toLowerCase();
      return id.includes("hero") || id.includes("cta");
    });
    if (candidate && !isAction(candidate.props.primaryAction)) {
      candidate.props = {
        ...candidate.props,
        primaryAction: { label: "Contact us", href: contactDestination },
      };
      repairs.push(`connected ${candidate.id} primary action to existing contact destination ${contactDestination}`);
    }
  }

  const parsed = siteSchema.parse(next);
  const remaining = evaluateFunctionalPublishGate(parsed).issues;
  return { site: parsed, repaired: repairs.length > 0, repairs, remainingIssues: remaining };
}

function findContactPage(site: Site) {
  return site.pages.find((page) => contactWords.test(page.path) || contactWords.test(page.name));
}

function repairNavigation(site: Site, repairs: string[]) {
  const paths = new Set(site.pages.map((page) => normalizePath(page.path)));
  for (const nav of site.navigation) {
    const href = nav.href.trim();
    if (!href.startsWith("/") || paths.has(normalizePath(href.split(/[?#]/, 1)[0] ?? href))) continue;
    const target = site.pages.find((page) => page.name.trim().toLowerCase() === nav.label.trim().toLowerCase());
    if (!target) continue;
    nav.href = target.path;
    repairs.push(`repaired navigation “${nav.label}” to ${target.path}`);
  }
}

function repairActionTree(value: unknown, contactDestination: string | undefined, pagePath: string, sectionId: string, repairs: string[], depth = 0) {
  if (depth > 5 || value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) repairActionTree(item, contactDestination, pagePath, sectionId, repairs, depth + 1);
    return;
  }
  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : typeof record.text === "string" ? record.text.trim() : "";
  const href = typeof record.href === "string" ? record.href.trim() : undefined;
  const looksLikeAction = href !== undefined || (label && /action|button|cta/i.test(String(record.type ?? "")));

  if (looksLikeAction && label && conversionWords.test(label) && contactDestination) {
    if (!href || href === "#" || unsafeProtocol.test(href)) {
      record.href = contactDestination;
      repairs.push(`repaired “${label}” in ${pagePath}#${sectionId} to ${contactDestination}`);
    }
  }

  for (const child of Object.values(record)) repairActionTree(child, contactDestination, pagePath, sectionId, repairs, depth + 1);
}

function hasUsableConversion(site: Site) {
  for (const page of site.pages) {
    for (const section of page.sections) {
      if (Object.values(section.bindings).some((binding) => Boolean(binding?.actionId))) return true;
      if (treeHasConversion(section.props)) return true;
    }
  }
  return false;
}

function treeHasConversion(value: unknown, depth = 0): boolean {
  if (depth > 5 || value == null) return false;
  if (Array.isArray(value)) return value.some((item) => treeHasConversion(item, depth + 1));
  if (typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label : typeof record.text === "string" ? record.text : "";
  const href = typeof record.href === "string" ? record.href.trim() : "";
  if (conversionWords.test(label) && href && href !== "#" && !unsafeProtocol.test(href)) return true;
  return Object.values(record).some((child) => treeHasConversion(child, depth + 1));
}

function isAction(value: unknown): value is Action {
  if (!value || typeof value !== "object") return false;
  const action = value as Action;
  return Boolean(action.label?.trim() && action.href?.trim() && action.href !== "#" && !unsafeProtocol.test(action.href));
}

function normalizePath(path: string) {
  if (!path) return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}
