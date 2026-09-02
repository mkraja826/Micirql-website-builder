import { expect, test } from "@playwright/test";
import { createEditorHistory, createEditorState, executeEditorCommands, undoEditor, redoEditor } from "@micirql/workspace";
import { SCHEMA_VERSION, type Site } from "@micirql/schema";

const site: Site = {
  schemaVersion: SCHEMA_VERSION,
  siteId: "atomic-test",
  workspaceId: "atomic-workspace",
  name: "Atomic test",
  domain: "atomic-test",
  theme: { family: "minimalist", modifiers: ["light"], brand: { colors: { primary: "#111111", secondary: "#222222", accent: "#333333", background: "#ffffff", surface: "#f5f5f5", textPrimary: "#111111", textSecondary: "#666666", border: "#dddddd", success: "#168a4a", warning: "#ad6a00", error: "#c93636" }, typography: { display: "Arial", body: "Arial", ui: "Arial" }, density: "comfortable", shape: "balanced", motion: "subtle" } },
  seoBlueprint: { primaryGoal: "Test", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: true, locationPages: false, blog: false },
  pages: [{ id: "home", path: "/", name: "Home", sections: [{ id: "hero", component: { componentId: "minimalist.hero-001", version: "1.0.0" }, props: { heading: "Before", body: "Old body" }, bindings: {}, hidden: false }], seo: { title: "Home", description: "Test", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
  navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
};

test("multiple commands create one undo step and redo restores the whole transaction", () => {
  const initial = createEditorHistory(createEditorState(site));
  const changed = executeEditorCommands(initial, [
    { type: "section.component.set", pageId: "home", sectionId: "hero", componentId: "minimalist.hero-003", version: "1.0.0" },
    { type: "content.set", pageId: "home", sectionId: "hero", propPath: "heading", value: "After" },
    { type: "content.set", pageId: "home", sectionId: "hero", propPath: "body", value: "New body" },
  ]);
  expect(changed.past).toHaveLength(1);
  expect(changed.present.site.pages[0]?.sections[0]?.props.heading).toBe("After");
  const undone = undoEditor(changed);
  expect(undone.present.site.pages[0]?.sections[0]?.component.componentId).toBe("minimalist.hero-001");
  expect(undone.present.site.pages[0]?.sections[0]?.props.heading).toBe("Before");
  const redone = redoEditor(undone);
  expect(redone.present.site.pages[0]?.sections[0]?.component.componentId).toBe("minimalist.hero-003");
  expect(redone.present.site.pages[0]?.sections[0]?.props.heading).toBe("After");
});
