import { NextRequest, NextResponse } from "next/server";
import { siteSchema, type Site } from "@micirql/schema";

type Draft = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};

type DraftGlobal = typeof globalThis & { __micirqlDrafts?: Map<string, Draft> };
const globalDrafts = globalThis as DraftGlobal;
const drafts = globalDrafts.__micirqlDrafts ?? new Map<string, Draft>();
globalDrafts.__micirqlDrafts = drafts;

function key(workspaceId: string, siteId: string) {
  return `${workspaceId}:${siteId}`;
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
  const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
  if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });

  const record = drafts.get(key(workspaceId, siteId));
  if (!record) return NextResponse.json({ found: false }, { status: 404 });
  return NextResponse.json({ found: true, draft: record });
}

export async function PUT(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const input = body as Record<string, unknown>;
  const expectedRevision = Number(input.expectedRevision);
  const updatedBy = typeof input.updatedBy === "string" && input.updatedBy.trim() ? input.updatedBy.trim() : "workspace-user";
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    return NextResponse.json({ error: "expectedRevision must be a non-negative integer" }, { status: 400 });
  }

  let snapshot: Site;
  try { snapshot = siteSchema.parse(input.snapshot); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Site Schema" }, { status: 422 });
  }

  const draftKey = key(snapshot.workspaceId, snapshot.siteId);
  const current = drafts.get(draftKey);
  const currentRevision = current?.revision ?? 0;
  if (currentRevision !== expectedRevision) {
    return NextResponse.json({
      error: "REVISION_CONFLICT",
      currentRevision,
      draft: current,
    }, { status: 409 });
  }

  const next: Draft = {
    workspaceId: snapshot.workspaceId,
    siteId: snapshot.siteId,
    revision: currentRevision + 1,
    snapshot,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  drafts.set(draftKey, next);
  return NextResponse.json({ draft: next });
}
