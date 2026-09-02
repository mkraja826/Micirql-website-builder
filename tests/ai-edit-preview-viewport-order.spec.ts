import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal device order follows desktop tablet mobile review flow", () => {
  const desktop = visual.indexOf('id: "desktop"');
  const tablet = visual.indexOf('id: "tablet"');
  const mobile = visual.indexOf('id: "mobile"');
  expect(desktop).toBeLessThan(tablet);
  expect(tablet).toBeLessThan(mobile);
});
