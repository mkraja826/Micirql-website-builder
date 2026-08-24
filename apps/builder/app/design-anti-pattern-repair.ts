import { siteSchema, type Site } from "@micirql/schema";
import type { DesignAntiPatternIssue } from "@micirql/design-engine";

export type DesignAntiPatternRepairResult = {
  site: Site;
  repaired: boolean;
  operations: string[];
};

const SHELL_TOP = /navbar|hero/i;
const SHELL_BOTTOM = /cta|contact|footer/i;
const CARD_HEAVY = /services|features|testimonials|proof|team|gallery/i;

/**
 * One conservative repair pass for structural anti-patterns.
 *
 * This deliberately does not fabricate imagery, rewrite customer copy, delete
 * conversion actions or bypass hard anti-pattern failures. It only changes safe
 * composition metadata / ordering so a strong candidate gets one chance to improve
 * before the anti-pattern gate rejects or penalizes it.
 */
export function repairDesignAntiPatterns(site: Site, issues: DesignAntiPatternIssue[]): DesignAntiPatternRepairResult {
  if (!issues.length) return { site, repaired: false, operations: [] };

  const codes = new Set(issues.map((issue) => issue.code));
  const next = structuredClone(site);
  const operations: string[] = [];

  for (const page of next.pages) {
    const pageIssueCodes = new Set(
      issues.filter((issue) => !issue.pageId || issue.pageId === page.id).map((issue) => issue.code),
    );

    if (pageIssueCodes.has("DESIGN_REPEATED_SECTION_FAMILY") || pageIssueCodes.has("DESIGN_CARD_GRID_SATURATION")) {
      const result = rebalanceMiddleSections(page.sections);
      if (result.changed) {
        page.sections = result.sections;
        operations.push(`rebalance-composition:${page.id}`);
      }
    }

    if (pageIssueCodes.has("DESIGN_CARD_GRID_SATURATION")) {
      const relaxed = relaxCardSaturation(page.sections);
      if (relaxed > 0) operations.push(`flatten-card-saturation:${page.id}:${relaxed}`);
    }
  }

  // Repeated images / excessive identical CTAs are intentionally not auto-mutated
  // here. They are hard content/media defects and must remain visible to their
  // dedicated media/content repair systems rather than being hidden by this pass.
  if (!operations.length || (!codes.has("DESIGN_REPEATED_SECTION_FAMILY") && !codes.has("DESIGN_CARD_GRID_SATURATION"))) {
    return { site, repaired: false, operations: [] };
  }

  return { site: siteSchema.parse(next), repaired: true, operations };
}

function rebalanceMiddleSections(sections: Site["pages"][number]["sections"]) {
  const top: typeof sections = [];
  const middle: typeof sections = [];
  const bottom: typeof sections = [];

  for (const section of sections) {
    const signal = sectionSignal(section);
    if (SHELL_TOP.test(signal)) top.push(section);
    else if (SHELL_BOTTOM.test(signal)) bottom.push(section);
    else middle.push(section);
  }

  const cardHeavy = middle.filter((section) => CARD_HEAVY.test(sectionSignal(section)));
  const contrast = middle.filter((section) => !CARD_HEAVY.test(sectionSignal(section)));
  if (!cardHeavy.length || !contrast.length) return { sections, changed: false };

  const ordered: typeof sections = [];
  while (cardHeavy.length || contrast.length) {
    const previous = ordered.at(-1);
    const previousWasCard = previous ? CARD_HEAVY.test(sectionSignal(previous)) : false;
    const preferred = previousWasCard ? contrast.shift() : cardHeavy.shift();
    const fallback = preferred ?? (previousWasCard ? cardHeavy.shift() : contrast.shift());
    if (fallback) ordered.push(fallback);
  }

  top.sort((a, b) => topRank(a) - topRank(b));
  bottom.sort((a, b) => bottomRank(a) - bottomRank(b));
  const next = [...top, ...ordered, ...bottom];
  const changed = next.map((section) => section.id).join("|") !== sections.map((section) => section.id).join("|");
  return { sections: next, changed };
}

function relaxCardSaturation(sections: Site["pages"][number]["sections"]): number {
  let cardIndex = 0;
  let changed = 0;

  for (const section of sections) {
    if (!CARD_HEAVY.test(sectionSignal(section))) continue;
    const props = (section.props ?? {}) as Record<string, unknown>;
    const itemCount = Array.isArray(props.items) ? props.items.length : 0;
    if (itemCount < 3) continue;

    cardIndex += 1;
    // Keep the first strong card treatment, then flatten alternating later sections.
    // Renderers that understand these metadata keys can switch presentation; renderers
    // that do not will simply ignore them, so this is schema-safe and non-destructive.
    if (cardIndex <= 1 || cardIndex % 2 !== 0) continue;
    section.props = {
      ...props,
      layoutDensity: "balanced",
      cardTreatment: "flat",
      antiPatternRepair: true,
    };
    changed += 1;
  }

  return changed;
}

function topRank(section: Site["pages"][number]["sections"][number]) {
  return /navbar/i.test(sectionSignal(section)) ? 0 : 1;
}

function bottomRank(section: Site["pages"][number]["sections"][number]) {
  const signal = sectionSignal(section);
  if (/cta/i.test(signal)) return 0;
  if (/contact/i.test(signal)) return 1;
  return 2;
}

function sectionSignal(section: Site["pages"][number]["sections"][number]) {
  const props = (section.props ?? {}) as Record<string, unknown>;
  return `${section.component.componentId} ${text(props.layoutPattern)} ${text(props.layoutPurpose)} ${text(props.layoutImageStyle)}`.toLowerCase();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
