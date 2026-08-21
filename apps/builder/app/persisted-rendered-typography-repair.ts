import { siteSchema, type Site } from "@micirql/schema";
import type { RenderedTypographyRepairPlan, RenderedTypographyRepairViewport } from "./rendered-page-typography-repair";

export type PersistedRenderedTypographyRepair = {
  version: 1;
  viewport: RenderedTypographyRepairViewport;
  operations: string[];
  reasons: string[];
  css: string;
};

type RepairMap = Partial<Record<RenderedTypographyRepairViewport, PersistedRenderedTypographyRepair>>;

const PROP_KEY = "renderedTypographyRepairs";

export function persistRenderedTypographyRepair(site: Site, plan: RenderedTypographyRepairPlan, path = "/"): Site {
  if (!plan.required || !plan.css) return site;
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  if (!hero) return site;

  const current = readRepairMap(hero.props?.[PROP_KEY]);
  current[plan.viewport] = {
    version: 1,
    viewport: plan.viewport,
    operations: [...plan.operations],
    reasons: [...plan.reasons],
    css: plan.css,
  };

  const rawPageTypography = hero.props?.pageTypographyRepair;
  const pageTypography = rawPageTypography && typeof rawPageTypography === "object" && !Array.isArray(rawPageTypography)
    ? { ...(rawPageTypography as Record<string, unknown>) }
    : {};
  const previousResponsive = readRepairMap(pageTypography.renderedResponsive);
  previousResponsive[plan.viewport] = current[plan.viewport]!;
  const baseCss = typeof pageTypography.baseCss === "string"
    ? pageTypography.baseCss
    : previousResponsiveHasEntries(pageTypography.renderedResponsive)
      ? ""
      : typeof pageTypography.css === "string"
        ? pageTypography.css
        : "";
  const liveResponsiveCss = responsiveLiveCss(previousResponsive);

  hero.props = {
    ...hero.props,
    [PROP_KEY]: current,
    pageTypographyRepair: {
      ...pageTypography,
      version: 1,
      baseCss,
      renderedResponsive: previousResponsive,
      css: [baseCss, liveResponsiveCss].filter((value) => value.trim()).join("\n"),
    },
  };
  return siteSchema.parse(next);
}

export function persistedRenderedTypographyRepairCss(
  site: Site,
  viewport: RenderedTypographyRepairViewport,
  path = "/",
): string {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  if (!hero) return "";
  return readRepairMap(hero.props?.[PROP_KEY])[viewport]?.css ?? "";
}

export function hasPersistedRenderedTypographyRepair(
  site: Site,
  viewport: RenderedTypographyRepairViewport,
  path = "/",
): boolean {
  return Boolean(persistedRenderedTypographyRepairCss(site, viewport, path));
}

function responsiveLiveCss(repairs: RepairMap): string {
  const cssFor = (viewport: RenderedTypographyRepairViewport) => (repairs[viewport]?.css ?? "")
    .replaceAll("[data-mi-rendered-typography-repair='1']", "[data-mi-page-typography-repair='1']");
  const mobile = cssFor("mobile");
  const tablet = cssFor("tablet");
  const desktop = cssFor("desktop");
  return [
    mobile ? `@media (max-width:430px){${mobile}}` : "",
    tablet ? `@media (min-width:431px) and (max-width:1024px){${tablet}}` : "",
    desktop ? `@media (min-width:1025px){${desktop}}` : "",
  ].filter(Boolean).join("\n");
}

function previousResponsiveHasEntries(value: unknown): boolean {
  return Object.keys(readRepairMap(value)).length > 0;
}

function readRepairMap(value: unknown): RepairMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: RepairMap = {};
  for (const viewport of ["mobile", "tablet", "desktop"] as const) {
    const entry = source[viewport];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.css !== "string" || !record.css.trim()) continue;
    result[viewport] = {
      version: 1,
      viewport,
      operations: Array.isArray(record.operations) ? record.operations.filter((item): item is string => typeof item === "string") : [],
      reasons: Array.isArray(record.reasons) ? record.reasons.filter((item): item is string => typeof item === "string") : [],
      css: record.css,
    };
  }
  return result;
}
