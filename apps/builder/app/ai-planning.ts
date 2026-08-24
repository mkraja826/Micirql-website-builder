import { plannerModelFromEnvironment } from "@micirql/ai";
import type { FunctionalArchitecture } from "@micirql/schema";
import { deriveFunctionalArchitecture } from "./functional-architecture";

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
  brandColors: string[];
};

export type PlanningAdvice = {
  industry: string;
  subindustry: string | null;
  styleTags: string[];
  requiredCapabilities: string[];
  goals: string[];
  brandColors: string[];
  functionalArchitecture: FunctionalArchitecture;
  source: "ai" | "deterministic";
  warning?: string;
};

export async function adviseOnboardingPlan(input: OnboardingPlanningInput): Promise<PlanningAdvice> {
  const fallback = deterministic(input);
  let model;
  try {
    model = plannerModelFromEnvironment(process.env);
  } catch (error) {
    return { ...fallback, warning: message(error) };
  }
  if (!model) return fallback;

  try {
    const raw = await model.generate({
      system: [
        "You are MiCirql's website planning advisor. Return JSON only.",
        "Do not invent business facts, services, locations, credentials, prices, claims, or capabilities.",
        "You may normalize the industry/subindustry wording and prioritize the supplied goals, style tags, capabilities and brand colors.",
        "Every array item in your response MUST come from the corresponding supplied array.",
        "When brandColors are supplied, reorder only those supplied colors by suitability: primary first, accent second, supporting/secondary third. Do not invent new colors.",
        "Return exactly: industry, subindustry, styleTags, requiredCapabilities, goals, brandColors.",
        "Functional architecture is derived separately by MiCirql's deterministic planner and must never be weakened or removed by the model.",
      ].join("\n"),
      input,
      responseFormat: "json",
    });
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...fallback, warning: "AI planner returned an invalid planning object." };
    const record = raw as Record<string, unknown>;
    const normalized = {
      industry: safeText(record.industry, input.industry),
      subindustry: nullableText(record.subindustry, input.subindustry),
      styleTags: allowedArray(record.styleTags, input.styleTags),
      requiredCapabilities: allowedArray(record.requiredCapabilities, input.requiredCapabilities),
      goals: allowedArray(record.goals, input.goals),
      brandColors: allowedArray(record.brandColors, input.brandColors),
    };
    return {
      ...normalized,
      functionalArchitecture: deriveFunctionalArchitecture(toFunctionalProfile(input, normalized)),
      source: "ai",
    };
  } catch (error) {
    return { ...fallback, warning: message(error) };
  }
}

function deterministic(input: OnboardingPlanningInput): PlanningAdvice {
  const normalized = {
    industry: input.industry,
    subindustry: input.subindustry,
    styleTags: input.styleTags,
    requiredCapabilities: input.requiredCapabilities,
    goals: input.goals,
    brandColors: input.brandColors,
  };
  return {
    ...normalized,
    functionalArchitecture: deriveFunctionalArchitecture(toFunctionalProfile(input, normalized)),
    source: "deterministic",
  };
}

function toFunctionalProfile(
  input: OnboardingPlanningInput,
  normalized: Pick<PlanningAdvice, "industry" | "subindustry" | "styleTags" | "requiredCapabilities" | "goals">,
) {
  return {
    business_name: input.businessName,
    industry: normalized.industry,
    subindustry: normalized.subindustry,
    location: input.location,
    goals: normalized.goals,
    style_tags: normalized.styleTags,
    required_capabilities: normalized.requiredCapabilities,
    services: input.services,
    notes: input.notes,
  };
}

function allowedArray(value: unknown, allowed: string[]): string[] {
  if (!Array.isArray(value)) return allowed;
  const allowedSet = new Set(allowed.map((item) => item.toLowerCase()));
  const next = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item && allowedSet.has(item.toLowerCase()));
  return next.length ? [...new Set(next)] : allowed;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function nullableText(value: unknown, fallback: string | null): string | null {
  if (value === null) return fallback;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "AI planning advisor failed.";
}
