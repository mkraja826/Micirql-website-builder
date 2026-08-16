import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

export async function GET(request: NextRequest) {
  try {
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    const { url } = supabaseConfig();
    const headers = supabaseHeaders(request);
    const query = new URLSearchParams({ site_id: `eq.${siteId}`, select: "site_id,workspace_id,email_address,email_enabled", limit: "1" });
    const response = await fetch(`${url}/rest/v1/site_notification_preferences?${query}`, { headers, cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: `Notification settings load failed (${response.status}).` }, { status: response.status });
    const rows = await response.json() as Array<{ site_id:string; workspace_id:string; email_address:string|null; email_enabled:boolean }>;
    return NextResponse.json({ settings: rows[0] ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Notification settings load failed." }, { status: (error as Error & { status?:number }).status ?? 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const enabled = body.enabled === true;
    if (!siteId) return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    if (enabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid notification email." }, { status: 400 });
    const { url } = supabaseConfig();
    const headers = supabaseHeaders(request);
    const siteQuery = new URLSearchParams({ id: `eq.${siteId}`, select: "id,workspace_id", limit: "1" });
    const siteResponse = await fetch(`${url}/rest/v1/sites?${siteQuery}`, { headers, cache: "no-store" });
    if (!siteResponse.ok) return NextResponse.json({ error: `Website lookup failed (${siteResponse.status}).` }, { status: siteResponse.status });
    const sites = await siteResponse.json() as Array<{ id:string; workspace_id:string }>;
    const workspaceId = sites[0]?.workspace_id;
    if (!workspaceId) return NextResponse.json({ error: "Website not found or access denied." }, { status: 404 });
    const response = await fetch(`${url}/rest/v1/site_notification_preferences?on_conflict=site_id&select=site_id,workspace_id,email_address,email_enabled`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ site_id: siteId, workspace_id: workspaceId, email_address: email || null, email_enabled: enabled, updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ error: `Notification settings save failed (${response.status}).` }, { status: response.status });
    const rows = await response.json() as unknown[];
    return NextResponse.json({ settings: rows[0] ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Notification settings save failed." }, { status: (error as Error & { status?:number }).status ?? 500 });
  }
}
