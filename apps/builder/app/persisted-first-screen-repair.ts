import { siteSchema, type Site } from "@micirql/schema";
import type { FirstScreenRepairPlan, FirstScreenRepairViewport } from "./rendered-first-screen-repair";
import { persistedPageTypographyRepairCss } from "./page-typography-repair";
import { persistedRenderedTypographyRepairCss } from "./persisted-rendered-typography-repair";

export type PersistedFirstScreenRepair = {
  version: 1;
  viewport: FirstScreenRepairViewport;
  operations: FirstScreenRepairPlan["operations"];
  reasons: string[];
  css: string;
};

type RepairMap = Partial<Record<FirstScreenRepairViewport, PersistedFirstScreenRepair>>;

const PROP_KEY = "renderedFirstScreenRepairs";

export function persistFirstScreenRepair(site: Site, plan: FirstScreenRepairPlan): Site {
  if (!plan.required || !plan.css) return site;
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  const hero = home?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  if (!hero) return site;

  const current = readRepairMap(hero.props?.[PROP_KEY]);
  current[plan.viewport] = {
    version: 1,
    viewport: plan.viewport,
    operations: [...plan.operations],
    reasons: [...plan.reasons],
    css: plan.css,
  };
  hero.props = { ...hero.props, [PROP_KEY]: current };
  return siteSchema.parse(next);
}

export function persistedFirstScreenRepairCss(site: Site, viewport: FirstScreenRepairViewport, path = "/"): string {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const firstScreenCss = hero ? (readRepairMap(hero.props?.[PROP_KEY])[viewport]?.css ?? "") : "";
  const typographyCss = persistedPageTypographyRepairCss(site, path);
  const renderedTypographyCss = persistedRenderedTypographyRepairCss(site, viewport, path)
    .replaceAll("[data-mi-rendered-typography-repair='1']", "[data-mi-first-screen-repair='1']");
  return [firstScreenCss, typographyCss, renderedTypographyCss].filter((css) => css.trim()).join("\n");
}

export function hasPersistedFirstScreenRepair(site: Site, viewport: FirstScreenRepairViewport, path = "/"): boolean {
  return Boolean(persistedFirstScreenRepairCss(site, viewport, path));
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
      operations: Array.isArray(record.operations) ? record.operations.filter((item): item is FirstScreenRepairPlan["operations"][number] => typeof item === "string") : [],
      reasons: Array.isArray(record.reasons) ? record.reasons.filter((item): item is string => typeof item === "string") : [],
      css: record.css,
    };
  }
  return result;
}
