import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, supabaseHeaders } from "../../drafts/supabase-store";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    const cfg = supabaseConfig();
    const query = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      select: "id,workspace_id,site_id,build_id,outcome,failed_stage,duration_ms,provider,model,fallback_count,quality_score,recovery_reason,details,created_at",
      order: "created_at.desc",
      limit: "100",
    });
    if (siteId) query.set("site_id", `eq.${siteId}`);
    const response = await fetch(`${cfg.url}/rest/v1/build_observability?${query}`, { headers: supabaseHeaders(request), cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: `Diagnostics lookup failed (${response.status}).` }, { status: response.status });
    const rows = await response.json() as Array<Record<string, unknown>>;
    const summary = {
      total: rows.length,
      success: rows.filter((row) => row.outcome === "success").length,
      recovered: rows.filter((row) => row.outcome === "recovered").length,
      failed: rows.filter((row) => row.outcome === "failed").length,
      fallbackBuilds: rows.filter((row) => Number(row.fallback_count) > 0).length,
      averageDurationMs: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.duration_ms || 0), 0) / rows.length) : 0,
      averageQualityScore: average(rows.map((row) => Number(row.quality_score)).filter(Number.isFinite)),
    };
    return NextResponse.json({ ok: true, summary, builds: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Diagnostics lookup failed." }, { status: 500 });
  }
}

function average(values: number[]) { return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null; }
