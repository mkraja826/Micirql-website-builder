import type { NextRequest } from "next/server";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  createOpenAiCompatibleJsonPlannerModel,
  generateGuardedSiteContent,
  textProviderConfigFromEnvironment,
  type ModelProfile,
  type PlannerModel,
  type TextProviderUsage,
} from "@micirql/ai";
import type { GroundingFacts } from "@micirql/design-engine";
import {
  CLOUDFLARE_CONTENT_MODEL,
  CLOUDFLARE_CONTENT_PROFILE_ID,
  createWorkersAiJsonPlannerModel,
} from "../../cloudflare-workers-ai-text";
import { getSupabaseDraft, saveSupabaseDraft, supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

export type GuardedContentGenerationRequest = {
  workspaceId: string;
  siteId: string;
  expectedRevision: number;
  facts?: Partial<GroundingFacts>;
};

type ContentUsage = { inputTokens: number; outputTokens: number; costMicrousd: number };
type ContentAttempt = { planner: PlannerModel; profile: ModelProfile };

export async function runGuardedContentGeneration(request: NextRequest, input: GuardedContentGenerationRequest) {
  const current = await getSupabaseDraft(request, input.workspaceId, input.siteId);
  if (!current) { const error = new Error("DRAFT_NOT_FOUND") as Error & { status?: number }; error.status = 404; throw error; }
  if (current.revision !== input.expectedRevision) {
    const error = new Error("REVISION_CONFLICT") as Error & { status?: number; currentRevision?: number };
    error.status = 409; error.currentRevision = current.revision; throw error;
  }

  const attempts: ContentAttempt[] = [];
  const usageByProfile = new Map<string, ContentUsage>();
  let recordedUsage: ContentUsage | undefined;

  const workersPlanner = createWorkersAiJsonPlannerModel({
    maxOutputTokens: 8_000,
    onUsage: async (usage) => {
      recordedUsage = await recordContentUsage(request, { workspaceId: input.workspaceId, siteId: input.siteId, profileId: CLOUDFLARE_CONTENT_PROFILE_ID, provider: "cloudflare-workers-ai", model: CLOUDFLARE_CONTENT_MODEL, usage });
      usageByProfile.set(CLOUDFLARE_CONTENT_PROFILE_ID, recordedUsage);
    },
  });
  if (workersPlanner) attempts.push({ planner: workersPlanner, profile: { id: CLOUDFLARE_CONTENT_PROFILE_ID, provider: "cloudflare-workers-ai", model: CLOUDFLARE_CONTENT_MODEL, capabilities: ["content-generation"], enabled: true, qualityScore: 86, latencyClass: "low", costClass: "low", maxOutputTokens: 8_000 } });

  const providerConfig = textProviderConfigFromEnvironment(process.env);
  if (providerConfig) {
    const provider = providerName(providerConfig.endpoint);
    const planner = createOpenAiCompatibleJsonPlannerModel({
      ...providerConfig,
      onUsage: async (usage) => {
        recordedUsage = await recordContentUsage(request, { workspaceId: input.workspaceId, siteId: input.siteId, profileId: providerConfig.id, provider, model: providerConfig.model, usage });
        usageByProfile.set(providerConfig.id, recordedUsage);
      },
    });
    attempts.push({ planner, profile: { id: providerConfig.id, provider, model: providerConfig.model, capabilities: ["content-generation"], enabled: true, qualityScore: 90, latencyClass: "low", costClass: "medium", ...(providerConfig.maxOutputTokens ? { maxOutputTokens: providerConfig.maxOutputTokens } : {}) } });
  }

  if (!attempts.length) { const error = new Error("TEXT_MODEL_NOT_CONFIGURED") as Error & { status?: number }; error.status = 503; throw error; }

  const facts = normalizeFacts(input.facts, { name: current.snapshot.name, subtype: current.snapshot.subtype, seoBlueprint: current.snapshot.seoBlueprint });
  let generated: Awaited<ReturnType<typeof generateGuardedSiteContent>> | undefined;
  let selectedProfile: ModelProfile | undefined;
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      generated = await generateGuardedSiteContent({ site: current.snapshot, facts, profiles: [attempt.profile], executors: createModelExecutorRegistry([createJsonContentExecutor(attempt.planner)]) });
      selectedProfile = attempt.profile; break;
    } catch (error) {
      lastError = error;
      console.error(`MiCirql content provider ${attempt.profile.provider}/${attempt.profile.model} failed.`, error);
    }
  }

  if (!generated || !selectedProfile) throw lastError instanceof Error ? lastError : new Error("Content generation failed for every configured provider.");

  const saved = await saveSupabaseDraft(request, { snapshot: generated.site, expectedRevision: current.revision });
  const selectedUsage = usageByProfile.get(selectedProfile.id);
  return {
    draft: saved,
    model: { id: generated.model.id, provider: generated.model.provider, model: generated.model.model },
    ...(selectedUsage ? { usage: selectedUsage } : {}),
    fallbackUsed: attempts[0]?.profile.id !== selectedProfile.id,
    audit: { appliedFields: generated.appliedFields, structureIntact: generated.structureIntact, restoredChanges: generated.restoredChanges, groundingIssueCount: generated.groundingIssues.length, groundingIssues: generated.groundingIssues, contentQuality: generated.contentQuality },
  };
}

async function recordContentUsage(request: NextRequest, input: { workspaceId: string; siteId: string; profileId: string; provider: string; model: string; usage: TextProviderUsage }) {
  const cfg = supabaseConfig();
  const response = await fetch(`${cfg.url}/rest/v1/rpc/record_ai_usage`, {
    method: "POST", headers: supabaseHeaders(request),
    body: JSON.stringify({ p_workspace_id: input.workspaceId, p_site_id: input.siteId, p_build_id: null, p_task: "generate-content", p_profile_id: input.profileId, p_provider: input.provider, p_model: input.model, p_input_tokens: input.usage.inputTokens, p_output_tokens: input.usage.outputTokens, p_images: 0, p_component_generations: 0 }), cache: "no-store",
  });
  if (!response.ok) { const detail = await response.text(); throw new Error(`AI usage metering failed (${response.status}): ${detail.slice(0, 240)}`); }
  const payload = await response.json() as { cost_microusd?: unknown }; const costMicrousd = Number(payload.cost_microusd);
  if (!Number.isInteger(costMicrousd) || costMicrousd < 0) throw new Error("AI usage metering returned an invalid cost.");
  return { inputTokens: input.usage.inputTokens, outputTokens: input.usage.outputTokens, costMicrousd };
}

function normalizeFacts(value: Partial<GroundingFacts> | undefined, site: { name: string; subtype: string | undefined; seoBlueprint: { targetLocations: string[]; priorityTopics: string[] } }): GroundingFacts {
  const industry = text(value?.industry) || site.subtype;
  const notes = optionalText(value?.notes) ?? null;
  const locked = lockedFactsFromNotes(notes);
  const people = mergeFacts(cleanArray(value?.people), locked.people);
  const credentials = mergeFacts(cleanArray(value?.credentials), locked.credentials);
  const proofClaims = mergeFacts(cleanArray(value?.proofClaims), locked.proofClaims);
  const prices = mergeFacts(cleanArray(value?.prices), locked.prices);

  return {
    businessName: text(value?.businessName) || site.name,
    ...(industry ? { industry } : {}),
    subindustry: optionalText(value?.subindustry) ?? site.subtype ?? null,
    location: optionalText(value?.location) ?? site.seoBlueprint.targetLocations[0] ?? null,
    services: cleanArray(value?.services).length ? cleanArray(value?.services) : site.seoBlueprint.priorityTopics,
    goals: cleanArray(value?.goals),
    notes,
    people,
    credentials,
    proofClaims,
    prices,
  };
}

/**
 * The context-first onboarding interpreter records explicit user facts in a locked,
 * labelled block inside notes. Hydrate those labels back into structured grounding
 * buckets so initial website generation and later regenerations use the same facts.
 */
function lockedFactsFromNotes(notes: string | null): Pick<GroundingFacts, "people" | "credentials" | "proofClaims" | "prices"> {
  if (!notes) return { people: [], credentials: [], proofClaims: [], prices: [] };
  return {
    people: labelledFacts(notes, "People/team"),
    credentials: labelledFacts(notes, "Credentials"),
    proofClaims: labelledFacts(notes, "Claims/statistics/guarantees"),
    prices: labelledFacts(notes, "Prices"),
  };
}

function labelledFacts(notes: string, label: string): string[] {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = notes.match(new RegExp(`^${escaped}:\\s*(.+)$`, "im"));
  const raw = match?.[1]?.trim();
  if (!raw || raw.toLowerCase() === "not supplied") return [];
  return raw.split("|").map((item) => item.trim()).filter(Boolean).slice(0, 48);
}

function mergeFacts(primary: string[], locked: string[]): string[] {
  return [...new Set([...primary, ...locked].map((item) => item.trim()).filter(Boolean))].slice(0, 48);
}

function providerName(endpoint: string) { try { const host = new URL(endpoint).hostname; if (host.includes("googleapis.com")) return "google"; if (host.includes("openai.com")) return "openai"; if (host.includes("groq.com")) return "groq"; if (host.includes("nvidia.com")) return "nvidia"; return host; } catch { return "openai-compatible"; } }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
function cleanArray(value: unknown) { return Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))].slice(0, 48) : []; }
