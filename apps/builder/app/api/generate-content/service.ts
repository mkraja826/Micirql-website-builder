import type { NextRequest } from "next/server";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  createOpenAiCompatibleJsonPlannerModel,
  generateGuardedSiteContent,
  textProviderConfigFromEnvironment,
  type ModelProfile,
  type TextProviderUsage,
} from "@micirql/ai";
import type { GroundingFacts } from "@micirql/design-engine";
import { getSupabaseDraft, saveSupabaseDraft, supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

export type GuardedContentGenerationRequest = {
  workspaceId: string;
  siteId: string;
  expectedRevision: number;
  facts?: Partial<GroundingFacts>;
};

export async function runGuardedContentGeneration(request: NextRequest, input: GuardedContentGenerationRequest) {
  const current = await getSupabaseDraft(request, input.workspaceId, input.siteId);
  if (!current) {
    const error = new Error("DRAFT_NOT_FOUND") as Error & { status?: number };
    error.status = 404;
    throw error;
  }
  if (current.revision !== input.expectedRevision) {
    const error = new Error("REVISION_CONFLICT") as Error & { status?: number; currentRevision?: number };
    error.status = 409;
    error.currentRevision = current.revision;
    throw error;
  }

  const providerConfig = textProviderConfigFromEnvironment(process.env);
  if (!providerConfig) {
    const error = new Error("TEXT_MODEL_NOT_CONFIGURED") as Error & { status?: number };
    error.status = 503;
    throw error;
  }

  const provider = providerName(providerConfig.endpoint);
  let recordedUsage: { inputTokens: number; outputTokens: number; costMicrousd: number } | undefined;
  const model = createOpenAiCompatibleJsonPlannerModel({
    ...providerConfig,
    onUsage: async (usage) => {
      recordedUsage = await recordContentUsage(request, {
        workspaceId: input.workspaceId,
        siteId: input.siteId,
        profileId: providerConfig.id,
        provider,
        model: providerConfig.model,
        usage,
      });
    },
  });

  const profile: ModelProfile = {
    id: providerConfig.id,
    provider,
    model: providerConfig.model,
    capabilities: ["content-generation"],
    enabled: true,
    qualityScore: 90,
    latencyClass: "low",
    costClass: "medium",
    ...(providerConfig.maxOutputTokens ? { maxOutputTokens: providerConfig.maxOutputTokens } : {}),
  };

  const facts = normalizeFacts(input.facts, {
    name: current.snapshot.name,
    subtype: current.snapshot.subtype,
    seoBlueprint: current.snapshot.seoBlueprint,
  });
  const generated = await generateGuardedSiteContent({
    site: current.snapshot,
    facts,
    profiles: [profile],
    executors: createModelExecutorRegistry([createJsonContentExecutor(model)]),
  });

  const saved = await saveSupabaseDraft(request, {
    snapshot: generated.site,
    expectedRevision: current.revision,
  });

  return {
    draft: saved,
    model: { id: generated.model.id, provider: generated.model.provider, model: generated.model.model },
    ...(recordedUsage ? { usage: recordedUsage } : {}),
    audit: {
      appliedFields: generated.appliedFields,
      structureIntact: generated.structureIntact,
      restoredChanges: generated.restoredChanges,
      groundingIssueCount: generated.groundingIssues.length,
      groundingIssues: generated.groundingIssues,
    },
  };
}

async function recordContentUsage(request: NextRequest, input: {
  workspaceId: string;
  siteId: string;
  profileId: string;
  provider: string;
  model: string;
  usage: TextProviderUsage;
}) {
  const cfg = supabaseConfig();
  const response = await fetch(`${cfg.url}/rest/v1/rpc/record_ai_usage`, {
    method: "POST",
    headers: supabaseHeaders(request),
    body: JSON.stringify({
      p_workspace_id: input.workspaceId,
      p_site_id: input.siteId,
      p_build_id: null,
      p_task: "generate-content",
      p_profile_id: input.profileId,
      p_provider: input.provider,
      p_model: input.model,
      p_input_tokens: input.usage.inputTokens,
      p_output_tokens: input.usage.outputTokens,
      p_images: 0,
      p_component_generations: 0,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI usage metering failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  const payload = await response.json() as { cost_microusd?: unknown };
  const costMicrousd = Number(payload.cost_microusd);
  if (!Number.isInteger(costMicrousd) || costMicrousd < 0) throw new Error("AI usage metering returned an invalid cost.");
  return { inputTokens: input.usage.inputTokens, outputTokens: input.usage.outputTokens, costMicrousd };
}

function normalizeFacts(
  value: Partial<GroundingFacts> | undefined,
  site: { name: string; subtype: string | undefined; seoBlueprint: { targetLocations: string[]; priorityTopics: string[] } },
): GroundingFacts {
  const industry = text(value?.industry) || site.subtype;
  return {
    businessName: text(value?.businessName) || site.name,
    ...(industry ? { industry } : {}),
    subindustry: optionalText(value?.subindustry) ?? site.subtype ?? null,
    location: optionalText(value?.location) ?? site.seoBlueprint.targetLocations[0] ?? null,
    services: Array.isArray(value?.services) && value.services.length ? value.services.filter(Boolean) : site.seoBlueprint.priorityTopics,
    goals: Array.isArray(value?.goals) ? value.goals.filter(Boolean) : [],
    notes: optionalText(value?.notes) ?? null,
  };
}

function providerName(endpoint: string) {
  try {
    const host = new URL(endpoint).hostname;
    if (host.includes("googleapis.com")) return "google";
    if (host.includes("openai.com")) return "openai";
    if (host.includes("groq.com")) return "groq";
    if (host.includes("nvidia.com")) return "nvidia";
    return host;
  } catch {
    return "openai-compatible";
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
