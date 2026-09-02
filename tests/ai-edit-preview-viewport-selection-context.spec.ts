import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("responsive proposal review retains selected section context", () => {
  expect(assistant).toContain("selectedContext");
  expect(assistant).toContain("sectionId");
  expect(assistant).toContain("<AiEditVisualPreview");
});
