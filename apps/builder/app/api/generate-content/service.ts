import type { NextRequest } from "next/server";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  generateGuardedSiteContent,
  plannerModelFromEnvironment,
  textProviderConfigFromEnvironment,
  type ModelProfile,
} from "@micirql/ai";
import type { GroundingFacts } from "@micirql/design-engine";
import { getSupabaseDraft, saveSupabaseDraft } from "../drafts/supabase-store";

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
  const model = plannerModelFromEnvironment(process.env);
  if (!providerConfig || !model) {
    const error = new Error("TEXT_MODEL_NOT_CONFIGURED") as Error & { status?: number };
    error.status = 503;
    throw error;
  }

  const profile: ModelProfile = {
    id: providerConfig.id,
    provider: providerName(providerConfig.endpoint),
    model: providerConfig.model,
    capabilities: ["content-generation"],
    enabled: true,
    qualityScore: 90,
    latencyClass: "low",
    costClass: "medium",
    ...(providerConfig.maxOutputTokens ? { maxOutputTokens: providerConfig.maxOutputTokens } : {}),
  };

  const facts = normalizeFacts(input.facts, current.snapshot);
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
    audit: {
      appliedFields: generated.appliedFields,
      structureIntact: generated.structureIntact,
      restoredChanges: generated.restoredChanges,
      groundingIssueCount: generated.groundingIssues.length,
      groundingIssues: generated.groundingIssues,
    },
  };
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
    return host;
  } catch {
    return "openai-compatible";
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
