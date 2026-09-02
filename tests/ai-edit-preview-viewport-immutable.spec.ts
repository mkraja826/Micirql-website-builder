import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive review continues to render an immutable proposal clone", () => {
  expect(materializer).toContain("const next = structuredClone(site)");
  expect(visual).toContain("proposedSiteForAiEdit(site, pageId, sectionId, operation)");
});
