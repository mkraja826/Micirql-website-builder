import { NextRequest, NextResponse } from "next/server";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  generateGuardedSiteContent,
  plannerModelFromEnvironment,
  textProviderConfigFromEnvironment,
  type ModelProfile,
} from "@micirql/ai";
import type { GroundingFacts } from "@micirql/design-engine";
import { getSupabaseDraft, saveSupabaseDraft, usesSupabaseDraftStore } from "../drafts/supabase-store";

export async function POST(request: NextRequest) {
  try {
    if (!usesSupabaseDraftStore()) {
      return NextResponse.json({ error: "Persistent draft storage is required for content generation." }, { status: 503 });
    }

    const body = await request.json() as Record<string, unknown>;
    const workspaceId = text(body.workspaceId);
    const siteId = text(body.siteId);
    const expectedRevision = Number(body.expectedRevision);
    if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return NextResponse.json({ error: "expectedRevision must be a non-negative integer" }, { status: 400 });
    }

    const current = await getSupabaseDraft(request, workspaceId, siteId);
    if (!current) return NextResponse.json({ error: "DRAFT_NOT_FOUND" }, { status: 404 });
    if (current.revision !== expectedRevision) {
      return NextResponse.json({ error: "REVISION_CONFLICT", currentRevision: current.revision, draft: current }, { status: 409 });
    }

    const providerConfig = textProviderConfigFromEnvironment(process.env);
    const model = plannerModelFromEnvironment(process.env);
    if (!providerConfig || !model) return NextResponse.json({ error: "TEXT_MODEL_NOT_CONFIGURED" }, { status: 503 });

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

    const facts = normalizeFacts(body.facts, current.snapshot);
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

    return NextResponse.json({
      ok: true,
      draft: saved,
      model: { id: generated.model.id, provider: generated.model.provider, model: generated.model.model },
      audit: {
        appliedFields: generated.appliedFields,
        structureIntact: generated.structureIntact,
        restoredChanges: generated.restoredChanges,
        groundingIssueCount: generated.groundingIssues.length,
        groundingIssues: generated.groundingIssues,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content generation failed.";
    const status = message === "REVISION_CONFLICT" ? 409 : ((error as Error & { status?: number }).status ?? 500);
    return NextResponse.json({ error: message }, { status });
  }
}

function normalizeFacts(value: unknown, site: { name: string; subtype?: string; seoBlueprint: { targetLocations: string[]; priorityTopics: string[] } }): GroundingFacts {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    businessName: text(input.businessName) || site.name,
    industry: text(input.industry) || site.subtype,
    subindustry: optionalText(input.subindustry) ?? site.subtype ?? null,
    location: optionalText(input.location) ?? site.seoBlueprint.targetLocations[0] ?? null,
    services: stringArray(input.services).length ? stringArray(input.services) : site.seoBlueprint.priorityTopics,
    goals: stringArray(input.goals),
    notes: optionalText(input.notes) ?? null,
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
function stringArray(value: unknown) { return Array.isArray(value) ? value.map(text).filter(Boolean) : []; }
