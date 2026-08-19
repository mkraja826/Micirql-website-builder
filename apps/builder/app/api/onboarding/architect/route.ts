import { NextRequest, NextResponse } from "next/server";
import { evaluateGeneratedSiteQuality } from "@micirql/design-engine";
import { applyPageArchitecture, planPageArchitecture } from "../../../page-architecture-intelligence";
import { planPageMedia } from "../../../page-media-intelligence";
import { executeMediaPlan, type MediaAsset } from "../../../media-execution";
import { materializeGeneratedMedia } from "../../../materialize-media-execution";
import { applyMediaExecution } from "../../../apply-media-execution";
import { applyExactAssetPlacement } from "../../../exact-asset-placement";
import { applyFunctionalBindings } from "../../../functional-binding-intelligence";
import { evaluateSiteVisualQuality } from "../../../site-visual-quality";
import { evaluateDentalContentQuality, type DentalContentQualityResult } from "../../../dental-content-quality";
import { safeRecordBuildObservability } from "../../../build-observability";
import { getSupabaseDraft, saveSupabaseDraft } from "../../drafts/supabase-store";
import { runGuardedContentGeneration } from "../../generate-content/service";
import { loadMediaPools } from "../media-assets";

const MIN_DENTAL_CONTENT_SCORE = 82;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const buildId = crypto.randomUUID();
  let stage = "planning";
  let workspaceId = "";
  let siteId = "";
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    workspaceId = text(body.workspaceId);
    siteId = text(body.siteId);
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
    const requiredCapabilities = list(body.requiredCapabilities);
    const plan = planPageArchitecture({
      businessName,
      industry,
      subindustry: facts.subindustry,
      location: facts.location,
      services: facts.services,
      goals: facts.goals,
      requiredCapabilities,
      notes: facts.notes,
    });
    stage = "designing";
    let architecturalSite = applyPageArchitecture(draft.snapshot, plan);

    let mediaExecution = null;
    let mediaWarning: string | null = null;
    let generatedMediaCount = 0;
    let customerAssets: MediaAsset[] = [];
    stage = "media";
    try {
      const mediaPlan = planPageMedia(architecturalSite, industry);
      const pools = await loadMediaPools(workspaceId);
      customerAssets = pools.customerAssets;
      mediaExecution = executeMediaPlan({ plan: mediaPlan, ...pools, allowGeneration: true });
      const materialized = await materializeGeneratedMedia({ request, site: architecturalSite, execution: mediaExecution, workspaceId, siteId, domain: industry, maxGenerated: 1 });
      mediaExecution = materialized.execution;
      generatedMediaCount = materialized.generated;
      if (materialized.warnings.length) mediaWarning = materialized.warnings.join(" ");
      architecturalSite = applyMediaExecution(architecturalSite, mediaExecution);
    } catch (error) {
      mediaWarning = error instanceof Error ? error.message : "Page-specific media enrichment failed.";
      console.error("MiCirql page media enrichment failed; keeping architecture without extra media.", error);
    }

    const saved = await saveSupabaseDraft(request, { snapshot: architecturalSite, expectedRevision: draft.revision });

    let content: Awaited<ReturnType<typeof runGuardedContentGeneration>> | null = null;
    let contentWarning: string | null = null;
    stage = "content";
    try {
      content = await runGuardedContentGeneration(request, { workspaceId, siteId, expectedRevision: saved.revision, facts });
    } catch (error) {
      contentWarning = error instanceof Error ? error.message : "Page-specific content generation failed.";
      console.error("MiCirql architecture content pass failed; keeping architectural draft.", error);
    }

    let exactPlacement = { placed: 0, pairedCases: 0, unmatched: [] as string[] };
    stage = "asset-placement";
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
    stage = "functions";
    try {
      const current = await getSupabaseDraft(request, workspaceId, siteId);
      if (current) {
        const functional = applyFunctionalBindings(current.snapshot, { notes: facts.notes, goals: facts.goals, location: facts.location, workspaceId, siteId, industry });
        functionalBindings = { bound: functional.bound };
        if (functional.bound.length) await saveSupabaseDraft(request, { snapshot: functional.site, expectedRevision: current.revision });
      }
    } catch (error) {
      console.error("MiCirql functional binding pass failed; keeping generated content and media.", error);
    }

    stage = "quality";
    const finalDraft = await getSupabaseDraft(request, workspaceId, siteId);
    if (!finalDraft) throw new Error("GENERATED_SITE_QUALITY_FAILED: final draft unavailable");
    const generatedQuality = evaluateGeneratedSiteQuality(finalDraft.snapshot, businessName);
    if (!generatedQuality.ready) {
      const codes = [...new Set(generatedQuality.issues.map((item) => item.code))];
      throw new Error(`GENERATED_SITE_QUALITY_FAILED: ${codes.join(", ")}`);
    }

    let dentalContentQuality: DentalContentQualityResult | null = null;
    if (isDentalBrief(facts)) {
      dentalContentQuality = evaluateDentalContentQuality(finalDraft.snapshot, {
        business_name: businessName,
        industry,
        subindustry: facts.subindustry,
        location: facts.location,
        services: facts.services,
        goals: facts.goals,
        required_capabilities: requiredCapabilities,
        notes: facts.notes,
      });
      const dentalErrors = dentalContentQuality.issues.filter((item) => item.severity === "error");
      if (dentalErrors.length || dentalContentQuality.score < MIN_DENTAL_CONTENT_SCORE) {
        const codes = [...new Set((dentalErrors.length ? dentalErrors : dentalContentQuality.issues).map((item) => item.code))];
        throw new Error(`GENERATED_DENTAL_CONTENT_QUALITY_FAILED: ${codes.join(", ") || `score ${dentalContentQuality.score}/${MIN_DENTAL_CONTENT_SCORE}`}`);
      }
    }

    const visualQuality = evaluateSiteVisualQuality(finalDraft.snapshot);
    if (!visualQuality.ready) {
      const codes = [...new Set(visualQuality.issues.map((item) => item.code))];
      throw new Error(`GENERATED_SITE_VISUAL_QUALITY_FAILED: ${codes.join(", ")}`);
    }

    const fallbackCount = content?.recovery?.failedProviders ?? 0;
    const recoveryReason = contentWarning || mediaWarning || (fallbackCount > 0 ? content?.recovery?.failures?.map((item) => item.reason).filter(Boolean).join(" | ") : null) || null;
    const outcome = recoveryReason ? "recovered" as const : "success" as const;
    const qualityScore = Math.min(content?.audit.contentQuality.score ?? 100, visualQuality.score, dentalContentQuality?.score ?? 100);
    await safeRecordBuildObservability(request, {
      workspaceId,
      siteId,
      buildId,
      outcome,
      durationMs: Date.now() - startedAt,
      provider: content?.model.provider ?? null,
      model: content?.model.model ?? null,
      fallbackCount,
      qualityScore,
      recoveryReason,
      details: { generatedMediaCount, exactPlacement, functionalBindings, contentWarning, mediaWarning, generatedQuality, dentalContentQuality, visualQuality },
    });

    return NextResponse.json({ ok: true, buildId, architecture: plan, mediaExecution, generatedMediaCount, mediaWarning, exactPlacement, functionalBindings, content, contentWarning, generatedQuality, dentalContentQuality, visualQuality });
  } catch (error) {
    if (workspaceId && siteId) await safeRecordBuildObservability(request, {
      workspaceId,
      siteId,
      buildId,
      outcome: "failed",
      failedStage: stage,
      durationMs: Date.now() - startedAt,
      recoveryReason: error instanceof Error ? error.message : "Unknown build failure",
      details: { stage },
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Page architecture failed.", buildId }, { status: 500 });
  }
}

function isDentalBrief(facts: { industry: string; subindustry: string | null; services: string[]; notes: string | null }) {
  const textValue = [facts.industry, facts.subindustry, ...facts.services, facts.notes].filter(Boolean).join(" ").toLowerCase();
  return /dental|dentist|dentistry|orthodont|endodont|implant|cosmetic dentistry|smile design|veneer/.test(textValue);
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const next = text(value); return next || undefined; }
function list(value: unknown) { if (Array.isArray(value)) return value.map(text).filter(Boolean); if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean); return []; }
