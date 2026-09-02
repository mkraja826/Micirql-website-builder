import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("device changes reuse the same materialized proposal operation", () => {
  expect(visual).toContain("proposedSiteForAiEdit(site, pageId, sectionId, operation)");
  expect(visual).toContain("[site, pageId, sectionId, operation]");
  expect(visual).not.toContain("[site, pageId, sectionId, operation, viewport]");
});
