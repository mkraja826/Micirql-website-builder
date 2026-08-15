import { assertTaskIsolation, defaultRoutingPolicy, routeModel, type AiTaskKind, type ModelProfile } from "./model-routing";
import type { ModelExecutorRegistry } from "./model-executor";
import {
  evaluateBudget,
  modelIdentity,
  summarizeUsage,
  type AiBudget,
  type AiUsageEstimate,
  type AiUsageRecord,
  type AiUsageScope,
  type AiUsageStore,
  type MeteredModelResult,
} from "./usage";

export type AiCostEstimator = {
  estimate(args: { task: AiTaskKind; profile: ModelProfile; input: unknown }): Promise<AiUsageEstimate>;
};

export async function executeMeteredTask<TInput, TOutput>(args: {
  task: AiTaskKind;
  input: TInput;
  scope: AiUsageScope;
  profiles: readonly ModelProfile[];
  executors: ModelExecutorRegistry;
  usageStore: AiUsageStore;
  estimator: AiCostEstimator;
  budget?: AiBudget;
  now?: () => Date;
  id?: () => string;
}): Promise<{ output: TOutput; model: ModelProfile; budgetWarning: boolean; usage: AiUsageRecord }> {
  const routed = routeModel(args.profiles, defaultRoutingPolicy(args.task));
  if (!routed) throw new Error(`No eligible model is available for ${args.task}.`);
  assertTaskIsolation(args.task, routed.profile);

  const executor = args.executors.get(routed.profile.id);
  if (!executor) throw new Error(`No executor is registered for model ${routed.profile.id}.`);

  const current = summarizeUsage(await args.usageStore.list(args.scope));
  const estimate = await args.estimator.estimate({ task: args.task, profile: routed.profile, input: args.input });
  const budget = evaluateBudget({
    ...(args.budget ? { budget: args.budget } : {}),
    currentCostMicrousd: current.totalCostMicrousd,
    estimate,
  });
  if (!budget.allowed) throw new Error(budget.reason ?? "AI budget exceeded.");

  const result = await executor.run(args.input) as MeteredModelResult<TOutput>;
  if (!result || typeof result !== "object" || !("usage" in result) || !("output" in result)) {
    throw new Error(`Executor ${routed.profile.id} must return a metered result.`);
  }
  if (!Number.isInteger(result.usage.costMicrousd) || result.usage.costMicrousd < 0) {
    throw new Error("Executor returned invalid AI cost usage.");
  }

  const identity = modelIdentity(routed.profile);
  const usage: AiUsageRecord = {
    id: args.id?.() ?? crypto.randomUUID(),
    ...args.scope,
    task: args.task,
    ...identity,
    ...(result.usage.inputTokens !== undefined ? { inputTokens: result.usage.inputTokens } : {}),
    ...(result.usage.outputTokens !== undefined ? { outputTokens: result.usage.outputTokens } : {}),
    ...(result.usage.images !== undefined ? { images: result.usage.images } : {}),
    ...(result.usage.componentGenerations !== undefined ? { componentGenerations: result.usage.componentGenerations } : {}),
    costMicrousd: result.usage.costMicrousd,
    createdAt: (args.now?.() ?? new Date()).toISOString(),
  };
  await args.usageStore.append(usage);

  return { output: result.output, model: routed.profile, budgetWarning: budget.softLimitExceeded, usage };
}
