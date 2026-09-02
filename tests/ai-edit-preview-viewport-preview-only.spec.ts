import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal review remains explicitly preview only", () => {
  expect(visual).toContain("Preview only · nothing has been applied");
  expect(visual).toContain('aria-hidden="true"');
});
