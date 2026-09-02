import { expect, test } from "@playwright/test";
import fs from "node:fs";

const workspace = fs.readFileSync("apps/builder/app/workspace-client.tsx", "utf8");

test("workspace passes its active viewport into Ask MiCirql", () => {
  const assistantStart = workspace.indexOf("<AiEditorAssistant");
  expect(assistantStart).toBeGreaterThan(-1);
  const assistantEnd = workspace.indexOf("/>", assistantStart);
  expect(assistantEnd).toBeGreaterThan(assistantStart);
  expect(workspace.slice(assistantStart, assistantEnd)).toContain("viewport={state.viewport}");
});
