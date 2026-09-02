import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("V2-06 increment 3 provides compact responsive visual review", () => {
  expect(visual).toContain("VIEWPORTS.map");
  expect(visual).toContain("viewport={viewport}");
  expect(styles).toContain(".viewportPicker");
  expect(styles).toContain(".frameMobile");
});
