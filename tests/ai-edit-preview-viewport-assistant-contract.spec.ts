import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("Ask MiCirql accepts an optional active viewport without weakening Apply", () => {
  expect(assistant).toContain("viewport?: EditorViewport");
  expect(assistant).toContain("onApply(operation: AiEditorOperation): void");
  expect(assistant).toContain("onClick={apply}");
});
