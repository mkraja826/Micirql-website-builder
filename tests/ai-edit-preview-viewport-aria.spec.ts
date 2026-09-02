import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal card retains its visual preview landmark", () => {
  expect(visual).toContain('aria-label="Visual proposal preview"');
  expect(visual).toContain('aria-label="Proposal preview device"');
});
