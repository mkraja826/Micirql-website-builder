import { NextRequest, NextResponse } from "next/server";
import { applyPageArchitecture, planPageArchitecture } from "../../../page-architecture-intelligence";
import { planPageMedia } from "../../../page-media-intelligence";
import { executeMediaPlan, type MediaAsset } from "../../../media-execution";
import { materializeGeneratedMedia } from "../../../materialize-media-execution";
import { applyMediaExecution } from "../../../apply-media-execution";
import { applyExactAssetPlacement } from "../../../exact-asset-placement";
import { applyFunctionalBindings } from "../../../functional-binding-intelligence";
import { getSupabaseDraft, saveSupabaseDraft } from "../../drafts/supabase-store";
import { runGuardedContentGeneration } from "../../generate-content/service";
import { loadMediaPools } from "../media-assets";

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
    let architecturalSite = applyPageArchitecture(draft.snapshot, plan);

    let mediaExecution = null;
    let mediaWarning: string | null = null;
    let generatedMediaCount = 0;
    let customerAssets: MediaAsset[] = [];
    try {
      const mediaPlan = planPageMedia(architecturalSite, industry);
      const pools = await loadMediaPools(workspaceId);
      customerAssets = pools.customerAssets;
      mediaExecution = executeMediaPlan({ plan: mediaPlan, ...pools, allowGeneration: true });
      const materialized = await materializeGeneratedMedia({
        request,
        site: architecturalSite,
        execution: mediaExecution,
        workspaceId,
        siteId,
        domain: industry,
        maxGenerated: 1,
      });
      mediaExecution = materialized.execution;
      generatedMediaCount = materialized.generated;
      if (materialized.warnings.length) mediaWarning = materialized.warnings.join(" ");
      architecturalSite = applyMediaExecution(architecturalSite, mediaExecution);
    } catch (error) {
      mediaWarning = error instanceof Error ? error.message : "Page-specific media enrichment failed.";
      console.error("MiCirql page media enrichment failed; keeping architecture without extra media.", error);
    }

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

    let exactPlacement = { placed: 0, pairedCases: 0, unmatched: [] as string[] };
    try {
      const current = await getSupabaseDraft(request, workspaceId, siteId);
      if (current && customerAssets.length) {
        const placed = applyExactAssetPlacement(current.snapshot, customerAssets);
        exactPlacement = { placed: placed.placed, pairedCases: placed.pairedCases, unmatched: placed.unmatched };
        if (placed.placed > 0) await saveSupabaseDraft(request, { snapshot: placed.site, expectedRevision: current.revision });
      }
    } catch (error) {
      console.error("MiCirql exact asset placement failed; keeping page-level media placement.", error);
    }

    let functionalBindings = { bound: [] as string[] };
    try {
      const current = await getSupabaseDraft(request, workspaceId, siteId);
      if (current) {
        const functional = applyFunctionalBindings(current.snapshot, { notes: facts.notes, goals: facts.goals, location: facts.location });
        functionalBindings = { bound: functional.bound };
        if (functional.bound.length) await saveSupabaseDraft(request, { snapshot: functional.site, expectedRevision: current.revision });
      }
    } catch (error) {
      console.error("MiCirql functional binding pass failed; keeping generated content and media.", error);
    }

    return NextResponse.json({ ok: true, architecture: plan, mediaExecution, generatedMediaCount, mediaWarning, exactPlacement, functionalBindings, content, contentWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page architecture failed." }, { status: 500 });
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
function list(value: unknown) { if (Array.isArray(value)) return value.map(text).filter(Boolean); if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean); return []; }
