import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("responsive proposal canvas still hides editor-only chrome", () => {
  expect(styles).toContain(":global(.mi-editor-canvas-toolbar)");
  expect(styles).toContain(":global(.mi-editor-insert-zone)");
  expect(styles).toContain(":global([data-mi-canvas-action])");
  expect(styles).toContain("display:none!important");
});
