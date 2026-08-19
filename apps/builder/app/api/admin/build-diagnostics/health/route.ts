import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, supabaseHeaders } from "../../../drafts/supabase-store";

export async function GET(request: NextRequest) {
  try {
    const cfg = supabaseConfig();
    const response = await fetch(`${cfg.url}/rest/v1/build_observability?select=id&limit=1`, {
      headers: supabaseHeaders(request),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        tableReady: false,
        status: response.status,
        trustedMeteringConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        meteringMode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "trusted-service-role" : "authenticated-fallback",
      }, { status: 503 });
    }
    const rows = await response.json() as Array<{ id?: string }>;
    const trustedMeteringConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    return NextResponse.json({
      ok: true,
      tableReady: true,
      readable: true,
      hasRecords: rows.length > 0,
      trustedMeteringConfigured,
      meteringMode: trustedMeteringConfigured ? "trusted-service-role" : "authenticated-fallback",
      aiMeteringCutoverReady: trustedMeteringConfigured,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      tableReady: false,
      trustedMeteringConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      meteringMode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "trusted-service-role" : "authenticated-fallback",
      error: error instanceof Error ? error.message : "Diagnostics health check failed.",
    }, { status: 503 });
  }
}
