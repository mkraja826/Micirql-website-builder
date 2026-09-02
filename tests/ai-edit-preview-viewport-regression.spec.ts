import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("responsive review does not remove structured before-after preview", () => {
  expect(assistant).toContain("<AiEditPreview operation={proposal.operation} target={selectedContext} />");
  expect(assistant).toContain("<AiEditVisualPreview");
});
