import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("device review continues to state that the proposal is unapplied", () => {
  expect(visual).toContain("Preview only · nothing has been applied");
});
