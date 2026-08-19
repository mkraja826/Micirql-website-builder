import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, supabaseHeaders } from "../drafts/supabase-store";

const LABELS = {
  people: "People/team",
  credentials: "Credentials",
  prices: "Prices",
  openingHours: "Opening hours",
  claims: "Claims/statistics/guarantees",
  addresses: "Addresses",
  phoneNumbers: "Phone numbers",
  emails: "Emails",
  urls: "URLs",
} as const;

type FactKey = keyof typeof LABELS;
type Facts = Record<FactKey, string[]>;

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });
    const profile = await loadProfile(request, workspaceId, siteId);
    if (!profile) return NextResponse.json({ error: "ONBOARDING_PROFILE_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ facts: parseFacts(text(profile.notes)), updatedAt: profile.updated_at ?? null });
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const workspaceId = text(body.workspaceId);
    const siteId = text(body.siteId);
    if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });
    const profile = await loadProfile(request, workspaceId, siteId);
    if (!profile) return NextResponse.json({ error: "ONBOARDING_PROFILE_NOT_FOUND" }, { status: 404 });
    const facts = normalizeFacts(body.facts);
    const notes = rewriteLockedFacts(text(profile.notes), facts);
    const cfg = supabaseConfig();
    const query = new URLSearchParams({ workspace_id: `eq.${workspaceId}`, site_id: `eq.${siteId}` });
    const response = await fetch(`${cfg.url}/rest/v1/business_onboarding_profiles?${query}`, {
      method: "PATCH",
      headers: { ...supabaseHeaders(request), Prefer: "return=representation" },
      body: JSON.stringify({ notes, updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!response.ok) throw httpError(response.status, await response.text());
    return NextResponse.json({ ok: true, facts });
  } catch (error) {
    return fail(error);
  }
}

async function loadProfile(request: NextRequest, workspaceId: string, siteId: string) {
  const cfg = supabaseConfig();
  const query = new URLSearchParams({ workspace_id: `eq.${workspaceId}`, site_id: `eq.${siteId}`, select: "notes,updated_at", limit: "1" });
  const response = await fetch(`${cfg.url}/rest/v1/business_onboarding_profiles?${query}`, { headers: supabaseHeaders(request), cache: "no-store" });
  if (!response.ok) throw httpError(response.status, await response.text());
  const rows = await response.json() as Array<{ notes?: unknown; updated_at?: unknown }>;
  return rows[0];
}

function parseFacts(notes: string): Facts {
  return Object.fromEntries(Object.entries(LABELS).map(([key, label]) => [key, labelledFacts(notes, label)])) as Facts;
}

function normalizeFacts(value: unknown): Facts {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(LABELS).map((key) => [key, list(raw[key])])) as Facts;
}

function rewriteLockedFacts(notes: string, facts: Facts) {
  let next = notes;
  for (const [key, label] of Object.entries(LABELS) as Array<[FactKey, string]>) {
    const line = `${label}: ${facts[key].join(" | ") || "not supplied"}`;
    const re = new RegExp(`^${escapeRegExp(label)}:\\s*.*$`, "im");
    next = re.test(next) ? next.replace(re, line) : `${next.trimEnd()}\n${line}`;
  }
  if (!/LOCKED FACTS/i.test(next)) next = `${next.trimEnd()}\n\nLOCKED FACTS — use exactly as supplied; never invent missing values:`;
  return next.trim();
}

function labelledFacts(notes: string, label: string) {
  const match = notes.match(new RegExp(`^${escapeRegExp(label)}:\\s*(.+)$`, "im"));
  const raw = match?.[1]?.trim();
  if (!raw || raw.toLowerCase() === "not supplied") return [];
  return raw.split("|").map((item) => item.trim()).filter(Boolean).slice(0, 48);
}

function list(value: unknown) {
  const input = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n|\|/) : [];
  return [...new Set(input.map(text).filter(Boolean))].slice(0, 48);
}
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function escapeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function httpError(status: number, message: string) { const error = new Error(message || `Remote request failed (${status}).`) as Error & { status?: number }; error.status = status; return error; }
function fail(error: unknown) { const status = (error as Error & { status?: number }).status ?? 500; return NextResponse.json({ error: error instanceof Error ? error.message : "Business facts request failed." }, { status }); }
