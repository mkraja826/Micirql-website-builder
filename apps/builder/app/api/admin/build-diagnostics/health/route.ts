import { NextRequest, NextResponse } from "next/server";
import { hasTrustedSupabaseServerKey, supabaseConfig, supabaseHeaders } from "../../../drafts/supabase-store";

export async function GET(request: NextRequest) {
  const trustedMeteringConfigured = hasTrustedSupabaseServerKey();
  const meteringMode = trustedMeteringConfigured ? "trusted-service-role" : "authenticated-fallback";
  try {
    const cfg = supabaseConfig();
    const response = await fetch(`${cfg.url}/rest/v1/build_observability?select=id&limit=1`, {
      headers: supabaseHeaders(request),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, tableReady: false, status: response.status, trustedMeteringConfigured, meteringMode }, { status: 503 });
    }
    const rows = await response.json() as Array<{ id?: string }>;
    return NextResponse.json({
      ok: true,
      tableReady: true,
      readable: true,
      hasRecords: rows.length > 0,
      trustedMeteringConfigured,
      meteringMode,
      aiMeteringCutoverReady: trustedMeteringConfigured,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      tableReady: false,
      trustedMeteringConfigured,
      meteringMode,
      error: error instanceof Error ? error.message : "Diagnostics health check failed.",
    }, { status: 503 });
  }
}
