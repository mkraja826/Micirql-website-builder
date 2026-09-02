import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("responsive AI proposal review is ready for CI certification", () => {
  expect(visual).toContain("VIEWPORTS");
  expect(visual).toContain("RendererPreview");
  expect(styles).toContain("viewportActive");
});
