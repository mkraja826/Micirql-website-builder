import { expect, test } from "@playwright/test";
import fs from "node:fs";

const workspace = fs.readFileSync("apps/builder/app/workspace-client.tsx", "utf8");

test("AI layout plus copy applies as one workspace history transaction", () => {
  expect(workspace).toContain("executeEditorCommands");
  expect(workspace).toContain("function commitMany(commands:WorkspaceCommand[])");
  const variantStart = workspace.indexOf('if(operation.type==="section.variant")');
  const copyStart = workspace.indexOf('if(operation.type==="section.copy")');
  expect(variantStart).toBeGreaterThan(-1);
  expect(copyStart).toBeGreaterThan(variantStart);
  expect(workspace.slice(variantStart, copyStart)).toContain("commitMany(commands)");
});

test("AI copy proposal batches heading and body into one undo step", () => {
  const copyStart = workspace.indexOf('if(operation.type==="section.copy")');
  expect(copyStart).toBeGreaterThan(-1);
  const copyBlock = workspace.slice(copyStart, workspace.indexOf("async function persist", copyStart));
  expect(copyBlock).toContain("const commands:WorkspaceCommand[]=[]");
  expect(copyBlock).toContain("operation.heading");
  expect(copyBlock).toContain("operation.body");
  expect(copyBlock).toContain("commitMany(commands)");
});

test("single-command AI operations stay on the existing commit path", () => {
  expect(workspace).toContain('operation.type==="section.visibility"){commit(');
  expect(workspace).toContain('operation.type==="section.remove"){commit(');
  expect(workspace).toContain('operation.type==="section.move"');
});
