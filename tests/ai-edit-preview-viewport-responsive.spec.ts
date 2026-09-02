import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("proposal viewport controls remain usable in the narrow editor panel", () => {
  expect(styles).toContain("grid-template-columns:repeat(3,1fr)");
  expect(styles).toContain(".mobile{max-width:250px");
  expect(styles).toContain("@media(max-width:520px)");
});
