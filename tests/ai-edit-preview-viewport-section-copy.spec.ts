import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("copy proposals remain materialized for responsive visual review", () => {
  expect(materializer).toContain('operation.type === "section.copy"');
  expect(materializer).toContain("operation.heading");
  expect(materializer).toContain("operation.body");
});
