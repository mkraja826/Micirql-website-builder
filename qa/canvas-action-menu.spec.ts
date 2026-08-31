import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "apps/builder/app/renderer-preview.tsx"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "apps/builder/app/workspace-client.tsx"), "utf8");
const keyboard = readFileSync(resolve(process.cwd(), "apps/builder/app/keyboard-section-actions.tsx"), "utf8");

test("direct canvas action menu keeps mouse and keyboard entry points", () => {
  expect(source).toContain('onContextMenu={(event) => {');
  expect(source).toContain('event.key === "ContextMenu"');
  expect(source).toContain('event.shiftKey && event.key === "F10"');
  expect(source).toContain('data-mi-canvas-action="context-menu"');
  expect(source).toContain('role="menu"');
  expect(source).toContain('role="menuitem"');
});

test("direct canvas action menu reuses existing safe editor callbacks", () => {
  expect(source).toContain("onRequestDesignChange(contextMenu.sectionId)");
  expect(source).toContain("onRequestCopyEdit(contextMenu.sectionId)");
  expect(source).toContain('onRequestImageChange(contextMenu.sectionId, "image")');
  expect(source).toContain('onRequestMove(contextMenu.sectionId, "up")');
  expect(source).toContain('onRequestMove(contextMenu.sectionId, "down")');
  expect(source).toContain("onRequestVisibility(contextMenu.sectionId, !contextMenu.hidden)");
});

test("global shell sections remain protected from local structural actions", () => {
  expect(source).toContain('const globalShell = seed.family === "navbar" || seed.family === "footer"');
  expect(source).toContain("onRequestImageChange && !contextMenu.globalShell");
  expect(source).toContain("onRequestMove && !contextMenu.globalShell");
  expect(source).toContain("onRequestVisibility && !contextMenu.globalShell");
  expect(source).toContain("onRequestDuplicate && !contextMenu.globalShell");
  expect(source).toContain("onRequestRemove && !contextMenu.globalShell");
  expect(source).toContain("draggable={Boolean(onReorderSection && !globalShell)}");
});

test("action menu dismisses safely on escape, outside pointer, resize and scroll", () => {
  expect(source).toContain('if (event.key === "Escape") setContextMenu(undefined)');
  expect(source).toContain('window.addEventListener("pointerdown", dismiss)');
  expect(source).toContain('window.addEventListener("resize", dismissOnViewportChange)');
  expect(source).toContain('window.addEventListener("scroll", dismissOnViewportChange, true)');
});

test("canvas removal is confirmed, undoable and routed through section.remove", () => {
  expect(source).toContain('data-mi-canvas-action="remove"');
  expect(source).toContain("onRequestRemove(contextMenu.sectionId)");
  expect(workspace).toContain('window.confirm("Remove this section? You can undo this change.")');
  expect(workspace).toContain('commit({type:"section.remove",pageId:activePage.id,sectionId})');
  expect(workspace).toContain('selectPage(activePage.id);setMode("content")');
});

test("canvas duplication uses a fresh id and the existing section.add history path", () => {
  expect(source).toContain('data-mi-canvas-action="duplicate"');
  expect(source).toContain("onRequestDuplicate(contextMenu.sectionId)");
  expect(workspace).toContain('if(family==="navbar"||family==="footer")return');
  expect(workspace).toContain('const duplicate:SiteSection={...structuredClone(source),id:`${family??"section"}-${crypto.randomUUID().slice(0,8)}`}');
  expect(workspace).toContain('commit({type:"section.add",pageId:activePage.id,section:duplicate,toIndex:index+1})');
  expect(workspace).toContain('selectSection(activePage.id,duplicate.id);setMode("content")');
});

test("focused section keyboard shortcuts reuse certified structural actions safely", () => {
  expect(keyboard).toContain('target.closest<HTMLElement>("[data-mi-section-id]")');
  expect(keyboard).toContain('if (!section || target !== section) return');
  expect(keyboard).toContain('if (section.dataset.miGlobalSection === "true") return');
  expect(keyboard).toContain('(event.metaKey || event.ctrlKey)');
  expect(keyboard).toContain('event.key.toLowerCase() === "d"');
  expect(keyboard).toContain('event.key === "Delete" || event.key === "Backspace"');
  expect(keyboard).toContain('event.altKey && !event.shiftKey && event.key === "ArrowUp"');
  expect(keyboard).toContain('event.altKey && !event.shiftKey && event.key === "ArrowDown"');
  expect(keyboard).toContain('const actionName = duplicate ? "duplicate" : remove ? "remove" : moveUp ? "move-up" : "move-down"');
  expect(keyboard).toContain('action.click()');
});
