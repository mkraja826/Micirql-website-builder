import type { NextRequest } from "next/server";
import { supabaseConfig, supabaseHeaders } from "./api/drafts/supabase-store";

export type BuildObservabilityRecord = {
  workspaceId: string;
  siteId: string;
  buildId: string;
  outcome: "success" | "recovered" | "failed";
  failedStage?: string | null;
  durationMs: number;
  provider?: string | null;
  model?: string | null;
  fallbackCount?: number;
  qualityScore?: number | null;
  recoveryReason?: string | null;
  details?: Record<string, unknown>;
};

export async function recordBuildObservability(request: NextRequest, record: BuildObservabilityRecord) {
  const cfg = supabaseConfig();
  const response = await fetch(`${cfg.url}/rest/v1/build_observability`, {
    method: "POST",
    headers: { ...supabaseHeaders(request), prefer: "return=minimal" },
    body: JSON.stringify({
      workspace_id: record.workspaceId,
      site_id: record.siteId,
      build_id: record.buildId,
      outcome: record.outcome,
      failed_stage: record.failedStage ?? null,
      duration_ms: Math.max(0, Math.round(record.durationMs)),
      provider: record.provider ?? null,
      model: record.model ?? null,
      fallback_count: Math.max(0, Math.round(record.fallbackCount ?? 0)),
      quality_score: record.qualityScore ?? null,
      recovery_reason: record.recoveryReason ?? null,
      details: record.details ?? {},
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Build observability write failed (${response.status}).`);
}

export async function safeRecordBuildObservability(request: NextRequest, record: BuildObservabilityRecord) {
  try { await recordBuildObservability(request, record); }
  catch (error) { console.error("MiCirql build observability write failed.", error); }
}
