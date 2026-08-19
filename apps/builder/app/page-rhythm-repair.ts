import { siteSchema, type Site } from "@micirql/schema";
import type { PageRhythmIssue } from "./page-rhythm-quality";

export type PageRhythmRepairResult = {
  site: Site;
  repaired: boolean;
  operations: string[];
};

const SHELL_TOP = /navbar|hero/i;
const SHELL_BOTTOM = /cta|contact|footer/i;
const PROOF = /testimonial|proof|trust|team|technology|credential|result/i;
const STORY = /about|story|journey|process|editorial/i;
const VISUAL = /gallery|visual|image|portrait|outcome|lifestyle/i;

/**
 * One deterministic page-rhythm repair pass. It never rewrites content, removes
 * sections, swaps design families, or changes functionality. It may only:
 * - re-sequence middle-page content while preserving navbar/hero and CTA/contact/footer anchors;
 * - alternate palette roles to break long flat runs;
 * - relax isolated dense sections to create breathing points.
 */
export function repairPageRhythm(site: Site, issues: PageRhythmIssue[], path = "/"): PageRhythmRepairResult {
  if (!issues.length) return { site, repaired: false, operations: [] };
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  if (!page) return { site, repaired: false, operations: [] };

  const codes = new Set(issues.map((issue) => issue.code));
  const operations: string[] = [];

  if (codes.has("REPEATED_PATTERN_RUN") || codes.has("NO_STORY_PROOF_CONTRAST") || codes.has("FLAT_IMAGE_BALANCE")) {
    const reordered = reorderMiddleSections(page.sections);
    if (reordered.changed) {
      page.sections = reordered.sections;
      operations.push("rebalance-middle-section-sequence");
    }
  }

  if (codes.has("REPEATED_PALETTE_RUN") || codes.has("NO_CONVERSION_CONTRAST")) {
    const changed = alternatePaletteRoles(page.sections);
    if (changed) operations.push("alternate-section-palette-roles");
  }

  if (codes.has("DENSE_SECTION_CLUSTER")) {
    const changed = relaxDenseClusters(page.sections);
    if (changed) operations.push("insert-density-breathing-points");
  }

  if (!operations.length) return { site, repaired: false, operations: [] };
  return { site: siteSchema.parse(next), repaired: true, operations };
}

function reorderMiddleSections(sections: Site["pages"][number]["sections"]) {
  const top: typeof sections = [];
  const middle: typeof sections = [];
  const bottom: typeof sections = [];

  for (const section of sections) {
    const signal = sectionSignal(section);
    if (SHELL_TOP.test(signal)) top.push(section);
    else if (SHELL_BOTTOM.test(signal)) bottom.push(section);
    else middle.push(section);
  }

  // Keep navbar before hero regardless of their original relative position.
  top.sort((a, b) => topRank(a) - topRank(b));
  bottom.sort((a, b) => bottomRank(a) - bottomRank(b));

  const buckets = {
    proof: middle.filter((section) => PROOF.test(sectionSignal(section))),
    story: middle.filter((section) => STORY.test(sectionSignal(section))),
    visual: middle.filter((section) => VISUAL.test(sectionSignal(section))),
    other: middle.filter((section) => {
      const signal = sectionSignal(section);
      return !PROOF.test(signal) && !STORY.test(signal) && !VISUAL.test(signal);
    }),
  };

  const ordered: typeof sections = [];
  const cycle: Array<keyof typeof buckets> = ["proof", "story", "other", "visual"];
  while (ordered.length < middle.length) {
    let progressed = false;
    for (const key of cycle) {
      const nextSection = buckets[key].shift();
      if (!nextSection) continue;
      ordered.push(nextSection);
      progressed = true;
    }
    if (!progressed) break;
  }

  const next = [...top, ...ordered, ...bottom];
  const changed = next.map((section) => section.id).join("|") !== sections.map((section) => section.id).join("|");
  return { sections: next, changed };
}

function alternatePaletteRoles(sections: Site["pages"][number]["sections"]) {
  let changed = false;
  let run = 0;
  let previous = "";
  const roles = ["background", "surface", "secondary"] as const;

  sections.forEach((section, index) => {
    if (/navbar|footer/i.test(sectionSignal(section))) return;
    const role = text(section.props.paletteRole) || "background";
    run = role === previous ? run + 1 : 1;
    previous = role;
    if (run < 3) return;
    const replacement = roles.find((candidate) => candidate !== role) ?? "surface";
    section.props = { ...section.props, paletteRole: replacement, rhythmRepairPalette: true, rhythmRepairIndex: index };
    previous = replacement;
    run = 1;
    changed = true;
  });
  return changed;
}

function relaxDenseClusters(sections: Site["pages"][number]["sections"]) {
  let denseRun = 0;
  let changed = false;
  sections.forEach((section, index) => {
    const density = text(section.props.layoutDensity) || text(section.props.density);
    if (/compact|dense/.test(density)) denseRun += 1;
    else denseRun = 0;
    if (denseRun < 3) return;
    section.props = { ...section.props, layoutDensity: "balanced", rhythmRepairDensity: true, rhythmRepairIndex: index };
    denseRun = 0;
    changed = true;
  });
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
  return `${section.component.componentId} ${text(section.props.layoutPattern)} ${text(section.props.layoutPurpose)} ${text(section.props.layoutImageStyle)}`.toLowerCase();
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
