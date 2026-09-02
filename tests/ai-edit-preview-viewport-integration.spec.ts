import { expect, test } from "@playwright/test";
import fs from "node:fs";

const workspace = fs.readFileSync("apps/builder/app/workspace-client.tsx", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("editor viewport can flow into the AI proposal preview", () => {
  expect(workspace).toContain("state.viewport");
  expect(assistant).toContain("viewport?: EditorViewport");
  expect(assistant).toContain("viewport={viewport}");
});
