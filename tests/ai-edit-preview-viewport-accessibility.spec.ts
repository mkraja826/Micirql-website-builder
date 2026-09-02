import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal device selector exposes pressed state without making preview interactive", () => {
  expect(visual).toContain('role="group" aria-label="Proposal preview device"');
  expect(visual).toContain("aria-pressed={viewport === item.id}");
  expect(visual).toContain('aria-hidden="true"');
  expect(visual).toContain('node.setAttribute("inert", "")');
});
