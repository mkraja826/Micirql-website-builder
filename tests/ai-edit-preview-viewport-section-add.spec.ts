import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("section add still requires design choice after responsive proposal review", () => {
  expect(assistant).toContain('proposal.operation.type === "section.add"');
  expect(assistant).toContain('"Choose design"');
  expect(assistant).toContain("setPendingSectionAdd(proposal.operation)");
});
