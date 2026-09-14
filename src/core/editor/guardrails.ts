import { EXPANDED_SECTION_CATALOG } from "../../sections/expansion";
import { SECTION_CATALOG } from "../../sections/catalog";
import { assertEditorDraftIdentity } from "./repository";
import type { EditorDraftSnapshot } from "./schema";

const SECTION_DEFINITIONS = [...SECTION_CATALOG, ...EXPANDED_SECTION_CATALOG];
const RESERVED_SHELL_TYPES = new Set(["navbar", "footer"]);

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function assertUnique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new Error(message);
}

function assertKnownSelectedSections(snapshot: EditorDraftSnapshot) {
  for (const [type, id] of Object.entries(snapshot.content.selectedSections)) {
    const definition = SECTION_DEFINITIONS.find((section) => section.id === id);
    if (!definition || definition.type !== type || definition.status === "retired") {
      throw new Error(`Editor draft references an unavailable section archetype: ${type}:${id}.`);
    }
  }
}

function assertPageStructure(snapshot: EditorDraftSnapshot) {
  if (!snapshot.content.pages.length) throw new Error("Editor draft must retain at least one page.");

  const slugs = snapshot.content.pages.map((page) => page.slug.trim());
  if (slugs.some((slug) => !slug)) throw new Error("Editor draft pages require non-empty slugs.");
  assertUnique(slugs, "Editor draft page slugs must be unique.");

  for (const page of snapshot.content.pages) {
    if (!page.title.trim()) throw new Error(`Editor draft page ${page.slug} requires a title.`);
    if (!page.sectionOrder.length) throw new Error(`Editor draft page ${page.slug} requires sections.`);
    assertUnique(page.sectionOrder, `Editor draft page ${page.slug} cannot repeat section types.`);
    assertUnique(page.contentSectionTypes, `Editor draft page ${page.slug} cannot repeat content section types.`);

    for (const sectionType of page.contentSectionTypes) {
      if (!page.sectionOrder.includes(sectionType)) {
        throw new Error(`Editor draft page ${page.slug} contains content outside its section order.`);
      }
    }

    for (const sectionType of page.sectionOrder) {
      if (!RESERVED_SHELL_TYPES.has(sectionType) && !page.contentSectionTypes.includes(sectionType)) {
        throw new Error(`Editor draft page ${page.slug} is missing content for section type ${sectionType}.`);
      }
      if (!snapshot.content.selectedSections[sectionType]) {
        throw new Error(`Editor draft page ${page.slug} is missing a selected section for ${sectionType}.`);
      }
    }
  }
}

function assertWarningsPreserved(previous: EditorDraftSnapshot, next: EditorDraftSnapshot) {
  const nextWarnings = new Set(next.content.warnings);
  for (const warning of previous.content.warnings) {
    if (!nextWarnings.has(warning)) {
      throw new Error("Editor mutations cannot remove system quality or configuration warnings.");
    }
  }
}

export function assertEditorMutationAllowed(previous: EditorDraftSnapshot, next: EditorDraftSnapshot): void {
  assertEditorDraftIdentity(previous, { workspaceId: previous.workspaceId, dbSiteId: previous.dbSiteId });
  assertEditorDraftIdentity(next, { workspaceId: previous.workspaceId, dbSiteId: previous.dbSiteId });

  if (!sameJson(previous.baseline, next.baseline)) {
    throw new Error("Editor mutations cannot replace certified baseline provenance.");
  }

  // Capability activation is owned by the verified backend-capability pipeline, not the visual editor.
  if (!sameJson(previous.content.primaryCapability, next.content.primaryCapability)
    || !sameJson(previous.content.capabilities, next.content.capabilities)) {
    throw new Error("Editor mutations cannot change or activate functional capabilities.");
  }

  assertWarningsPreserved(previous, next);
  assertKnownSelectedSections(next);
  assertPageStructure(next);
}
