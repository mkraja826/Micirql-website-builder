import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");
const workspace = fs.readFileSync("apps/builder/app/workspace-client.tsx", "utf8");

test("Ask MiCirql routes multi-step plans through the targeted plan callback", () => {
  expect(assistant).toContain("onApplyPlan?(steps: AiEditorPlanStep[]): boolean");
  expect(assistant).toContain("aiEditPlanSteps(proposal.plan, proposal.operation, target)");
  expect(assistant).toContain("if (onApplyPlan(steps))");
});

test("workspace compiles targeted plans and commits them as one transaction", () => {
  expect(workspace).toContain('import { targetedAiPlanCommands } from "./ai-edit-targeted-commands"');
  expect(workspace).toContain("const plan=targetedAiPlanCommands(state.site,steps)");
  expect(workspace).toContain("commitMany(plan.commands)");
  expect(workspace).toContain("onApplyPlan={applyAiPlan}");
});

test("invalid targeted plans fail closed and single-operation Apply remains available", () => {
  expect(workspace).toContain("This MiCirql plan could not be applied safely. Recreate the proposal and try again.");
  expect(assistant).toContain("onApply(proposal.operation); discardProposal(); setPrompt(\"\")");
});
