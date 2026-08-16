import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50) || 50, 200));
    const actionId = request.nextUrl.searchParams.get("actionId")?.trim();
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const { url } = supabaseConfig();
    const headers = supabaseHeaders(request);
    const query = new URLSearchParams({
      site_id: `eq.${siteId}`,
      select: "id,workspace_id,site_id,action_id,action_version,contact_name,contact_email,contact_phone,payload,status,created_at,updated_at",
      order: "created_at.desc",
      limit: String(limit),
    });
    if (actionId) query.set("action_id", `eq.${actionId}`);
    if (status) query.set("status", `eq.${status}`);
    const response = await fetch(`${url}/rest/v1/site_function_records?${query}`, { headers, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: `Submission load failed (${response.status}).` }, { status: response.status });
    const submissions = await response.json();
    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission load failed." }, { status: (error as Error & { status?: number }).status ?? 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    if (!id || !siteId) return NextResponse.json({ error: "id and siteId are required" }, { status: 400 });
    if (!new Set(["received", "queued", "processing", "completed", "failed", "spam"]).has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const { url } = supabaseConfig();
    const headers = supabaseHeaders(request);
    const query = new URLSearchParams({ id: `eq.${id}`, site_id: `eq.${siteId}`, select: "id,status,updated_at" });
    const response = await fetch(`${url}/rest/v1/site_function_records?${query}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: `Submission update failed (${response.status}).` }, { status: response.status });
    const rows = await response.json() as unknown[];
    if (!rows.length) return NextResponse.json({ error: "Submission not found or access denied." }, { status: 404 });
    return NextResponse.json({ submission: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Submission update failed." }, { status: (error as Error & { status?: number }).status ?? 500 });
  }
}
