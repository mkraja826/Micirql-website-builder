import { siteSchema, type Site } from "@micirql/schema";
import type { PageTypographyIssue } from "./page-typography-quality";

export type PageTypographyRepairResult = { site: Site; repaired: boolean; operations: string[]; css: string };

/**
 * One bounded typography repair pass. It never rewrites copy, changes font
 * families, removes content, or replaces a certified section variant. It only
 * constrains measures and line-height for repairable presentation failures.
 */
export function repairPageTypography(site: Site, issues: PageTypographyIssue[], path = "/"): PageTypographyRepairResult {
  const repairable = issues.filter((issue) => issue.repairable);
  if (!repairable.length) return { site, repaired: false, operations: [], css: "" };
  const codes = new Set(repairable.map((issue) => issue.code));
  const operations: string[] = [];
  if (codes.has("SECTION_TITLE_TOO_LONG") || codes.has("TOO_MANY_LONG_SECTION_TITLES")) operations.push("constrain-section-heading-measure");
  if (codes.has("CARD_TITLE_TOO_LONG")) operations.push("constrain-card-title-measure");
  if (codes.has("PARAGRAPH_TOO_DENSE")) operations.push("constrain-copy-measure");
  if (codes.has("CTA_LABEL_TOO_LONG")) operations.push("stabilize-action-typography");
  if (codes.has("EYEBROW_TOO_LONG")) operations.push("constrain-eyebrow-measure");
  if (!operations.length) return { site, repaired: false, operations: [], css: "" };

  const css = typographyRepairCss(operations);
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  if (!hero) return { site, repaired: false, operations: [], css: "" };
  hero.props = { ...hero.props, pageTypographyRepair: { version: 1, operations: [...operations], reasons: repairable.map((issue) => issue.code), css } };
  return { site: siteSchema.parse(next), repaired: true, operations, css };
}

export function persistedPageTypographyRepairCss(site: Site, path = "/"): string {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const raw = hero?.props?.pageTypographyRepair;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const css = (raw as Record<string, unknown>).css;
  return typeof css === "string" ? css.trim() : "";
}

function typographyRepairCss(operations: string[]) {
  // The same persisted CSS must work inside the builder preview document and on
  // the published HTML body without relying on editor-only wrapper attributes.
  const root = ":where(body,.renderer-preview-document)";
  const rules: string[] = [];
  if (operations.includes("constrain-section-heading-measure")) rules.push(`${root} .mi-content-heading .mi-type--h2{max-width:20ch;line-height:1.04;text-wrap:balance}`);
  if (operations.includes("constrain-card-title-measure")) rules.push(`${root} .mi-type--h3,${root} .mi-service-item h3{max-width:26ch;line-height:1.12;text-wrap:balance}`);
  if (operations.includes("constrain-copy-measure")) rules.push(`${root} .mi-content-heading .mi-type--body,${root} .mi-type--body-sm,${root} .mi-section p{max-width:64ch}`);
  if (operations.includes("stabilize-action-typography")) rules.push(`${root} .mi-section__action{max-width:22rem;line-height:1.2;text-align:center;white-space:normal}`);
  if (operations.includes("constrain-eyebrow-measure")) rules.push(`${root} .mi-type--eyebrow{max-width:32ch;line-height:1.35}`);
  if (rules.length) rules.push(`@media(max-width:430px){${root} .mi-content-heading .mi-type--h2{max-width:16ch}${root} .mi-type--h3{max-width:22ch}${root} .mi-type--body,${root} .mi-type--body-sm,${root} .mi-section p{max-width:58ch}}`);
  return rules.join("\n");
}
