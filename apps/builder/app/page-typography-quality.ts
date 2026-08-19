import type { Site } from "@micirql/schema";

export type PageTypographyIssue = {
  code: "HERO_TITLE_EXTREME" | "SECTION_TITLE_TOO_LONG" | "CARD_TITLE_TOO_LONG" | "PARAGRAPH_TOO_DENSE" | "CTA_LABEL_TOO_LONG" | "EYEBROW_TOO_LONG" | "TOO_MANY_LONG_SECTION_TITLES" | "TYPOGRAPHY_FONT_ROLE_MISSING";
  severity: "warning" | "error";
  repairable: boolean;
  message: string;
};

export type PageTypographyQuality = {
  score: number;
  issues: PageTypographyIssue[];
  metrics: { heroTitleWords: number; longestSectionTitleWords: number; longSectionTitles: number; longCardTitles: number; denseParagraphs: number; longCtas: number; longEyebrows: number; sectionCount: number };
};

const SHELL = /navbar|footer/i;

export function evaluatePageTypographyQuality(site: Site, path = "/"): PageTypographyQuality {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const sections = (page?.sections ?? []).filter((section) => !section.hidden && !SHELL.test(section.component.componentId));
  const issues: PageTypographyIssue[] = [];
  const repair = readRepair(page?.sections ?? []);
  const hero = sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const heroTitleWords = words(text(hero?.props?.title) || text(hero?.props?.heading));
  const sectionTitleWords = sections.filter((section) => section !== hero).map((section) => words(text(section.props.title) || text(section.props.heading))).filter(Boolean);
  const longestSectionTitleWords = Math.max(0, ...sectionTitleWords);
  const longSectionTitles = sectionTitleWords.filter((count) => count > 10).length;
  let longCardTitles = 0, denseParagraphs = 0, longCtas = 0, longEyebrows = 0;

  for (const section of sections) {
    const description = text(section.props.description) || text(section.props.body);
    if (words(description) > 52) denseParagraphs += 1;
    const eyebrow = text(section.props.eyebrow);
    if (words(eyebrow) > 5 || eyebrow.length > 42) longEyebrows += 1;
    for (const key of ["primaryAction", "secondaryAction"] as const) {
      const label = actionLabel(section.props[key]);
      if (words(label) > 4 || label.length > 30) longCtas += 1;
    }
    const items = Array.isArray(section.props.items) ? section.props.items : [];
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const title = text(record.title);
      if (words(title) > 8 || title.length > 58) longCardTitles += 1;
      if (words(text(record.description)) > 42) denseParagraphs += 1;
    }
  }

  let score = 100;
  if (heroTitleWords > 16) { issues.push({ code: "HERO_TITLE_EXTREME", severity: "error", repairable: false, message: "Hero title is too long for the display hierarchy." }); score -= 22; }
  if (longestSectionTitleWords > 14) { const fatal = longestSectionTitleWords > 18; issues.push({ code: "SECTION_TITLE_TOO_LONG", severity: fatal ? "error" : "warning", repairable: !fatal, message: "A section heading exceeds the preferred heading measure." }); score -= fatal ? 18 : repair.pageMeasure ? 3 : 9; }
  if (longCardTitles) { const fatal = longCardTitles >= 4; issues.push({ code: "CARD_TITLE_TOO_LONG", severity: fatal ? "error" : "warning", repairable: true, message: "Card titles need a tighter measure." }); score -= fatal ? repair.cardMeasure ? 5 : 15 : repair.cardMeasure ? 2 : 6; }
  if (denseParagraphs) { const fatal = denseParagraphs >= 4; issues.push({ code: "PARAGRAPH_TOO_DENSE", severity: fatal ? "error" : "warning", repairable: true, message: "Text blocks exceed the preferred scanning measure." }); score -= fatal ? repair.copyMeasure ? 5 : 14 : repair.copyMeasure ? 2 : 6; }
  if (longCtas) { const fatal = longCtas >= 3; issues.push({ code: "CTA_LABEL_TOO_LONG", severity: fatal ? "error" : "warning", repairable: true, message: "CTA labels need a constrained UI-text treatment." }); score -= fatal ? repair.actionMeasure ? 5 : 14 : repair.actionMeasure ? 2 : 6; }
  if (longEyebrows) { issues.push({ code: "EYEBROW_TOO_LONG", severity: "warning", repairable: true, message: "Eyebrow labels exceed the preferred utility-text measure." }); score -= repair.eyebrowMeasure ? 1 : Math.min(8, longEyebrows * 3); }
  if (sections.length >= 6 && longSectionTitles / Math.max(1, sectionTitleWords.length) >= 0.5) { issues.push({ code: "TOO_MANY_LONG_SECTION_TITLES", severity: "warning", repairable: true, message: "Too many long section headings flatten the page hierarchy." }); score -= repair.pageMeasure ? 3 : 9; }
  const typography = site.theme.brand.typography;
  if (!text(typography?.display) || !text(typography?.body) || !text(typography?.ui)) { issues.push({ code: "TYPOGRAPHY_FONT_ROLE_MISSING", severity: "error", repairable: false, message: "Display, body and UI font roles must be defined." }); score -= 22; }
  return { score: Math.max(0, Math.min(100, score)), issues, metrics: { heroTitleWords, longestSectionTitleWords, longSectionTitles, longCardTitles, denseParagraphs, longCtas, longEyebrows, sectionCount: sections.length } };
}

function readRepair(sections: Site["pages"][number]["sections"]) {
  const hero = sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const raw = hero?.props?.pageTypographyRepair;
  const ops = raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray((raw as Record<string, unknown>).operations) ? ((raw as Record<string, unknown>).operations as unknown[]).filter((item): item is string => typeof item === "string") : [];
  return { pageMeasure: ops.includes("constrain-section-heading-measure"), cardMeasure: ops.includes("constrain-card-title-measure"), copyMeasure: ops.includes("constrain-copy-measure"), actionMeasure: ops.includes("stabilize-action-typography"), eyebrowMeasure: ops.includes("constrain-eyebrow-measure") };
}
function actionLabel(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? text((value as Record<string, unknown>).label) : ""; }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function words(value: string) { return value ? value.split(/\s+/).filter(Boolean).length : 0; }
