import type { AiEditorOperation, AiEditorPlan } from "./ai-edit-types";

const MAX_PLAN_OPERATIONS = 3;

export function aiEditPlanFromOperations(operations: AiEditorOperation[], rationale = "Structured MiCirql edit plan"): AiEditorPlan | null {
  const bounded = operations.slice(0, MAX_PLAN_OPERATIONS);
  if (!bounded.length) return null;
  return { operations: bounded as [AiEditorOperation, ...AiEditorOperation[]], rationale };
}

export function aiEditPlanOperations(plan: AiEditorPlan | undefined, fallback: AiEditorOperation): [AiEditorOperation, ...AiEditorOperation[]] {
  if (!plan?.operations.length) return [fallback];
  return plan.operations.slice(0, MAX_PLAN_OPERATIONS) as [AiEditorOperation, ...AiEditorOperation[]];
}
