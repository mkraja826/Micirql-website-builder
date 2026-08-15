export type AiTaskKind = "plan-site" | "generate-content" | "generate-image" | "build-component";

export type ModelCapability = "structured-planning" | "content-generation" | "image-generation" | "component-codegen";

export type ModelProfile = {
  id: string;
  provider: string;
  model: string;
  capabilities: ModelCapability[];
  enabled: boolean;
  qualityScore: number;
  latencyClass: "low" | "medium" | "high";
  costClass: "low" | "medium" | "high";
  maxInputTokens?: number;
  maxOutputTokens?: number;
};

export type RoutingPolicy = {
  task: AiTaskKind;
  requiredCapability: ModelCapability;
  minimumQualityScore: number;
  preferredLatency?: "low" | "medium" | "high";
  maximumCostClass?: "low" | "medium" | "high";
};

export type RoutedModel = {
  profile: ModelProfile;
  score: number;
  reasons: string[];
};

const costRank = { low: 0, medium: 1, high: 2 } as const;
const latencyRank = { low: 0, medium: 1, high: 2 } as const;

export function routeModel(profiles: readonly ModelProfile[], policy: RoutingPolicy): RoutedModel | undefined {
  const candidates = profiles
    .filter((profile) => profile.enabled)
    .filter((profile) => profile.capabilities.includes(policy.requiredCapability))
    .filter((profile) => profile.qualityScore >= policy.minimumQualityScore)
    .filter((profile) => policy.maximumCostClass === undefined || costRank[profile.costClass] <= costRank[policy.maximumCostClass])
    .map((profile) => {
      let score = profile.qualityScore;
      const reasons = [`quality ${profile.qualityScore}`];

      if (policy.preferredLatency !== undefined) {
        const delta = Math.abs(latencyRank[profile.latencyClass] - latencyRank[policy.preferredLatency]);
        score -= delta * 4;
        reasons.push(`latency ${profile.latencyClass}`);
      }

      score -= costRank[profile.costClass] * 3;
      reasons.push(`cost ${profile.costClass}`);

      return { profile, score: Math.round(score * 100) / 100, reasons };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0];
}

export function defaultRoutingPolicy(task: AiTaskKind): RoutingPolicy {
  switch (task) {
    case "plan-site":
      return {
        task,
        requiredCapability: "structured-planning",
        minimumQualityScore: 85,
        preferredLatency: "low",
        maximumCostClass: "medium",
      };
    case "generate-content":
      return {
        task,
        requiredCapability: "content-generation",
        minimumQualityScore: 88,
        preferredLatency: "low",
        maximumCostClass: "medium",
      };
    case "generate-image":
      return {
        task,
        requiredCapability: "image-generation",
        minimumQualityScore: 85,
        preferredLatency: "medium",
        maximumCostClass: "high",
      };
    case "build-component":
      return {
        task,
        requiredCapability: "component-codegen",
        minimumQualityScore: 92,
        preferredLatency: "medium",
        maximumCostClass: "high",
      };
  }
}

export function assertTaskIsolation(task: AiTaskKind, profile: ModelProfile): void {
  const required = defaultRoutingPolicy(task).requiredCapability;
  if (!profile.capabilities.includes(required)) {
    throw new Error(`Model ${profile.id} is not authorized for ${task}.`);
  }
}
