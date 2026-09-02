import { expect, test } from "@playwright/test";
import fs from "node:fs";

const workspace = fs.readFileSync("apps/builder/app/workspace-client.tsx", "utf8");

test("workspace AI assistant receives the active editor viewport", () => {
  expect(workspace).toContain("<AiEditorAssistant");
  expect(workspace).toContain("state.viewport");
});
