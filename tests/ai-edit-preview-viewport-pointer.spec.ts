import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("rendered proposal remains non-interactive while device controls stay outside the frame", () => {
  expect(styles).toContain("pointer-events:none");
  expect(styles).toContain(".viewportPicker button");
});
