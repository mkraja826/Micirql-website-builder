import { NextRequest, NextResponse } from "next/server";
import type { GroundingFacts } from "@micirql/design-engine";
import { usesSupabaseDraftStore } from "../drafts/supabase-store";
import { runGuardedContentGeneration } from "./service";

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

    const facts = normalizeFacts(body.facts);
    const result = await runGuardedContentGeneration(request, {
      workspaceId,
      siteId,
      expectedRevision,
      ...(facts ? { facts } : {}),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content generation failed.";
    const status = (error as Error & { status?: number }).status ?? (message === "REVISION_CONFLICT" ? 409 : 500);
    const currentRevision = (error as Error & { currentRevision?: number }).currentRevision;
    return NextResponse.json({ error: message, ...(currentRevision !== undefined ? { currentRevision } : {}) }, { status });
  }
}

function normalizeFacts(value: unknown): Partial<GroundingFacts> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const businessName = optionalText(input.businessName);
  const industry = optionalText(input.industry);
  return {
    ...(businessName ? { businessName } : {}),
    ...(industry ? { industry } : {}),
    subindustry: optionalText(input.subindustry) ?? null,
    location: optionalText(input.location) ?? null,
    services: stringArray(input.services),
    goals: stringArray(input.goals),
    notes: optionalText(input.notes) ?? null,
  };
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
function stringArray(value: unknown) { return Array.isArray(value) ? value.map(text).filter(Boolean) : []; }
