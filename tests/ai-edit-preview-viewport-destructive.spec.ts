import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("responsive review keeps destructive AI edits explicitly destructive", () => {
  expect(assistant).toContain('proposal.operation.type === "section.remove" ? styles.destructive');
  expect(assistant).toContain('proposal.operation.type === "section.remove" ? "Remove section"');
});
