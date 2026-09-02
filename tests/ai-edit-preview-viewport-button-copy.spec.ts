import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal device choices use plain user-facing labels", () => {
  expect(visual).toContain('label: "Desktop"');
  expect(visual).toContain('label: "Tablet"');
  expect(visual).toContain('label: "Mobile"');
});
