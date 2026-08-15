import type { NextRequest } from "next/server";
import { siteSchema, type Site } from "@micirql/schema";

export type DraftRecord = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};

type RemoteDraft = {
  workspace_id: string;
  site_id: string;
  revision: number;
  snapshot: unknown;
  updated_at: string;
  updated_by: string;
};

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : undefined;
}

export function usesSupabaseDraftStore() {
  return process.env.MICIRQL_DRAFT_STORE !== "memory" && Boolean(config());
}

function authHeaders(request: NextRequest) {
  const cfg = config();
  if (!cfg) throw new Error("Supabase draft store is not configured.");
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    const error = new Error("AUTH_REQUIRED");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
  return {
    apikey: cfg.key,
    authorization,
    "content-type": "application/json",
  };
}

export async function getSupabaseDraft(request: NextRequest, workspaceId: string, siteId: string): Promise<DraftRecord | undefined> {
  const cfg = config();
  if (!cfg) return undefined;
  const query = new URLSearchParams({
    workspace_id: `eq.${workspaceId}`,
    site_id: `eq.${siteId}`,
    select: "workspace_id,site_id,revision,snapshot,updated_at,updated_by",
    limit: "1",
  });
  const response = await fetch(`${cfg.url}/rest/v1/workspace_drafts?${query}`, {
    headers: authHeaders(request),
    cache: "no-store",
  });
  if (!response.ok) throw httpError(response.status, await response.text());
  const rows = await response.json() as RemoteDraft[];
  return rows[0] ? normalize(rows[0]) : undefined;
}

export async function saveSupabaseDraft(
  request: NextRequest,
  input: { snapshot: Site; expectedRevision: number; updatedBy: string },
): Promise<DraftRecord> {
  const cfg = config();
  if (!cfg) throw new Error("Supabase draft store is not configured.");
  const response = await fetch(`${cfg.url}/rest/v1/rpc/save_workspace_draft`, {
    method: "POST",
    headers: authHeaders(request),
    body: JSON.stringify({
      p_workspace_id: input.snapshot.workspaceId,
      p_site_id: input.snapshot.siteId,
      p_expected_revision: input.expectedRevision,
      p_snapshot: input.snapshot,
      p_updated_by: input.updatedBy,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw httpError(response.status, await response.text());
  const payload = await response.json() as RemoteDraft | RemoteDraft[];
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row) throw new Error("Supabase did not return the saved draft.");
  return normalize(row);
}

function normalize(row: RemoteDraft): DraftRecord {
  return {
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    revision: Number(row.revision),
    snapshot: siteSchema.parse(row.snapshot),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

function httpError(status: number, body: string) {
  const message = body.includes("REVISION") || body.toLowerCase().includes("revision")
    ? "REVISION_CONFLICT"
    : `Supabase draft request failed (${status}).`;
  const error = new Error(message) as Error & { status?: number; detail?: string };
  error.status = status;
  error.detail = body;
  return error;
}
