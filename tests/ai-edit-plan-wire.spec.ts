import { expect, test } from "@playwright/test";
import fs from "node:fs";

const route = fs.readFileSync("apps/builder/app/api/ai-edit/route.ts", "utf8");
const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("AI API accepts only bounded composable selected-section plans", () => {
  expect(route).toContain("value.operations.slice(0, 3)");
  expect(route).toContain('item.type !== "section.variant" && item.type !== "section.copy"');
  expect(route).toContain("collapseComposablePlan(operations)");
  expect(route).toContain("operation: planned.operation, plan: planned.plan");
});

test("multi-step plans stay backward compatible and apply through one existing operation", () => {
  expect(route).toContain("operation: planned.operation");
  expect(assistant).toContain("aiEditPlanOperations(proposal.plan, proposal.operation)");
  expect(assistant).toContain("onApply(proposal.operation)");
  expect(assistant).not.toContain("proposalOperations.forEach(onApply)");
});

test("assistant shows each plan step and one final visual preview before Apply", () => {
  expect(assistant).toContain("proposalOperations.map");
  expect(assistant).toContain("Proposal step ${index + 1} of ${proposalOperations.length}");
  expect(assistant).toContain("<AiEditVisualPreview");
  expect(assistant).toContain("Apply ${proposalOperations.length} changes");
});

test("stale proposal protection still guards the entire plan", () => {
  expect(assistant).toContain("proposalStale");
  expect(assistant).toContain("disabled={proposalStale}");
  expect(assistant).toContain("This proposal is out of date because the draft or selection changed.");
});
