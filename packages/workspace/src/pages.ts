import type { Site, SitePage } from "@micirql/schema";

export type PageBlueprintLike = {
  slug: string;
  label: string;
  required: boolean;
  purpose: string;
  sectionFamilies: string[];
  seoIntent: "commercial" | "transactional" | "informational" | "local" | "brand";
};

export type PageSuggestion = {
  blueprint: PageBlueprintLike;
  reason: string;
  required: boolean;
};

export function missingPageSuggestions(site: Site, blueprints: readonly PageBlueprintLike[]): PageSuggestion[] {
  const paths = new Set(site.pages.map((page) => page.path));
  return blueprints
    .filter((blueprint) => !paths.has(blueprint.slug))
    .map((blueprint) => ({
      blueprint,
      required: blueprint.required,
      reason: blueprint.required
        ? `${blueprint.label} is required for this website type.`
        : `${blueprint.label} is recommended for ${blueprint.purpose.toLowerCase()}.`,
    }))
    .sort((a, b) => Number(b.required) - Number(a.required));
}

export function requiredPageIssues(site: Site, blueprints: readonly PageBlueprintLike[]) {
  return missingPageSuggestions(site, blueprints)
    .filter((item) => item.required)
    .map((item) => ({ code: "REQUIRED_PAGE_MISSING" as const, path: item.blueprint.slug, label: item.blueprint.label }));
}

export function duplicatePage(page: SitePage, existing: readonly SitePage[]): SitePage {
  const id = unique(`${page.id}-copy`, new Set(existing.map((item) => item.id)));
  const path = uniquePath(page.path === "/" ? "/home-copy" : `${page.path}-copy`, new Set(existing.map((item) => item.path)));
  return {
    ...structuredClone(page),
    id,
    path,
    name: `${page.name} Copy`,
    sections: page.sections.map((section, index) => ({ ...structuredClone(section), id: `${id}-section-${index + 1}` })),
    seo: { ...structuredClone(page.seo), title: `${page.seo.title} Copy`, canonicalPath: path, indexable: false },
  };
}

export function reorderPages(site: Site, pageId: string, toIndex: number): Site {
  const next = structuredClone(site);
  const index = next.pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new Error(`Unknown page ${pageId}.`);
  const [page] = next.pages.splice(index, 1);
  next.pages.splice(Math.max(0, Math.min(toIndex, next.pages.length)), 0, page!);
  const order = new Map(next.pages.map((item, idx) => [item.path, idx]));
  next.navigation.sort((a, b) => (order.get(a.href) ?? 9999) - (order.get(b.href) ?? 9999));
  return next;
}

function unique(seed: string, used: Set<string>) {
  let value = seed;
  let index = 2;
  while (used.has(value)) value = `${seed}-${index++}`;
  return value;
}

function uniquePath(seed: string, used: Set<string>) {
  const normalized = seed.startsWith("/") ? seed : `/${seed}`;
  return unique(normalized, used);
}
