import { siteSchema, type Site } from "@micirql/schema";
import type { ResponsiveCompositionRepairPlan, ResponsiveCompositionRepairViewport } from "./rendered-responsive-composition-repair";

export type PersistedResponsiveCompositionRepair = {
  version: 1;
  viewport: ResponsiveCompositionRepairViewport;
  operations: string[];
  reasons: string[];
  css: string;
};

type RepairMap = Partial<Record<ResponsiveCompositionRepairViewport, PersistedResponsiveCompositionRepair>>;
const PROP_KEY = "responsiveCompositionRepairs";

export function persistResponsiveCompositionRepair(site: Site, plan: ResponsiveCompositionRepairPlan, path = "/"): Site {
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
  hero.props = { ...hero.props, [PROP_KEY]: current };
  return siteSchema.parse(next);
}

export function persistedResponsiveCompositionRepairCss(site: Site, viewport: ResponsiveCompositionRepairViewport, path = "/"): string {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  if (!hero) return "";
  return readRepairMap(hero.props?.[PROP_KEY])[viewport]?.css ?? "";
}

export function hasPersistedResponsiveCompositionRepair(site: Site, viewport: ResponsiveCompositionRepairViewport, path = "/"): boolean {
  return Boolean(persistedResponsiveCompositionRepairCss(site, viewport, path));
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
