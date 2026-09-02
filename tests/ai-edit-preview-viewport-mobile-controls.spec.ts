import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("device controls fill the narrow proposal card on mobile", () => {
  expect(styles).toContain(".viewportPicker{width:100%;display:grid;grid-template-columns:repeat(3,1fr)}");
});
