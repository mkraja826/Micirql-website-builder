import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("device selector changes presentation state only", () => {
  expect(visual).toContain("const [viewport, setViewport]");
  expect(visual).not.toContain("setProposal");
  expect(visual).not.toContain("setSite");
});
