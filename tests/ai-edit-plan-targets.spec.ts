import { expect, test } from "@playwright/test";
import fs from "node:fs";

const types = fs.readFileSync("apps/builder/app/ai-edit-types.ts", "utf8");
const plan = fs.readFileSync("apps/builder/app/ai-edit-plan.ts", "utf8");

test("AI plans can carry explicit immutable page and section targets", () => {
  expect(types).toContain("export type AiEditorTarget");
  expect(types).toContain("pageId: string");
  expect(types).toContain("sectionId?: string");
  expect(types).toContain("export type AiEditorPlanStep");
  expect(types).toContain("target: AiEditorTarget");
});

test("targeted plans stay bounded to three operations", () => {
  expect(plan).toContain("const MAX_PLAN_OPERATIONS = 3");
  expect(plan).toContain("operations.slice(0, MAX_PLAN_OPERATIONS)");
  expect(plan).toContain("plan.steps.slice(0, MAX_PLAN_OPERATIONS)");
});

test("legacy operation-only plans can be upgraded to explicit targets", () => {
  expect(plan).toContain("export function aiEditPlanSteps");
  expect(plan).toContain("aiEditPlanOperations(plan, fallback).map((operation) => ({ operation, target }))");
});

test("targeted plans retain legacy operations for backward compatibility", () => {
  expect(plan).toContain("return { operations: bounded as [AiEditorOperation, ...AiEditorOperation[]], steps, rationale }");
  expect(types).toContain("operations: [AiEditorOperation, ...AiEditorOperation[]]");
});
