import type { Site } from "@micirql/schema";

export type PageRhythmIssue = {
  code:
    | "PAGE_TOO_SHORT_FOR_RHYTHM"
    | "REPEATED_PATTERN_RUN"
    | "REPEATED_PALETTE_RUN"
    | "DENSE_SECTION_CLUSTER"
    | "FLAT_IMAGE_BALANCE"
    | "NO_CONVERSION_CONTRAST"
    | "NO_STORY_PROOF_CONTRAST";
  severity: "warning" | "error";
  message: string;
};

export type PageRhythmQuality = {
  score: number;
  issues: PageRhythmIssue[];
  metrics: {
    sectionCount: number;
    longestPatternRun: number;
    longestPaletteRun: number;
    longestDenseRun: number;
    imageLedSections: number;
    conversionSections: number;
    proofSections: number;
    storySections: number;
  };
};

const SHELL = /navbar|footer/i;
const CONVERSION = /cta|contact|appointment|conversion|booking/i;
const PROOF = /testimonial|proof|trust|team|technology|credential|result/i;
const STORY = /about|story|journey|process|editorial/i;

export function evaluatePageRhythmQuality(site: Site, path = "/"): PageRhythmQuality {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const sections = (page?.sections ?? []).filter((section) => !SHELL.test(section.component.componentId));
  const issues: PageRhythmIssue[] = [];

  const patterns = sections.map((section) => text(section.props.layoutPattern) || family(section.component.componentId));
  const palettes = sections.map((section) => text(section.props.paletteRole) || "background");
  const densities = sections.map((section) => text(section.props.layoutDensity) || text(section.props.density) || "balanced");
  const imageStyles = sections.map((section) => `${text(section.props.layoutImageStyle)} ${text(section.props.imageSlotMode)} ${text(section.props.itemImageRatio)}`.trim());

  const longestPatternRun = longestRun(patterns);
  const longestPaletteRun = longestRun(palettes);
  const longestDenseRun = longestRun(densities.map((value) => /compact|dense/.test(value) ? "dense" : "other"), "dense");
  const imageLedSections = imageStyles.filter((value) => /image|portrait|gallery|visual|lifestyle|technology|clinical|outcome|items|section/.test(value)).length;
  const conversionSections = sections.filter((section) => CONVERSION.test(sectionSignal(section))).length;
  const proofSections = sections.filter((section) => PROOF.test(sectionSignal(section))).length;
  const storySections = sections.filter((section) => STORY.test(sectionSignal(section))).length;

  let score = 100;
  if (sections.length < 6) {
    issues.push({ code: "PAGE_TOO_SHORT_FOR_RHYTHM", severity: "warning", message: "The page has too few content sections to establish a premium visual rhythm." });
    score -= 8;
  }
  if (longestPatternRun >= 3) {
    issues.push({ code: "REPEATED_PATTERN_RUN", severity: longestPatternRun >= 4 ? "error" : "warning", message: `${longestPatternRun} consecutive sections use the same composition pattern.` });
    score -= longestPatternRun >= 4 ? 18 : 10;
  }
  if (longestPaletteRun >= 4) {
    issues.push({ code: "REPEATED_PALETTE_RUN", severity: longestPaletteRun >= 5 ? "error" : "warning", message: `${longestPaletteRun} consecutive sections use the same background/palette role.` });
    score -= longestPaletteRun >= 5 ? 16 : 9;
  }
  if (longestDenseRun >= 3) {
    issues.push({ code: "DENSE_SECTION_CLUSTER", severity: longestDenseRun >= 4 ? "error" : "warning", message: `${longestDenseRun} dense sections appear back-to-back without a visual breathing point.` });
    score -= longestDenseRun >= 4 ? 16 : 9;
  }
  if (sections.length >= 7 && imageLedSections <= 1) {
    issues.push({ code: "FLAT_IMAGE_BALANCE", severity: "error", message: "The page is too text/card heavy and lacks enough image-led composition changes." });
    score -= 18;
  }
  if (conversionSections === 0) {
    issues.push({ code: "NO_CONVERSION_CONTRAST", severity: "error", message: "The page has no distinct conversion section to change rhythm before the footer." });
    score -= 18;
  }
  if (proofSections === 0 || storySections === 0) {
    issues.push({ code: "NO_STORY_PROOF_CONTRAST", severity: "warning", message: "The page needs both story and proof moments so the composition does not feel like a repeated catalogue." });
    score -= 10;
  }

  return {
    score: Math.max(0, score),
    issues,
    metrics: {
      sectionCount: sections.length,
      longestPatternRun,
      longestPaletteRun,
      longestDenseRun,
      imageLedSections,
      conversionSections,
      proofSections,
      storySections,
    },
  };
}

function sectionSignal(section: Site["pages"][number]["sections"][number]) {
  return `${family(section.component.componentId)} ${text(section.props.layoutPattern)} ${text(section.props.layoutPurpose)} ${text(section.props.layoutImageStyle)}`.toLowerCase();
}

function family(componentId: string) {
  const match = componentId.match(/-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/i);
  if (match?.[1]) return match[1].toLowerCase();
  return componentId.split(/[.-]/)[0]?.toLowerCase() ?? "section";
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function longestRun(values: string[], target?: string) {
  let longest = 0;
  let current = 0;
  let previous = "";
  for (const value of values) {
    if (target) current = value === target ? current + 1 : 0;
    else current = value && value === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = value;
  }
  return longest;
}
