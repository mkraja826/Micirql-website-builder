import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("active proposal device is both semantic and visually distinct", () => {
  expect(visual).toContain("aria-pressed={viewport === item.id}");
  expect(visual).toContain("styles.viewportActive");
  expect(styles).toContain(".viewportPicker .viewportActive");
});
