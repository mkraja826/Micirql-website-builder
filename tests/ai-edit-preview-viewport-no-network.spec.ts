import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("switching proposal devices requires no network request", () => {
  expect(visual).not.toContain("fetch(");
  expect(visual).not.toContain("XMLHttpRequest");
});
