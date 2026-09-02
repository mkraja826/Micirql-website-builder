import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("selected proposal device drives both viewport shell and scaled frame", () => {
  expect(visual).toContain("styles[viewport]");
  expect(visual).toContain("styles[`frame${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`]");
});
