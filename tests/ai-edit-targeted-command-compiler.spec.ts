import { expect, test } from "@playwright/test";
import fs from "node:fs";

const compiler = fs.readFileSync("apps/builder/app/ai-edit-targeted-commands.ts", "utf8");

test("targeted AI plans compile explicit same-page section edits into workspace commands", () => {
  expect(compiler).toContain("MAX_TARGETED_STEPS = 3");
  expect(compiler).toContain("step.target.pageId !== pageId");
  expect(compiler).toContain("!step.target.sectionId");
  expect(compiler).toContain('step.operation.type !== "section.variant" && step.operation.type !== "section.copy"');
  expect(compiler).toContain('type: "section.component.set"');
  expect(compiler).toContain('type: "content.set"');
});

test("compiler resolves sections from immutable targets rather than editor selection", () => {
  expect(compiler).toContain("page.sections.find((candidate) => candidate.id === sectionId)");
  expect(compiler).not.toContain("selectedSectionId");
  expect(compiler).not.toContain("activeSection");
});

test("compiler remains pure so the workspace can execute the whole command array atomically", () => {
  expect(compiler).toContain("commands: WorkspaceCommand[]");
  expect(compiler).not.toContain("executeEditorCommand");
  expect(compiler).not.toContain("executeEditorCommands");
  expect(compiler).not.toContain("setHistory");
});
