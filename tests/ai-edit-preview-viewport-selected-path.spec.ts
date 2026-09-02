import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("device switching keeps the proposed page path unchanged", () => {
  expect(visual).toContain("path={proposal.path}");
  expect(visual).not.toContain("setPath");
});
