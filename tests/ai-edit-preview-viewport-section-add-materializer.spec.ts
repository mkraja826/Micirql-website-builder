import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("new section proposals remain materialized before design confirmation", () => {
  expect(materializer).toContain('operation.type === "section.add"');
  expect(materializer).toContain("previewNewSection");
});
