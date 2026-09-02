import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("safe fallback proposals receive the same responsive review path", () => {
  expect(assistant).toContain('proposal.source === "ai" ? "MiCirql proposal" : "Safe fallback"');
  expect(assistant).toContain("<AiEditVisualPreview");
});
