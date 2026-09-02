import { expect, test } from "@playwright/test";
import fs from "node:fs";

const types = fs.readFileSync("apps/builder/app/ai-edit-types.ts", "utf8");
const plan = fs.readFileSync("apps/builder/app/ai-edit-plan.ts", "utf8");

test("AI edit response can carry a bounded multi-operation plan without breaking single-operation callers", () => {
  expect(types).toContain("export type AiEditorPlan");
  expect(types).toContain("operations: [AiEditorOperation, ...AiEditorOperation[]]");
  expect(types).toContain("operation: AiEditorOperation");
  expect(types).toContain("plan?: AiEditorPlan");
});

test("AI edit plans are capped at three operations and fall back to the legacy operation", () => {
  expect(plan).toContain("const MAX_PLAN_OPERATIONS = 3");
  expect(plan).toContain("operations.slice(0, MAX_PLAN_OPERATIONS)");
  expect(plan).toContain("return [fallback]");
});
