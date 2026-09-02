import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("checking responsive proposal states never bypasses explicit user Apply", () => {
  expect(visual).toContain("setViewport(item.id)");
  expect(assistant).toContain("onClick={apply}");
  expect(assistant).toContain("onClick={() => setProposal(undefined)}");
});
