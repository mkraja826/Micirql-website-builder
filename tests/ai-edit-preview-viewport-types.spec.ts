import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("AI device preview reuses the workspace viewport type", () => {
  expect(assistant).toContain('import type { EditorViewport } from "@micirql/workspace"');
  expect(visual).toContain('import type { EditorViewport } from "@micirql/workspace"');
});
