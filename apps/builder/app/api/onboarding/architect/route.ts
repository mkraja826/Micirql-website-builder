import { NextRequest, NextResponse } from "next/server";
import { applyPageArchitecture, planPageArchitecture } from "../../../page-architecture-intelligence";
import { getSupabaseDraft, saveSupabaseDraft } from "../../drafts/supabase-store";
import { runGuardedContentGeneration } from "../../generate-content/service";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const workspaceId = text(body.workspaceId);
    const siteId = text(body.siteId);
    const businessName = text(body.businessName);
    const industry = text(body.industry);
    if (!workspaceId || !siteId || !businessName || !industry) return NextResponse.json({ error: "workspaceId, siteId, businessName and industry are required" }, { status: 400 });

    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!draft) return NextResponse.json({ error: "DRAFT_NOT_FOUND" }, { status: 404 });
    const facts = {
      businessName,
      industry,
      subindustry: optionalText(body.subindustry) ?? null,
      location: optionalText(body.location) ?? null,
      services: list(body.services),
      goals: list(body.goals),
      notes: optionalText(body.notes) ?? null,
    };
    const plan = planPageArchitecture({
      businessName,
      industry,
      subindustry: facts.subindustry,
      location: facts.location,
      services: facts.services,
      goals: facts.goals,
      requiredCapabilities: list(body.requiredCapabilities),
      notes: facts.notes,
    });
    const architecturalSite = applyPageArchitecture(draft.snapshot, plan);
    const saved = await saveSupabaseDraft(request, { snapshot: architecturalSite, expectedRevision: draft.revision });

    let content = null;
    let contentWarning: string | null = null;
    try {
      content = await runGuardedContentGeneration(request, {
        workspaceId,
        siteId,
        expectedRevision: saved.revision,
        facts,
      });
    } catch (error) {
      contentWarning = error instanceof Error ? error.message : "Page-specific content generation failed.";
      console.error("MiCirql architecture content pass failed; keeping architectural draft.", error);
    }

    return NextResponse.json({ ok: true, architecture: plan, content, contentWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page architecture failed." }, { status: 500 });
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
function list(value: unknown) { if (Array.isArray(value)) return value.map(text).filter(Boolean); if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean); return []; }
