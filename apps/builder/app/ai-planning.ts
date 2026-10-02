export type OnboardingPlanningInput = {
  businessName: string;
  industry: string;
  subindustry: string | null;
  location: string | null;
  services: string[];
  goals: string[];
  styleTags: string[];
  requiredCapabilities: string[];
  languages: string[];
  notes: string | null;
};

export type PlanningAdvice = {
  industry: string;
  subindustry: string | null;
  styleTags: string[];
  requiredCapabilities: string[];
  goals: string[];
  source: "ai" | "deterministic";
  warning?: string;
};

/**
 * Keep the Cloudflare Worker free of direct model calls.
 *
 * The authenticated Supabase plan-site function is the single planning
 * gateway. This normalization step only preserves user input and avoids a
 * duplicate model request that can exhaust Worker compute resources.
 */
export async function adviseOnboardingPlan(input: OnboardingPlanningInput): Promise<PlanningAdvice> {
  return {
    ...deterministic(input),
    warning: "Planning normalization is delegated to the centralized AI gateway.",
  };
}

function deterministic(input: OnboardingPlanningInput): PlanningAdvice {
  return {
    industry: input.industry,
    subindustry: input.subindustry,
    styleTags: input.styleTags,
    requiredCapabilities: input.requiredCapabilities,
    goals: input.goals,
    source: "deterministic",
  };
}
