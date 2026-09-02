import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("V2-06 responsive review cannot mutate until the proposal action is chosen", () => {
  expect(visual).not.toContain("onApply");
  expect(visual).not.toContain("commit(");
  expect(assistant).toContain("onClick={apply}");
});
