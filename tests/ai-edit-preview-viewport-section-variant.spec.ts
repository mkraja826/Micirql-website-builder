import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("layout variant proposals remain materialized for responsive review", () => {
  expect(materializer).toContain('operation.type === "section.variant"');
  expect(materializer).toContain("sectionDesignId");
});
