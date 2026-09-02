import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal classes remain scoped to the visual preview module", () => {
  expect(visual).toContain('import styles from "./ai-edit-visual-preview.module.css"');
  expect(visual).toContain("styles.viewportPicker");
  expect(visual).toContain("styles.viewportActive");
});
