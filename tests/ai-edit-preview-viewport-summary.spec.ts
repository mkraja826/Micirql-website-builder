import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("V2-06 responsive proposal review keeps the safe proposal lifecycle", () => {
  expect(assistant).toContain("MiCirql proposes a safe structured edit first—you decide whether to apply it.");
  expect(visual).toContain("Desktop");
  expect(visual).toContain("Tablet");
  expect(visual).toContain("Mobile");
  expect(assistant).toContain("Apply change");
});
