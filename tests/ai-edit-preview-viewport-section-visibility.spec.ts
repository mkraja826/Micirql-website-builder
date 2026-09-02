import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("visibility proposals remain visible across responsive review", () => {
  expect(materializer).toContain('operation.type === "section.visibility"');
  expect(materializer).toContain("selected.hidden = operation.hidden");
});
