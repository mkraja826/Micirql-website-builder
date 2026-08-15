import { sitePlanSchema, type SitePlan } from "@micirql/schema";
import type { DiscoveryAnswer } from "@micirql/domains";
import { evaluatePlanningPolicy } from "@micirql/domains";

export type PlannerModelRequest = {
  system: string;
  input: unknown;
  responseFormat: "json";
};

export type PlannerModel = {
  id: string;
  generate(request: PlannerModelRequest): Promise<unknown>;
};

export type PlannerAdapterInput = {
  model: PlannerModel;
  domain: SitePlan["business"]["domain"];
  subtype?: string;
  discoveryAnswers: DiscoveryAnswer[];
  plannerInput: unknown;
  maxRepairAttempts?: number;
};

export type PlannerAdapterResult =
  | { ok: true; plan: SitePlan; modelId: string; repairs: number }
  | { ok: false; code: "DISCOVERY_INCOMPLETE" | "INVALID_MODEL_OUTPUT"; issues: string[]; modelId: string; repairs: number };

export async function runPlannerAdapter(input: PlannerAdapterInput): Promise<PlannerAdapterResult> {
  const policy = evaluatePlanningPolicy(input.domain, input.discoveryAnswers, input.subtype);
  if (!policy.canPlan) {
    return {
      ok: false,
      code: "DISCOVERY_INCOMPLETE",
      issues: policy.mustAskMore,
      modelId: input.model.id,
      repairs: 0,
    };
  }

  const maxRepairs = Math.max(0, Math.min(input.maxRepairAttempts ?? 2, 3));
  let repairs = 0;
  let raw = await input.model.generate({
    system: buildPlannerSystemPrompt(policy),
    input: input.plannerInput,
    responseFormat: "json",
  });

  while (true) {
    const parsed = sitePlanSchema.safeParse(normalizeJson(raw));
    if (parsed.success) {
      const semanticIssues = validatePlanAgainstPolicy(parsed.data, policy);
      if (semanticIssues.length === 0) {
        return { ok: true, plan: parsed.data, modelId: input.model.id, repairs };
      }
      if (repairs >= maxRepairs) {
        return { ok: false, code: "INVALID_MODEL_OUTPUT", issues: semanticIssues, modelId: input.model.id, repairs };
      }
      repairs += 1;
      raw = await repair(input.model, raw, semanticIssues, policy);
      continue;
    }

    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
    if (repairs >= maxRepairs) {
      return { ok: false, code: "INVALID_MODEL_OUTPUT", issues, modelId: input.model.id, repairs };
    }
    repairs += 1;
    raw = await repair(input.model, raw, issues, policy);
  }
}

function buildPlannerSystemPrompt(policy: ReturnType<typeof evaluatePlanningPolicy>): string {
  return [
    "You are the MiCirql site planner. Return JSON only.",
    "Do not generate code, HTML, CSS, React, SQL, API handlers, or provider configuration.",
    "Produce only a SitePlan that can be validated by MiCirql schemas.",
    "Preserve required domain pages and actions.",
    `Allowed optional pages: ${policy.allowedOptionalPages.join(", ") || "none"}.`,
    `Allowed optional actions: ${policy.allowedOptionalActions.join(", ") || "none"}.`,
    `Never invent: ${policy.forbiddenInventions.join("; ")}.`,
    "Use only facts provided in the structured planning input. Missing facts must not be fabricated.",
    "Theme and section-family decisions should describe intent; component IDs are chosen later by the deterministic Registry ranker.",
  ].join("\n");
}

async function repair(
  model: PlannerModel,
  previous: unknown,
  issues: string[],
  policy: ReturnType<typeof evaluatePlanningPolicy>,
): Promise<unknown> {
  return model.generate({
    system: [
      buildPlannerSystemPrompt(policy),
      "Repair the previous JSON. Change only what is required to satisfy the listed validation issues.",
    ].join("\n"),
    input: { previous, validationIssues: issues },
    responseFormat: "json",
  });
}

function validatePlanAgainstPolicy(plan: SitePlan, policy: ReturnType<typeof evaluatePlanningPolicy>): string[] {
  const issues: string[] = [];
  const optionalActions = new Set(policy.allowedOptionalActions);
  for (const page of plan.pages) {
    for (const action of page.requiredFunctions) {
      if (plan.business.requiredFunctions.includes(action)) continue;
      if (!optionalActions.has(action)) issues.push(`Action ${action} is not allowed by planning policy.`);
    }
  }
  return [...new Set(issues)];
}

function normalizeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
