import { siteSchema, type Site } from "@micirql/schema";

export type RenderedVisualRepairDimension =
  | "first-screen"
  | "typography"
  | "responsive-composition"
  | "image";

/**
 * Applies exactly one rendered-visual repair dimension and fails closed if the
 * repair mutates anything outside that dimension's certified presentation
 * surface. Canonical copy/facts, art direction, palette, component/layout
 * choices and other planner-owned state therefore remain immutable.
 */
export function applyRenderedVisualRepairTransaction(
  site: Site,
  dimension: RenderedVisualRepairDimension,
  repair: (current: Site) => Site,
): Site {
  const next = siteSchema.parse(repair(site));
  assertRenderedVisualRepairOwnership(site, next, dimension);
  return next;
}

export function assertRenderedVisualRepairOwnership(
  before: unknown,
  after: unknown,
  dimension: RenderedVisualRepairDimension,
): void {
  const protectedBefore = protectedSnapshot(before, dimension);
  const protectedAfter = protectedSnapshot(after, dimension);
  if (protectedBefore !== protectedAfter) {
    throw new Error(`Rendered visual repair escaped ${dimension} ownership`);
  }
}

function protectedSnapshot(value: unknown, dimension: RenderedVisualRepairDimension): string {
  return JSON.stringify(stripAllowedRepairState(value, dimension));
}

function stripAllowedRepairState(value: unknown, dimension: RenderedVisualRepairDimension): unknown {
  if (Array.isArray(value)) return value.map((entry) => stripAllowedRepairState(entry, dimension));
  if (!value || typeof value !== "object") return value;

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (allowedKey(dimension, key)) continue;
    result[key] = stripAllowedRepairState(entry, dimension);
  }
  return result;
}

function allowedKey(dimension: RenderedVisualRepairDimension, key: string): boolean {
  if (dimension === "first-screen") return key === "renderedFirstScreenRepairs";
  if (dimension === "typography") return key === "renderedTypographyRepairs" || key === "pageTypographyRepair";
  if (dimension === "responsive-composition") return key === "responsiveCompositionRepairs";
  return key === "image"
    || key === "imageRatio"
    || key === "imageFit"
    || key === "imageFocalPoint"
    || key === "renderedImageRepair";
}
