import type { Site, SiteSection } from "@micirql/schema";
import { buildContentEnrichmentContract } from "./content-enrichment-contract";

export type ContentIntegrityResult = {
  site: Site;
  appliedFields: number;
  restoredChanges: string[];
  structureIntact: boolean;
};

/**
 * Treats the pre-enrichment Site as authoritative and copies back only fields
 * explicitly granted by the content enrichment contract. This means a model or
 * provider cannot change layout, components, routes, navigation, media geometry,
 * bindings, actions, item counts or theme even if it ignores the prompt.
 */
export function enforceContentEnrichmentIntegrity(before: Site, after: Site): ContentIntegrityResult {
  const result = structuredClone(before);
  const restoredChanges = detectProtectedChanges(before, after);
  let appliedFields = 0;

  const contract = buildContentEnrichmentContract(before);
  const afterPages = new Map(after.pages.map((page) => [page.id, page]));

  for (const pageContract of contract) {
    const targetPage = result.pages.find((page) => page.id === pageContract.pageId);
    const sourcePage = afterPages.get(pageContract.pageId);
    if (!targetPage || !sourcePage) continue;

    if (typeof sourcePage.seo?.title === "string" && sourcePage.seo.title.trim()) {
      targetPage.seo.title = sourcePage.seo.title.slice(0, pageContract.seo.titleMax);
      appliedFields++;
    }
    if (typeof sourcePage.seo?.description === "string" && sourcePage.seo.description.trim()) {
      targetPage.seo.description = sourcePage.seo.description.slice(0, pageContract.seo.descriptionMax);
      appliedFields++;
    }

    const sourceSections = new Map(sourcePage.sections.map((section) => [section.id, section]));
    for (const sectionContract of pageContract.sections) {
      const targetSection = targetPage.sections.find((section) => section.id === sectionContract.sectionId);
      const sourceSection = sourceSections.get(sectionContract.sectionId);
      if (!targetSection || !sourceSection) continue;
      for (const path of sectionContract.editable) {
        appliedFields += copyAllowedPath(targetSection, sourceSection, path);
      }
    }
  }

  return {
    site: result,
    appliedFields,
    restoredChanges,
    structureIntact: restoredChanges.length === 0,
  };
}

function copyAllowedPath(target: SiteSection, source: SiteSection, path: string): number {
  if (path.startsWith("items[].")) {
    const field = path.slice("items[].".length);
    const targetItems = Array.isArray(target.props.items) ? target.props.items : [];
    const sourceItems = Array.isArray(source.props.items) ? source.props.items : [];
    let count = 0;
    for (let index = 0; index < Math.min(targetItems.length, sourceItems.length); index++) {
      const targetItem = targetItems[index];
      const sourceItem = sourceItems[index];
      if (!isRecord(targetItem) || !isRecord(sourceItem)) continue;
      const value = sourceItem[field];
      if (typeof value !== "string" || !value.trim()) continue;
      targetItem[field] = value;
      count++;
    }
    return count;
  }

  const parts = path.split(".");
  const sourceValue = readPath(source.props, parts);
  if (typeof sourceValue !== "string" || !sourceValue.trim()) return 0;
  return writePath(target.props, parts, sourceValue) ? 1 : 0;
}

function detectProtectedChanges(before: Site, after: Site): string[] {
  const issues: string[] = [];

  if (before.siteId !== after.siteId || before.workspaceId !== after.workspaceId) issues.push("site identity");
  if (before.name !== after.name || before.domain !== after.domain) issues.push("site identity fields");
  if (JSON.stringify(before.theme) !== JSON.stringify(after.theme)) issues.push("theme/design tokens");
  if (JSON.stringify(before.navigation) !== JSON.stringify(after.navigation)) issues.push("navigation");
  if (JSON.stringify(before.integrations) !== JSON.stringify(after.integrations)) issues.push("integrations");
  if (JSON.stringify(before.domains) !== JSON.stringify(after.domains)) issues.push("domains");
  if (before.pages.map((page) => page.id).join("|") !== after.pages.map((page) => page.id).join("|")) issues.push("page set/order");

  const afterPages = new Map(after.pages.map((page) => [page.id, page]));
  for (const page of before.pages) {
    const candidate = afterPages.get(page.id);
    if (!candidate) { issues.push(`page removed: ${page.id}`); continue; }
    if (page.path !== candidate.path || page.name !== candidate.name) issues.push(`page identity: ${page.id}`);
    if (page.sections.map((section) => section.id).join("|") !== candidate.sections.map((section) => section.id).join("|")) issues.push(`section set/order: ${page.id}`);

    const candidateSections = new Map(candidate.sections.map((section) => [section.id, section]));
    for (const section of page.sections) {
      const next = candidateSections.get(section.id);
      if (!next) { issues.push(`section removed: ${section.id}`); continue; }
      if (JSON.stringify(section.component) !== JSON.stringify(next.component)) issues.push(`component: ${section.id}`);
      if (section.hidden !== next.hidden) issues.push(`visibility: ${section.id}`);
      if (JSON.stringify(section.bindings) !== JSON.stringify(next.bindings)) issues.push(`bindings: ${section.id}`);
      if (JSON.stringify(protectedProps(section.props)) !== JSON.stringify(protectedProps(next.props))) issues.push(`protected props: ${section.id}`);
    }
  }

  return [...new Set(issues)];
}

function protectedProps(props: Record<string, unknown>): Record<string, unknown> {
  const copy = structuredClone(props);
  const editableTopLevel = new Set(["eyebrow", "title", "heading", "description", "body"]);
  for (const key of editableTopLevel) delete copy[key];

  if (isRecord(copy.primaryAction)) delete copy.primaryAction.label;
  if (Array.isArray(copy.items)) {
    copy.items = copy.items.map((item) => {
      if (!isRecord(item)) return item;
      const next = structuredClone(item);
      delete next.title;
      delete next.description;
      return next;
    });
  }
  return copy;
}

function readPath(source: Record<string, unknown>, parts: string[]): unknown {
  let value: unknown = source;
  for (const part of parts) {
    if (!isRecord(value)) return undefined;
    value = value[part];
  }
  return value;
}

function writePath(target: Record<string, unknown>, parts: string[], value: string): boolean {
  let cursor: Record<string, unknown> = target;
  for (let index = 0; index < parts.length - 1; index++) {
    const key = parts[index]!;
    const next = cursor[key];
    if (!isRecord(next)) return false;
    cursor = next;
  }
  cursor[parts.at(-1)!] = value;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
