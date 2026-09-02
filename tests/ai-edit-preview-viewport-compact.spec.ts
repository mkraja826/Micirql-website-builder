import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("device preview remains a compact proposal card rather than a second editor", () => {
  expect(styles).toContain(".viewport{height:260px");
  expect(styles).toContain(".frame{min-height:720px;transform-origin:top left;pointer-events:none;user-select:none}");
  expect(styles).toContain("overflow:hidden");
});
