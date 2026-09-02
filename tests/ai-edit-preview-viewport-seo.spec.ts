import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("SEO proposals still report no canvas change instead of fake responsive previews", () => {
  expect(materializer).toContain("SEO metadata changes do not alter the page canvas.");
  expect(visual).toContain("No canvas change");
});
