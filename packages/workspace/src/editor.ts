import { siteSchema, type Site, type SitePage, type SiteSection, type ThemeConfig } from "@micirql/schema";

export type EditorSelection =
  | { kind: "site" }
  | { kind: "page"; pageId: string }
  | { kind: "section"; pageId: string; sectionId: string };

export type EditorViewport = "mobile" | "tablet" | "desktop";

export type EditorState = {
  site: Site;
  revision: number;
  dirty: boolean;
  selected: EditorSelection;
  viewport: EditorViewport;
  lastCommand?: WorkspaceCommand["type"];
};

export type WorkspaceCommand =
  | { type: "content.set"; pageId: string; sectionId: string; propPath: string; value: string | number | boolean | null }
  | { type: "asset.set"; pageId: string; sectionId: string; propPath: string; asset: { assetId: string; alt?: string; focalPoint?: { x: number; y: number } } }
  | { type: "theme.set"; theme: ThemeConfig }
  | { type: "brand.patch"; patch: Partial<ThemeConfig["brand"]> }
  | { type: "section.component.set"; pageId: string; sectionId: string; componentId: string; version: string }
  | { type: "section.hidden.set"; pageId: string; sectionId: string; hidden: boolean }
  | { type: "section.reorder"; pageId: string; sectionId: string; toIndex: number }
  | { type: "section.remove"; pageId: string; sectionId: string }
  | { type: "page.add"; page: SitePage; navigationLabel?: string }
  | { type: "page.remove"; pageId: string }
  | { type: "page.reorder"; pageId: string; toIndex: number }
  | { type: "page.path.set"; pageId: string; path: string }
  | { type: "page.seo.patch"; pageId: string; patch: Partial<SitePage["seo"]> }
  | { type: "binding.set"; pageId: string; sectionId: string; bindingKey: string; actionId: string; inputMap?: Record<string, string> }
  | { type: "binding.remove"; pageId: string; sectionId: string; bindingKey: string }
  | { type: "navigation.set"; items: Site["navigation"] };

export type WorkspaceMutationPolicy = {
  canRemovePage?(site: Site, page: SitePage): boolean | string;
  canRemoveSection?(site: Site, page: SitePage, section: SiteSection): boolean | string;
  canUseComponent?(args: { site: Site; page: SitePage; section: SiteSection; componentId: string; version: string }): boolean | string;
  canBindAction?(args: { site: Site; page: SitePage; section: SiteSection; actionId: string }): boolean | string;
};

export function createEditorState(site: Site): EditorState {
  return { site: clone(site), revision: 0, dirty: false, selected: { kind: "site" }, viewport: "mobile" };
}

export function applyWorkspaceCommand(
  state: EditorState,
  command: WorkspaceCommand,
  policy: WorkspaceMutationPolicy = {},
): EditorState {
  const next = clone(state.site);

  switch (command.type) {
    case "content.set": {
      const section = findSection(next, command.pageId, command.sectionId);
      setPath(section.props, command.propPath, command.value);
      break;
    }
    case "asset.set": {
      const section = findSection(next, command.pageId, command.sectionId);
      setPath(section.props, command.propPath, {
        assetId: command.asset.assetId,
        ...(command.asset.alt ? { alt: command.asset.alt } : {}),
        ...(command.asset.focalPoint ? { focalPoint: command.asset.focalPoint } : {}),
      });
      break;
    }
    case "theme.set":
      next.theme = command.theme;
      break;
    case "brand.patch":
      next.theme.brand = {
        ...next.theme.brand,
        ...command.patch,
        colors: { ...next.theme.brand.colors, ...(command.patch.colors ?? {}) },
        typography: { ...next.theme.brand.typography, ...(command.patch.typography ?? {}) },
      };
      break;
    case "section.component.set": {
      const page = findPage(next, command.pageId);
      const section = findSection(next, command.pageId, command.sectionId);
      assertAllowed(policy.canUseComponent?.({ site: next, page, section, componentId: command.componentId, version: command.version }), "Component swap is not allowed.");
      section.component = { componentId: command.componentId, version: command.version };
      break;
    }
    case "section.hidden.set":
      findSection(next, command.pageId, command.sectionId).hidden = command.hidden;
      break;
    case "section.reorder": {
      const page = findPage(next, command.pageId);
      const index = page.sections.findIndex((item) => item.id === command.sectionId);
      if (index < 0) throw new Error(`Unknown section ${command.sectionId}.`);
      const [section] = page.sections.splice(index, 1);
      const target = Math.max(0, Math.min(command.toIndex, page.sections.length));
      page.sections.splice(target, 0, section!);
      break;
    }
    case "section.remove": {
      const page = findPage(next, command.pageId);
      const section = findSection(next, command.pageId, command.sectionId);
      assertAllowed(policy.canRemoveSection?.(next, page, section), "Section removal is not allowed.");
      page.sections = page.sections.filter((item) => item.id !== command.sectionId);
      break;
    }
    case "page.add": {
      if (next.pages.some((page) => page.id === command.page.id || page.path === command.page.path)) throw new Error("Page id/path already exists.");
      next.pages.push(command.page);
      next.navigation.push({ label: command.navigationLabel ?? command.page.name, href: command.page.path });
      break;
    }
    case "page.remove": {
      if (next.pages.length <= 1) throw new Error("A site must keep at least one page.");
      const page = findPage(next, command.pageId);
      assertAllowed(policy.canRemovePage?.(next, page), "Page removal is not allowed.");
      next.pages = next.pages.filter((item) => item.id !== command.pageId);
      next.navigation = next.navigation.filter((item) => item.href !== page.path);
      break;
    }
    case "page.reorder": {
      const index = next.pages.findIndex((page) => page.id === command.pageId);
      if (index < 0) throw new Error(`Unknown page ${command.pageId}.`);
      const [page] = next.pages.splice(index, 1);
      const target = Math.max(0, Math.min(command.toIndex, next.pages.length));
      next.pages.splice(target, 0, page!);
      const order = new Map(next.pages.map((item, idx) => [item.path, idx]));
      next.navigation.sort((a, b) => (order.get(a.href) ?? 9999) - (order.get(b.href) ?? 9999));
      break;
    }
    case "page.path.set": {
      if (!command.path.startsWith("/")) throw new Error("Page paths must start with '/'.");
      if (next.pages.some((page) => page.id !== command.pageId && page.path === command.path)) throw new Error("Page path already exists.");
      const page = findPage(next, command.pageId);
      const previous = page.path;
      page.path = command.path;
      page.seo.canonicalPath = command.path;
      next.navigation = next.navigation.map((item) => item.href === previous ? { ...item, href: command.path } : item);
      break;
    }
    case "page.seo.patch": {
      const page = findPage(next, command.pageId);
      page.seo = { ...page.seo, ...command.patch, canonicalPath: page.path };
      break;
    }
    case "binding.set": {
      const page = findPage(next, command.pageId);
      const section = findSection(next, command.pageId, command.sectionId);
      assertAllowed(policy.canBindAction?.({ site: next, page, section, actionId: command.actionId }), "Function binding is not allowed.");
      section.bindings[command.bindingKey] = { actionId: command.actionId, inputMap: command.inputMap ?? {} };
      break;
    }
    case "binding.remove":
      delete findSection(next, command.pageId, command.sectionId).bindings[command.bindingKey];
      break;
    case "navigation.set":
      next.navigation = command.items;
      break;
  }

  const validated = siteSchema.parse(next);
  return {
    ...state,
    site: validated,
    revision: state.revision + 1,
    dirty: true,
    lastCommand: command.type,
  };
}

export function setEditorSelection(state: EditorState, selected: EditorSelection): EditorState {
  return { ...state, selected };
}

export function setEditorViewport(state: EditorState, viewport: EditorViewport): EditorState {
  return { ...state, viewport };
}

export function markEditorSaved(state: EditorState): EditorState {
  return { ...state, dirty: false };
}

function findPage(site: Site, pageId: string): SitePage {
  const page = site.pages.find((item) => item.id === pageId);
  if (!page) throw new Error(`Unknown page ${pageId}.`);
  return page;
}

function findSection(site: Site, pageId: string, sectionId: string): SiteSection {
  const page = findPage(site, pageId);
  const section = page.sections.find((item) => item.id === sectionId);
  if (!section) throw new Error(`Unknown section ${sectionId}.`);
  return section;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0 || parts.some((part) => ["__proto__", "prototype", "constructor"].includes(part))) throw new Error("Invalid editor prop path.");
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index]!;
    const current = cursor[key];
    if (!current || typeof current !== "object" || Array.isArray(current)) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
}

function assertAllowed(result: boolean | string | undefined, fallback: string): void {
  if (result === false) throw new Error(fallback);
  if (typeof result === "string") throw new Error(result);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
