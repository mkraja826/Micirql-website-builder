import { NextRequest, NextResponse } from "next/server";
import { summarizeBuildDiagnostics } from "../../../build-diagnostics-summary";
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
    return NextResponse.json({ ok: true, summary: summarizeBuildDiagnostics(rows), builds: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Diagnostics lookup failed." }, { status: 500 });
  }
}
