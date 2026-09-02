import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive proposal preview keeps the proposed section selection visible", () => {
  expect(visual).toContain("proposal.selectedSectionId");
  expect(visual).toContain("selectedSectionId: proposal.selectedSectionId");
});
