import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "apps/builder/app/renderer-preview.tsx"), "utf8");

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
  expect(source).toContain("draggable={Boolean(onReorderSection && !globalShell)}");
});

test("action menu dismisses safely on escape, outside pointer, resize and scroll", () => {
  expect(source).toContain('if (event.key === "Escape") setContextMenu(undefined)');
  expect(source).toContain('window.addEventListener("pointerdown", dismiss)');
  expect(source).toContain('window.addEventListener("resize", dismissOnViewportChange)');
  expect(source).toContain('window.addEventListener("scroll", dismissOnViewportChange, true)');
});