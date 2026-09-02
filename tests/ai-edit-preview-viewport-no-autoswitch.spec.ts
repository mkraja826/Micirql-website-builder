import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("reviewing a proposal device does not change the main editor viewport", () => {
  expect(visual).not.toContain("setEditorViewport");
  expect(visual).not.toContain("window.dispatchEvent");
});
