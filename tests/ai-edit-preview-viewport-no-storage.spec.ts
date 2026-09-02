import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal device choice is ephemeral and does not write browser storage", () => {
  expect(visual).not.toContain("localStorage");
  expect(visual).not.toContain("sessionStorage");
});
