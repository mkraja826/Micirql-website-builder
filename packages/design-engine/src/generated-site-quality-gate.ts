import type { Site } from "@micirql/schema";

export type GeneratedSiteQualityIssue = {
  code: string;
  message: string;
  pageId?: string;
  sectionId?: string;
};

export type GeneratedSiteQualityResult = {
  ready: boolean;
  issues: GeneratedSiteQualityIssue[];
  metrics: {
    placeholderCount: number;
    genericHeadingCount: number;
    suspiciousNavigationCount: number;
    duplicateIntentCount: number;
    brandMismatchCount: number;
  };
};

const PLACEHOLDER_PATTERNS = [
  /content for this section will be tailored to your business/i,
  /a tailored website is being prepared from your business brief/i,
  /lorem ipsum/i,
  /placeholder/i,
  /coming soon/i,
  /add (?:your|verified) /i,
];

const GENERIC_HEADINGS = new Set([
  "nav", "cta", "trust", "proof", "technology", "doctor", "footer", "features", "section",
]);

const INTENT_FAMILIES = new Set(["services", "testimonials", "contact", "cta"]);

export function evaluateGeneratedSiteQuality(site: Site, expectedBusinessName?: string): GeneratedSiteQualityResult {
  const issues: GeneratedSiteQualityIssue[] = [];
  let placeholderCount = 0;
  let genericHeadingCount = 0;
  let suspiciousNavigationCount = 0;
  let duplicateIntentCount = 0;
  let brandMismatchCount = 0;
  const expected = normalize(expectedBusinessName || site.name || "");

  for (const page of site.pages) {
    const intentCounts = new Map<string, number>();
    for (const section of page.sections.filter((item) => !item.hidden)) {
      const props = (section.props ?? {}) as Record<string, unknown>;
      for (const value of collectStrings(props)) {
        if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
          placeholderCount++;
          issues.push(issue("GENERATION_PLACEHOLDER_COPY", "Unfinished scaffold or placeholder copy remains in the generated website.", page.id, section.id));
          break;
        }
      }

      const heading = text(props.heading);
      if (heading && GENERIC_HEADINGS.has(normalize(heading))) {
        genericHeadingCount++;
        issues.push(issue("GENERATION_GENERIC_HEADING", `Generic scaffold heading \"${heading}\" remains in the website.`, page.id, section.id));
      }

      const family = familyFromComponentId(section.component.componentId);
      if (family && INTENT_FAMILIES.has(family)) intentCounts.set(family, (intentCounts.get(family) ?? 0) + 1);

      for (const nav of navigationItems(props)) {
        const title = text(nav.title);
        const href = text(nav.href);
        if (title.length > 42 || title.split(/\s+/).length > 6 || /while still|website should|i want|showing our|we focus|make it/i.test(title)) {
          suspiciousNavigationCount++;
          issues.push(issue("GENERATION_PROMPT_FRAGMENT_NAV", `Navigation item \"${title}\" looks like raw prompt text rather than a deliberate page label.`, page.id, section.id));
        }
        if (href.length > 90 || href.split("-").length > 9) {
          suspiciousNavigationCount++;
          issues.push(issue("GENERATION_SUSPICIOUS_SLUG", `Navigation destination \"${href}\" is excessively long and likely came from raw prompt text.`, page.id, section.id));
        }
      }

      if (expected && family === "hero") {
        const heroHeading = normalize(heading);
        if (heroHeading && !heroHeading.includes(expected) && looksLikeBusinessName(heading)) {
          brandMismatchCount++;
          issues.push(issue("GENERATION_BRAND_MISMATCH", `Hero branding does not match the expected business name \"${expectedBusinessName || site.name}\".`, page.id, section.id));
        }
      }
    }

    for (const [family, count] of intentCounts) {
      const limit = family === "cta" ? 2 : 1;
      if (count > limit) {
        duplicateIntentCount += count - limit;
        issues.push(issue("GENERATION_DUPLICATE_INTENT", `Page contains too many ${family} sections (${count}); composition should be deliberate rather than repetitive.`, page.id));
      }
    }
  }

  return {
    ready: issues.length === 0,
    issues: dedupe(issues),
    metrics: { placeholderCount, genericHeadingCount, suspiciousNavigationCount, duplicateIntentCount, brandMismatchCount },
  };
}

function issue(code: string, message: string, pageId?: string, sectionId?: string): GeneratedSiteQualityIssue {
  return { code, message, ...(pageId ? { pageId } : {}), ...(sectionId ? { sectionId } : {}) };
}

function collectStrings(value: unknown, depth = 0): string[] {
  if (depth > 4) return [];
  if (typeof value === "string") return [value.trim()].filter(Boolean);
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item, depth + 1));
}

function navigationItems(props: Record<string, unknown>): Array<Record<string, unknown>> {
  const output: Array<Record<string, unknown>> = [];
  const direct = props.items;
  if (Array.isArray(direct)) for (const item of direct) if (item && typeof item === "object") output.push(item as Record<string, unknown>);
  const groups = props.navigationGroups;
  if (Array.isArray(groups)) for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const items = (group as Record<string, unknown>).items;
    if (Array.isArray(items)) for (const item of items) if (item && typeof item === "object") output.push(item as Record<string, unknown>);
  }
  return output;
}

function familyFromComponentId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const codes: Record<string, string> = { serv: "services", services: "services", test: "testimonials", testimonials: "testimonials", cont: "contact", contact: "contact", cta: "cta", hero: "hero" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`) || value.startsWith(`${code}.`)) return family;
  return undefined;
}

function looksLikeBusinessName(value: string): boolean {
  const clean = value.trim();
  if (!clean || clean.length > 60) return false;
  return /(?:dental|dentistry|clinic|centre|center|care|studio|hospital|smiles?)$/i.test(clean);
}

function dedupe(issues: GeneratedSiteQualityIssue[]): GeneratedSiteQualityIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}:${item.pageId ?? ""}:${item.sectionId ?? ""}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function normalize(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
