import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "apps/builder/app/renderer-preview.tsx"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "apps/builder/app/workspace-client.tsx"), "utf8");
const keyboard = readFileSync(resolve(process.cwd(), "apps/builder/app/keyboard-section-actions.tsx"), "utf8");
const multiSelect = readFileSync(resolve(process.cwd(), "apps/builder/app/canvas-multi-select.tsx"), "utf8");
const batchActions = readFileSync(resolve(process.cwd(), "apps/builder/app/batch-section-actions.tsx"), "utf8");
const canvasCss = readFileSync(resolve(process.cwd(), "apps/builder/app/canvas-controls.css"), "utf8");

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

test("canvas batch selection stays separate from single-section editor selection", () => {
  expect(multiSelect).toContain('const additive = event.metaKey || event.ctrlKey');
  expect(multiSelect).toContain('if (!additive) {');
  expect(multiSelect).toContain('clearAndEmit();');
  expect(multiSelect).toContain('if (section.dataset.miGlobalSection === "true") return');
  expect(multiSelect).toContain('if (target.closest("[data-mi-canvas-action]")) return');
  expect(multiSelect).toContain('event.stopPropagation();');
  expect(multiSelect).toContain('section.setAttribute(SELECTED_ATTR, "true")');
  expect(multiSelect).toContain('new CustomEvent("micirql:batch-selection-change"');
});

test("multi-select discovery stays passive and desktop-only", () => {
  expect(multiSelect).toContain('window.matchMedia("(hover: hover) and (pointer: fine)")');
  expect(multiSelect).toContain('if (!showHint || batchCount > 0) return null;');
  expect(multiSelect).toContain('data-mi-canvas-action="multiselect-hint"');
  expect(multiSelect).toContain('Ctrl/Cmd-click sections');
  expect(canvasCss).toContain('.mi-editor-multiselect-hint{');
  expect(canvasCss).toContain('pointer-events:none');
  expect(canvasCss).toContain('.mi-editor-multiselect-hint{display:none}');
});

test("batch feedback clearly identifies selected sections and announces the count", () => {
  expect(batchActions).toContain('const selectionLabel = sectionIds.length === 1 ? "1 section selected" : `${sectionIds.length} sections selected`;');
  expect(batchActions).toContain('className="mi-editor-batch-status"');
  expect(batchActions).toContain('role="status"');
  expect(batchActions).toContain('aria-live="polite"');
  expect(canvasCss).toContain('.mi-editor-section[data-mi-batch-selected="true"]{');
  expect(canvasCss).toContain('.mi-editor-section[data-mi-batch-selected="true"]::before{content:"Selected"');
  expect(canvasCss).toContain('.mi-editor-batch-status{');
});

test("batch visibility reuses certified section visibility controls safely", () => {
  expect(multiSelect).toContain('document.documentElement.dataset.miBatchAction === "true"');
  expect(batchActions).toContain('section.dataset.miGlobalSection !== "true"');
  expect(batchActions).toContain('section.classList.contains("mi-editor-hidden")');
  expect(batchActions).toContain('section.click();');
  expect(batchActions).toContain("'[data-mi-canvas-action=\"visibility\"]'");
  expect(batchActions).toContain('visibility.click();');
  expect(batchActions).toContain('Hide all');
  expect(batchActions).toContain('Show all');
  expect(batchActions).toContain('micirql:batch-selection-change');
});

test("batch duplication reuses certified duplicate controls and keeps the original batch stable", () => {
  expect(batchActions).toContain('async function duplicateBatchSelection()');
  expect(batchActions).toContain('section.dataset.miGlobalSection === "true"');
  expect(batchActions).toContain("'[data-mi-canvas-action=\"duplicate\"]'");
  expect(batchActions).toContain('duplicate.click();');
  expect(batchActions).toContain('restoreBatchSelection(ids);');
  expect(batchActions).toContain('Duplicate</button>');
  expect(batchActions).not.toContain('section.add');
});

test("batch movement preserves relative order and reuses certified move controls", () => {
  expect(batchActions).toContain('async function moveBatchSelection(direction: "up" | "down")');
  expect(batchActions).toContain('const orderedIds = direction === "up" ? ids : [...ids].reverse();');
  expect(batchActions).toContain('section.dataset.miGlobalSection === "true"');
  expect(batchActions).toContain('`[data-mi-canvas-action="move-${direction}"]`');
  expect(batchActions).toContain('if (action && !action.disabled) action.click();');
  expect(batchActions).toContain('restoreBatchSelection(ids);');
  expect(batchActions).toContain('Move up</button>');
  expect(batchActions).toContain('Move down</button>');
  expect(batchActions).not.toContain('section.reorder');
});

test("batch removal confirms once and reuses the certified remove control", () => {
  expect(batchActions).toContain('async function removeBatchSelection()');
  expect(batchActions).toContain('window.confirm(`Remove ${label}? You can undo these changes.`)');
  expect(batchActions).toContain('section.dataset.miGlobalSection === "true"');
  expect(batchActions).toContain("'[data-mi-canvas-action=\"remove\"]'");
  expect(batchActions).toContain('const originalConfirm = window.confirm;');
  expect(batchActions).toContain('window.confirm = () => true;');
  expect(batchActions).toContain('remove.click();');
  expect(batchActions).toContain('window.confirm = originalConfirm;');
  expect(batchActions).toContain('detail: { sectionIds: [] }');
  expect(batchActions).toContain('className="is-danger"');
  expect(batchActions).not.toContain('type:"section.remove"');
});
