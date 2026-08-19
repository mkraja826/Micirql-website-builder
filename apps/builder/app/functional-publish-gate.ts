import type { Site } from "@micirql/schema";

export type FunctionalPublishIssue = {
  code: "INVALID_ACTION" | "BROKEN_INTERNAL_LINK" | "MISSING_CONVERSION_PATH" | "MISSING_CONTACT_PATH";
  message: string;
  pagePath?: string;
  sectionId?: string;
};

export type FunctionalPublishGateResult = {
  ready: boolean;
  issues: FunctionalPublishIssue[];
};

const unsafeProtocol = /^(?:javascript|data|file|vbscript):/i;
const contactPattern = /^(?:tel:|mailto:|sms:|https?:\/\/)/i;
const conversionWords = /(book|appointment|contact|call|quote|enquir|consult|reserve|schedule|buy|order|get started)/i;

export function evaluateFunctionalPublishGate(site: Site): FunctionalPublishGateResult {
  const issues: FunctionalPublishIssue[] = [];
  const pagePaths = new Set(site.pages.map((page) => normalizePath(page.path)));
  let hasConversionPath = false;
  let hasContactPath = false;

  for (const page of site.pages) {
    for (const nav of site.navigation) {
      inspectHref(nav.href, page.path, undefined, pagePaths, issues);
    }

    for (const section of page.sections) {
      const actions = collectActions(section.props);
      for (const action of actions) {
        const label = action.label ?? "";
        const href = action.href ?? "";
        if (!href.trim() || href.trim() === "#" || unsafeProtocol.test(href.trim())) {
          issues.push({
            code: "INVALID_ACTION",
            message: `Action${label ? ` “${label}”` : ""} has no safe destination.`,
            pagePath: page.path,
            sectionId: section.id,
          });
          continue;
        }
        inspectHref(href, page.path, section.id, pagePaths, issues);
        if (conversionWords.test(label) || conversionWords.test(href)) hasConversionPath = true;
        if (contactPattern.test(href) || /contact|enquir|book|appointment/i.test(href)) hasContactPath = true;
      }

      for (const binding of Object.values(section.bindings)) {
        if (binding?.actionId) hasConversionPath = true;
      }
    }
  }

  if (!hasConversionPath) {
    issues.push({ code: "MISSING_CONVERSION_PATH", message: "No usable primary conversion path was found (booking, contact, enquiry, call, quote or equivalent)." });
  }
  if (!hasContactPath) {
    const hasContactPage = site.pages.some((page) => /contact|book|appointment|enquir/i.test(page.path) || /contact|book|appointment|enquir/i.test(page.name));
    if (!hasContactPage) issues.push({ code: "MISSING_CONTACT_PATH", message: "Visitors have no clear contact or booking destination." });
  }

  return { ready: issues.length === 0, issues };
}

function inspectHref(
  rawHref: string,
  pagePath: string,
  sectionId: string | undefined,
  pagePaths: Set<string>,
  issues: FunctionalPublishIssue[],
) {
  const href = rawHref.trim();
  if (!href || href === "#" || unsafeProtocol.test(href)) {
    issues.push({ code: "INVALID_ACTION", message: `Unsafe or empty link destination: ${href || "(empty)"}.`, pagePath, ...(sectionId ? { sectionId } : {}) });
    return;
  }
  if (href.startsWith("#") || contactPattern.test(href)) return;
  if (href.startsWith("/")) {
    const target = normalizePath(href.split(/[?#]/, 1)[0] ?? href);
    if (!pagePaths.has(target)) {
      issues.push({ code: "BROKEN_INTERNAL_LINK", message: `Internal link points to missing page “${target}”.`, pagePath, ...(sectionId ? { sectionId } : {}) });
    }
  }
}

function collectActions(value: unknown): Array<{ label?: string; href?: string }> {
  const found: Array<{ label?: string; href?: string }> = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 5 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const href = typeof record.href === "string" ? record.href : undefined;
    const label = typeof record.label === "string" ? record.label : typeof record.text === "string" ? record.text : undefined;
    if (href !== undefined || (label && /action|button|cta/i.test(String(record.type ?? "")))) found.push({ ...(label ? { label } : {}), ...(href !== undefined ? { href } : {}) });
    for (const child of Object.values(record)) visit(child, depth + 1);
  };
  visit(value, 0);
  return found;
}

function normalizePath(path: string) {
  if (!path) return "/";
  const clean = path.startsWith("/") ? path : `/${path}`;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}
