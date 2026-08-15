import type { AiTaskKind, ModelProfile } from "./model-routing";

export type AiUsageScope = {
  workspaceId: string;
  siteId?: string;
  buildId?: string;
};

export type AiUsageRecord = AiUsageScope & {
  id: string;
  task: AiTaskKind;
  profileId: string;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  images?: number;
  componentGenerations?: number;
  costMicrousd: number;
  createdAt: string;
};

export type AiUsageEstimate = {
  task: AiTaskKind;
  estimatedCostMicrousd: number;
};

export type AiBudget = AiUsageScope & {
  softLimitMicrousd?: number;
  hardLimitMicrousd?: number;
};

export type AiUsageSummary = {
  totalCostMicrousd: number;
  planningCostMicrousd: number;
  imageCostMicrousd: number;
  componentCostMicrousd: number;
  inputTokens: number;
  outputTokens: number;
  images: number;
  componentGenerations: number;
};

export type AiUsageStore = {
  append(record: AiUsageRecord): Promise<void>;
  list(scope: AiUsageScope): Promise<AiUsageRecord[]>;
};

export type AiBudgetDecision = {
  allowed: boolean;
  softLimitExceeded: boolean;
  projectedCostMicrousd: number;
  remainingHardBudgetMicrousd?: number;
  reason?: string;
};

export function summarizeUsage(records: readonly AiUsageRecord[]): AiUsageSummary {
  const summary: AiUsageSummary = {
    totalCostMicrousd: 0,
    planningCostMicrousd: 0,
    imageCostMicrousd: 0,
    componentCostMicrousd: 0,
    inputTokens: 0,
    outputTokens: 0,
    images: 0,
    componentGenerations: 0,
  };

  for (const record of records) {
    summary.totalCostMicrousd += record.costMicrousd;
    summary.inputTokens += record.inputTokens ?? 0;
    summary.outputTokens += record.outputTokens ?? 0;
    summary.images += record.images ?? 0;
    summary.componentGenerations += record.componentGenerations ?? 0;
    if (record.task === "plan-site") summary.planningCostMicrousd += record.costMicrousd;
    if (record.task === "generate-image") summary.imageCostMicrousd += record.costMicrousd;
    if (record.task === "build-component") summary.componentCostMicrousd += record.costMicrousd;
  }
  return summary;
}

export function evaluateBudget(args: {
  budget?: AiBudget;
  currentCostMicrousd: number;
  estimate: AiUsageEstimate;
}): AiBudgetDecision {
  const projected = args.currentCostMicrousd + args.estimate.estimatedCostMicrousd;
  const softExceeded = args.budget?.softLimitMicrousd !== undefined && projected > args.budget.softLimitMicrousd;
  const hard = args.budget?.hardLimitMicrousd;
  if (hard !== undefined && projected > hard) {
    return {
      allowed: false,
      softLimitExceeded: softExceeded,
      projectedCostMicrousd: projected,
      remainingHardBudgetMicrousd: Math.max(0, hard - args.currentCostMicrousd),
      reason: "AI hard budget would be exceeded.",
    };
  }
  return {
    allowed: true,
    softLimitExceeded: softExceeded,
    projectedCostMicrousd: projected,
    ...(hard !== undefined ? { remainingHardBudgetMicrousd: Math.max(0, hard - projected) } : {}),
  };
}

export type MeteredModelResult<T> = {
  output: T;
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    images?: number;
    componentGenerations?: number;
    costMicrousd: number;
  };
};

export function modelIdentity(profile: ModelProfile) {
  return { profileId: profile.id, provider: profile.provider, model: profile.model };
}
