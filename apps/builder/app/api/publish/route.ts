import { evaluateWebsiteContent, groundSiteContent, validateWebsite, type GroundingFacts } from "@micirql/design-engine";
import { siteSchema, type Site } from "@micirql/schema";
import { NextRequest } from "next/server";
import { getSupabaseDraft, saveSupabaseDraft, usesSupabaseDraftStore } from "../drafts/supabase-store";
import { deriveBackendImplementationContract } from "../../backend-implementation-contract";
import { deriveFunctionalArchitecture } from "../../functional-architecture";
import { evaluateFunctionalPublishGate } from "../../functional-publish-gate";
import { repairFunctionalPublishIssues } from "../../functional-publish-repair";
import { evaluateFullStackPublishCertification } from "../../publish-full-stack-certification";
import { assessPublishRepairSync } from "../../publish-repair-sync";
import { getPublishRuntime } from "../../publish-runtime";

const MIN_PUBLISH_CONTENT_SCORE = 82;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { site?: unknown; createdBy?: string; archetypeId?: string; groundingFacts?: Partial<GroundingFacts> };
    const parsed = siteSchema.safeParse(body.site);
    if (!parsed.success) {
      return Response.json({ ok: false, issues: [{ code: "INVALID_DRAFT", message: "The draft failed Site Schema validation." }] }, { status: 400 });
    }

    const functionalRepair = repairFunctionalPublishIssues(parsed.data);
    const publishSite = functionalRepair.site;
    const functionalGate = evaluateFunctionalPublishGate(publishSite);
    if (!functionalGate.ready) {
      return Response.json({
        ok: false,
        code: "FUNCTIONAL_READINESS_NOT_READY",
        functionalGate,
        functionalRepairs: functionalRepair.repairs,
        issues: functionalGate.issues,
      }, { status: 422 });
    }

    const industry = body.groundingFacts?.industry?.trim() || publishSite.subtype;
    const groundingFacts: GroundingFacts = {
      businessName: body.groundingFacts?.businessName?.trim() || publishSite.name,
      ...(industry ? { industry } : {}),
      subindustry: body.groundingFacts?.subindustry ?? publishSite.subtype ?? null,
      location: body.groundingFacts?.location ?? publishSite.seoBlueprint.targetLocations[0] ?? null,
      services: cleanArray(body.groundingFacts?.services).length ? cleanArray(body.groundingFacts?.services) : publishSite.seoBlueprint.priorityTopics,
      goals: cleanArray(body.groundingFacts?.goals),
      notes: body.groundingFacts?.notes?.trim() || null,
      people: cleanArray(body.groundingFacts?.people),
      credentials: cleanArray(body.groundingFacts?.credentials),
      proofClaims: cleanArray(body.groundingFacts?.proofClaims),
      prices: cleanArray(body.groundingFacts?.prices),
    };
    const grounding = groundSiteContent(publishSite, groundingFacts);
    if (!grounding.grounded) {
      return Response.json({
        ok: false,
        code: "CONTENT_GROUNDING_NOT_READY",
        grounding,
        functionalRepairs: functionalRepair.repairs,
        issues: grounding.issues.map((issue) => ({ code: "UNSUPPORTED_CONTENT_CLAIM", message: `${issue.reason}: ${issue.original}`, pagePath: publishSite.pages.find((page) => page.id === issue.pageId)?.path })),
      }, { status: 422 });
    }

    const contentQuality = evaluateWebsiteContent(publishSite);
    const contentErrors = contentQuality.issues.filter((issue) => issue.severity === "error");
    if (contentErrors.length || contentQuality.score < MIN_PUBLISH_CONTENT_SCORE) {
      return Response.json({
        ok: false,
        code: "CONTENT_QUALITY_NOT_READY",
        contentQuality,
        grounding,
        functionalRepairs: functionalRepair.repairs,
        issues: contentErrors.length
          ? contentErrors
          : [{ code: "CONTENT_QUALITY_SCORE_LOW", severity: "error", message: `Content quality score ${contentQuality.score} is below the publish minimum of ${MIN_PUBLISH_CONTENT_SCORE}.` }],
      }, { status: 422 });
    }

    const archetypeId = body.archetypeId?.trim() || inferArchetype(publishSite);
    const readiness = validateWebsite(publishSite, archetypeId);
    if (!readiness.ready) {
      return Response.json({ ok: false, code: "WEBSITE_NOT_READY", readiness, contentQuality, grounding, functionalRepairs: functionalRepair.repairs, issues: readiness.errors }, { status: 422 });
    }

    const architecture = deriveFunctionalArchitecture({
      business_name: groundingFacts.businessName,
      industry: groundingFacts.industry ?? null,
      subindustry: groundingFacts.subindustry ?? null,
      location: groundingFacts.location ?? null,
      goals: groundingFacts.goals,
      services: groundingFacts.services,
      required_capabilities: inferFunctionalCapabilities(publishSite, groundingFacts),
      notes: groundingFacts.notes,
    });
    const backendContract = deriveBackendImplementationContract(architecture);
    const fullStackCertification = await evaluateFullStackPublishCertification({
      site: publishSite,
      architecture,
      backend: backendContract,
    });
    if (!fullStackCertification.allowed) {
      return Response.json({
        ok: false,
        code: "FULL_STACK_CERTIFICATION_REQUIRED",
        readiness,
        contentQuality,
        grounding,
        functionalRepairs: functionalRepair.repairs,
        architecture,
        backendContract,
        fullStackCertification,
        issues: [{
          code: "FULL_STACK_CERTIFICATION_REQUIRED",
          message: fullStackCertification.status === "failed"
            ? "The exact preview build failed full-stack runtime certification. Fix the reported runtime failures and certify a new preview before publishing."
            : "This backend-enabled build must pass full-stack runtime certification on an isolated preview before production publishing is allowed.",
        }],
      }, { status: 422 });
    }

    let draftRepairPersisted = false;
    let repairedDraftRevision: number | undefined;
    if (functionalRepair.repaired) {
      if (!usesSupabaseDraftStore()) {
        return Response.json({
          ok: false,
          code: "DRAFT_REPAIR_PERSISTENCE_UNAVAILABLE",
          functionalRepairs: functionalRepair.repairs,
          issues: [{ code: "DRAFT_REPAIR_PERSISTENCE_UNAVAILABLE", message: "MiCirql repaired the site safely, but the repaired draft cannot be persisted in the current draft-store mode. Publishing was stopped to prevent editor/live divergence." }],
        }, { status: 503 });
      }
      const currentDraft = await getSupabaseDraft(request, publishSite.workspaceId, publishSite.siteId);
      if (!currentDraft) {
        return Response.json({
          ok: false,
          code: "DRAFT_SYNC_REQUIRED",
          functionalRepairs: functionalRepair.repairs,
          issues: [{ code: "DRAFT_SYNC_REQUIRED", message: "The saved draft could not be reloaded before applying publish repairs. Publishing was stopped to protect the editor state." }],
        }, { status: 409 });
      }
      const syncAssessment = assessPublishRepairSync(parsed.data, currentDraft.snapshot, currentDraft.revision);
      if (!syncAssessment.ok) {
        return Response.json({
          ok: false,
          code: syncAssessment.code,
          functionalRepairs: functionalRepair.repairs,
          issues: [{ code: syncAssessment.code, message: syncAssessment.message }],
        }, { status: 409 });
      }
      try {
        const savedRepair = await saveSupabaseDraft(request, {
          snapshot: publishSite,
          expectedRevision: syncAssessment.expectedRevision,
          updatedBy: body.createdBy?.trim() || "workspace-user",
        });
        draftRepairPersisted = true;
        repairedDraftRevision = savedRepair.revision;
      } catch (error) {
        return Response.json({
          ok: false,
          code: "DRAFT_REPAIR_SYNC_FAILED",
          functionalRepairs: functionalRepair.repairs,
          issues: [{ code: "DRAFT_REPAIR_SYNC_FAILED", message: error instanceof Error && error.message === "REVISION_CONFLICT" ? "The draft changed while MiCirql was applying safe publish repairs. Reload the latest version and publish again." : "MiCirql could not save its safe publish repairs, so publishing was stopped to prevent editor/live divergence." }],
        }, { status: error instanceof Error && error.message === "REVISION_CONFLICT" ? 409 : 500 });
      }
    }

    const runtime = getPublishRuntime();
    if (!runtime) {
      return Response.json({ ok: false, functionalRepairs: functionalRepair.repairs, draftRepairPersisted, repairedDraftRevision, issues: [{ code: "PUBLISH_RUNTIME_NOT_CONFIGURED", message: "Production publishing adapters are not configured yet." }] }, { status: 503 });
    }

    const result = await runtime.publish({ site: publishSite, createdBy: body.createdBy?.trim() || "workspace-user" });
    return Response.json({
      ...result,
      readiness,
      contentQuality,
      grounding,
      architecture,
      backendContract,
      fullStackCertification,
      functionalRepairs: functionalRepair.repairs,
      repairedSite: functionalRepair.repaired ? publishSite : undefined,
      draftRepairPersisted,
      repairedDraftRevision,
    }, { status: result.ok ? 201 : 422 });
  } catch (error) {
    return Response.json({ ok: false, issues: [{ code: "PUBLISH_FAILED", message: error instanceof Error ? error.message : "Publish failed." }] }, { status: 500 });
  }
}

function cleanArray(value: unknown) { return Array.isArray(value) ? [...new Set(value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean))].slice(0, 48) : []; }

function inferFunctionalCapabilities(site: Site, facts: GroundingFacts) {
  const text = [
    site.subtype,
    site.name,
    ...site.pages.flatMap((page) => page.sections.flatMap((section) => [section.id, section.component.componentId, ...Object.values(section.bindings).map((binding) => binding.actionId)])),
    ...facts.goals,
    ...facts.services,
    facts.notes,
  ].filter(Boolean).join(" ").toLowerCase();
  const capabilities: string[] = [];
  if (/book|booking|appointment|schedule|reserve/.test(text)) capabilities.push("booking");
  if (/login|sign.?in|account|portal|dashboard|admin/.test(text)) capabilities.push("auth", "admin");
  if (/payment|checkout|subscription|billing|razorpay|stripe/.test(text)) capabilities.push("payments");
  if (/upload|file|document|photo|image|x.?ray/.test(text)) capabilities.push("uploads");
  if (/search|filter|listing|catalog|property|directory/.test(text)) capabilities.push("search");
  return [...new Set(capabilities)];
}

function inferArchetype(site: Site): string {
  const text = `${site.subtype ?? ""} ${site.name}`.toLowerCase();
  if (/dental|clinic|medical|health|physio|diagnostic/.test(text)) return "healthcare-clinic";
  if (/restaurant|cafe|hotel|resort|hospitality/.test(text)) return "hospitality";
  if (/real estate|property|builder|broker/.test(text)) return "real-estate";
  if (/ecommerce|e-commerce|retail|store|shop|boutique/.test(text)) return "ecommerce";
  if (/saas|software|technology|tech|app|platform/.test(text)) return "saas-technology";
  if (/portfolio|creative|design|architect|photograph|studio/.test(text)) return "portfolio-creative";
  if (/education|training|academy|course|school|tutor/.test(text)) return "education-training";
  if (/manufactur|industrial|enterprise|corporate/.test(text)) return "corporate-company";
  if (/consult|legal|law|account|agency|professional|it service/.test(text)) return "professional-services";
  return "local-service";
}