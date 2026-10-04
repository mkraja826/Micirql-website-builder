import { NextRequest, NextResponse } from "next/server";
import { siteSchema } from "@micirql/schema";
import { adviseOnboardingPlan } from "../../ai-planning";
import { provenanceForBrandInput } from "../../brand-provenance";
import { createDentalStructuralScaffold } from "../../dental-scaffold";
import { DENTAL_CATALOG_VERSION, DESIGN_REVIEW_COUNT } from "../../industry-design-preset-data";
import { resolveOnboardingStatus } from "../../onboarding-status";
import { rankPresets } from "../../preset-ranking";
import { getSupabaseDraft, saveSupabaseDraft } from "../drafts/supabase-store";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  return { url, key };
}

function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    const error = new Error("AUTH_REQUIRED") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return authorization;
}

function headers(request: NextRequest) {
  const { key } = config();
  return { apikey: key, authorization: auth(request), "content-type": "application/json" };
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });
    const { url } = config();
    const query = new URLSearchParams({ workspace_id: "eq." + workspaceId, site_id: "eq." + siteId, select: "*", limit: "1" });
    const response = await fetch(url + "/rest/v1/business_onboarding_profiles?" + query, { headers: headers(request), cache: "no-store" });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json() as unknown[];
    const profile = rows[0] as { completed_at?: unknown } | undefined;
    const draft = await getSupabaseDraft(request, workspaceId, siteId);
    const generation = draft?.snapshot.generation;
    const { completed, reviewPending } = resolveOnboardingStatus(
      Boolean(profile?.completed_at),
      generation,
    );
    return NextResponse.json({
      completed,
      reviewPending,
      packStatus: generation?.packStatus ?? null,
      catalogVersion: generation?.catalogVersion ?? null,
      candidateCount: generation?.candidateIds.length ?? 0,
      profile: profile ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const workspaceId = string(body.workspaceId);
    const siteId = string(body.siteId);
    const businessName = string(body.businessName);
    const industry = string(body.industry);
    if (!workspaceId || !siteId || !businessName || !industry) {
      return NextResponse.json({ error: "workspaceId, siteId, businessName and industry are required" }, { status: 400 });
    }

    const authorization = auth(request);
    const { url, key } = config();
    const commonHeaders = { apikey: key, authorization, "content-type": "application/json" };
    const userResponse = await fetch(url + "/auth/v1/user", { headers: commonHeaders, cache: "no-store" });
    if (!userResponse.ok) throw await remoteError(userResponse);
    const user = await userResponse.json() as { id?: string };
    if (!user.id) throw new Error("Authenticated user could not be resolved.");

    const services = stringArray(body.services);
    const goals = stringArray(body.goals);
    const styleTags = stringArray(body.styleTags);
    const requiredCapabilities = stringArray(body.requiredCapabilities);
    const languageValues = stringArray(body.languages);
    const languages = languageValues.length ? languageValues : ["en"];
    const subindustry = optionalString(body.subindustry);
    const location = optionalString(body.location);
    const notes = optionalString(body.notes);
    const recommendationProfile = {
      industry,
      subindustry,
      services,
      goals,
      style_tags: styleTags,
      required_capabilities: requiredCapabilities,
      notes,
    };
    const ranked = rankPresets(recommendationProfile);
    if (ranked.length !== DESIGN_REVIEW_COUNT) {
      return NextResponse.json({
        error: "INDUSTRY_PACK_NOT_CERTIFIED",
        code: "INDUSTRY_PACK_NOT_CERTIFIED",
        message: "This industry pack is not yet certified. MiCirql will not substitute dental or another industry design.",
        industry,
      }, { status: 422 });
    }

    const { input: brandInput, provenance: brandProvenance } = provenanceForBrandInput(body.brandInput);
    const advice = await adviseOnboardingPlan({
      businessName,
      industry,
      subindustry,
      location,
      services,
      goals,
      styleTags,
      requiredCapabilities,
      languages,
      notes,
    });
    const requestPayload = {
      workspace_id: workspaceId,
      site_id: siteId,
      business_name: businessName,
      industry: advice.industry,
      subindustry: advice.subindustry,
      location,
      services,
      notes,
      style_tags: advice.styleTags,
      required_capabilities: advice.requiredCapabilities,
      goals: advice.goals,
    };

    const planResponse = await fetch(url + "/functions/v1/plan-site", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify(requestPayload),
    });
    if (!planResponse.ok) throw await remoteError(planResponse);
    const plan = await planResponse.json() as { plan_id?: string; blueprint?: unknown };
    if (!plan.plan_id) throw new Error("Planner did not return a plan ID.");

    const buildResponse = await fetch(url + "/functions/v1/build-site", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ plan_id: plan.plan_id, site_id: siteId }),
    });
    if (!buildResponse.ok) throw await remoteError(buildResponse);
    const buildPayload = await buildResponse.json() as { build?: Record<string, unknown> | null };
    const build = buildPayload.build;
    const buildId = build ? string(build.id ?? build.build_id) || null : null;

    const current = await getSupabaseDraft(request, workspaceId, siteId);
    if (!current) throw new Error("Generated structural draft could not be loaded.");
    const scaffold = createDentalStructuralScaffold(
      current.snapshot,
      { businessName, location, services, goals, languages, notes },
      brandInput,
      brandProvenance,
    );
    scaffold.generation = {
      catalogVersion: DENTAL_CATALOG_VERSION,
      packStatus: "certified",
      candidateIds: ranked.map((item) => item.preset.id),
      ...(brandInput ? { brandInput } : {}),
      ...(brandProvenance ? { brandProvenance } : {}),
    };
    const parsedScaffold = siteSchema.parse(scaffold);
    const savedDraft = await saveSupabaseDraft(request, {
      snapshot: parsedScaffold,
      expectedRevision: current.revision,
      updatedBy: user.id,
    });

    const profile = {
      workspace_id: workspaceId,
      site_id: siteId,
      created_by: user.id,
      business_name: businessName,
      industry,
      subindustry: subindustry || "dental",
      location,
      services,
      goals,
      style_tags: styleTags,
      required_capabilities: requiredCapabilities,
      languages,
      notes,
      plan_id: plan.plan_id,
      build_id: buildId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const profileResponse = await fetch(url + "/rest/v1/business_onboarding_profiles?on_conflict=workspace_id,site_id", {
      method: "POST",
      headers: { ...commonHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(profile),
    });
    if (!profileResponse.ok) throw await remoteError(profileResponse);
    const savedProfiles = await profileResponse.json() as unknown[];

    return NextResponse.json({
      ok: true,
      planId: plan.plan_id,
      build,
      blueprint: plan.blueprint,
      planningSource: advice.source,
      planningWarning: advice.warning ?? null,
      content: null,
      images: null,
      contentDeferredUntilSelection: true,
      catalogVersion: DENTAL_CATALOG_VERSION,
      candidateCount: ranked.length,
      draft: savedDraft,
      qualityWarnings: [],
      profile: savedProfiles[0] ?? profile,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function string(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const valueString = string(value);
  return valueString || null;
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(string).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

async function remoteError(response: Response) {
  const body = await response.text();
  const error = new Error(body || "Remote request failed (" + response.status + ").") as Error & { status?: number };
  error.status = response.status;
  return error;
}

function errorResponse(error: unknown) {
  const status = (error as Error & { status?: number }).status ?? 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Onboarding failed." }, { status });
}
