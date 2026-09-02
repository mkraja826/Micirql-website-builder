import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive review retains clear proposal status above the device controls", () => {
  const heading = visual.indexOf("Proposed canvas");
  const controls = visual.indexOf("VIEWPORTS.map");
  expect(heading).toBeGreaterThan(-1);
  expect(heading).toBeLessThan(controls);
});
