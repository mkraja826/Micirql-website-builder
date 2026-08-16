import { NextRequest, NextResponse } from "next/server";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import { buildContentEnrichmentContract, industryPlannerContext } from "@micirql/design-engine";
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
    const query = new URLSearchParams({ workspace_id: `eq.${workspaceId}`, site_id: `eq.${siteId}`, select: "*", limit: "1" });
    const response = await fetch(`${url}/rest/v1/business_onboarding_profiles?${query}`, { headers: headers(request), cache: "no-store" });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json() as unknown[];
    return NextResponse.json({ completed: Boolean((rows[0] as any)?.completed_at), profile: rows[0] ?? null });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const workspaceId = string(body.workspaceId);
    const siteId = string(body.siteId);
    const businessName = string(body.businessName);
    const industry = string(body.industry);
    if (!workspaceId || !siteId || !businessName || !industry) return NextResponse.json({ error: "workspaceId, siteId, businessName and industry are required" }, { status: 400 });

    const authorization = auth(request);
    const { url, key } = config();
    const commonHeaders = { apikey: key, authorization, "content-type": "application/json" };
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: commonHeaders, cache: "no-store" });
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
    const logoUrl = optionalString(body.logoUrl);
    const brandColors = hexArray(body.brandColors);
    const industryContext = industryPlannerContext(industry, subindustry ?? undefined);

    const aiResponse = await fetch(`${url}/functions/v1/ai-plan-site`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        workspace_id: workspaceId,
        site_id: siteId,
        business_name: businessName,
        industry,
        subindustry,
        location,
        services,
        goals,
        style_tags: styleTags,
        required_capabilities: requiredCapabilities,
        languages,
        notes,
        brand_colors: brandColors,
        industry_context: industryContext,
      }),
    });
    if (!aiResponse.ok) throw await remoteError(aiResponse);
    const advice = await aiResponse.json() as {
      industry: string;
      subindustry: string | null;
      styleTags: string[];
      requiredCapabilities: string[];
      goals: string[];
      brandColors: string[];
      source: "ai" | "deterministic";
      warning?: string | null;
      provider?: string | null;
      model?: string | null;
      usage?: { inputTokens?: number; outputTokens?: number };
    };

    const requestPayload = {
      workspace_id: workspaceId,
      site_id: siteId,
      industry: advice.industry,
      subindustry: advice.subindustry,
      style_tags: advice.styleTags,
      required_capabilities: advice.requiredCapabilities,
      goals: advice.goals,
      industry_context: industryContext,
    };

    const planResponse = await fetch(`${url}/functions/v1/plan-site`, { method: "POST", headers: commonHeaders, body: JSON.stringify(requestPayload) });
    if (!planResponse.ok) throw await remoteError(planResponse);
    const plan = await planResponse.json() as { plan_id?: string; blueprint?: unknown };
    if (!plan.plan_id) throw new Error("Planner did not return a plan ID.");

    const buildResponse = await fetch(`${url}/functions/v1/build-site`, { method: "POST", headers: commonHeaders, body: JSON.stringify({ plan_id: plan.plan_id, site_id: siteId }) });
    if (!buildResponse.ok) throw await remoteError(buildResponse);
    const buildPayload = await buildResponse.json() as { build?: any };
    const build = buildPayload.build;
    const buildId = typeof build === "object" && build ? (build.id ?? build.build_id ?? null) : null;
    const brief = { businessName, industry, subindustry, location, services, goals, styleTags, requiredCapabilities, languages, notes, logoUrl, brandColors: advice.brandColors, industryContext };

    let content: unknown = null;
    let contentWarning: string | null = null;
    try {
      const builtDraft = await getSupabaseDraft(request, workspaceId, siteId);
      if (!builtDraft) throw new Error("Generated draft could not be loaded for page-specific content enrichment.");
      const pageContentContract = buildContentEnrichmentContract(builtDraft.snapshot);
      const contentResponse = await fetch(`${url}/functions/v1/enrich-site-content`, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({
          workspace_id: workspaceId,
          site_id: siteId,
          build_id: buildId,
          brief,
          page_content_contract: pageContentContract,
          content_policy: {
            mode: "content-only",
            preserve_page_paths: true,
            preserve_section_order: true,
            preserve_component_ids: true,
            preserve_design_props: true,
            preserve_media_props: true,
            preserve_bindings: true,
            forbid_unsupplied_claims: true,
          },
        }),
      });
      if (!contentResponse.ok) throw await remoteError(contentResponse);
      content = await contentResponse.json();
    } catch (error) {
      contentWarning = error instanceof Error ? error.message : "Content enrichment failed.";
      console.error("MiCirql content enrichment failed; continuing with structural draft.", error);
    }

    // MiCirql keeps media deterministic and placeholder-first. Real photos are uploaded by the user later.
    const images = { mode: "placeholders", generated: false } as const;
    const imageWarning: string | null = null;

    const recommendationProfile = { industry, subindustry, services, goals, style_tags: styleTags, required_capabilities: requiredCapabilities };
    const topRecommendation = rankPresets(recommendationProfile)[0];
    let initialPreset: { id: string; name: string; reasons: string[] } | null = null;
    let presetWarning: string | null = null;
    if (topRecommendation) {
      try {
        const current = await getSupabaseDraft(request, workspaceId, siteId);
        if (!current) throw new Error("Generated draft could not be loaded for design preset application.");
        const preset = topRecommendation.preset;
        const nextSnapshot = structuredClone(current.snapshot);
        nextSnapshot.theme = structuredClone(preset.theme);
        const [primary, accent, secondary, surface, border] = advice.brandColors;
        if (primary || accent || secondary || surface || border) {
          nextSnapshot.theme.brand.colors = {
            ...nextSnapshot.theme.brand.colors,
            ...(primary ? { primary } : {}),
            ...(accent ? { accent } : {}),
            ...(secondary ? { secondary, textPrimary: secondary } : {}),
            ...(surface ? { surface } : {}),
            ...(border ? { border } : {}),
          };
        }
        for (const page of nextSnapshot.pages) {
          for (const section of page.sections) {
            const family = sectionFamilyFromComponentId(section.component.componentId);
            if (!family) continue;
            const variant = preset.variants[family] ?? sectionVariantFromComponentId(section.component.componentId);
            section.component = { componentId: sectionDesignId(preset.theme.family, family, variant), version: section.component.version };
          }
        }
        await saveSupabaseDraft(request, { snapshot: nextSnapshot, expectedRevision: current.revision });
        initialPreset = { id: preset.id, name: preset.name, reasons: topRecommendation.reasons };
      } catch (error) {
        presetWarning = error instanceof Error ? error.message : "Initial design preset could not be applied.";
        console.error("MiCirql initial preset application failed; continuing with generated draft.", error);
      }
    }

    const profile = { workspace_id: workspaceId, site_id: siteId, created_by: user.id, business_name: businessName, industry, subindustry, location, services, goals, style_tags: styleTags, required_capabilities: requiredCapabilities, languages, notes, logo_url: logoUrl, brand_colors: advice.brandColors, plan_id: plan.plan_id, build_id: buildId, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const profileResponse = await fetch(`${url}/rest/v1/business_onboarding_profiles?on_conflict=workspace_id,site_id`, { method: "POST", headers: { ...commonHeaders, Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(profile) });
    if (!profileResponse.ok) throw await remoteError(profileResponse);
    const savedProfiles = await profileResponse.json() as unknown[];

    return NextResponse.json({
      ok: true,
      planId: plan.plan_id,
      build,
      blueprint: plan.blueprint,
      industryContext,
      planningSource: advice.source,
      planningProvider: advice.provider ?? null,
      planningModel: advice.model ?? null,
      planningUsage: advice.usage ?? null,
      planningWarning: advice.warning ?? null,
      brandPalette: advice.brandColors,
      content,
      contentWarning,
      images,
      imageWarning,
      initialPreset,
      presetWarning,
      profile: savedProfiles[0] ?? profile,
    });
  } catch (error) { return errorResponse(error); }
}

function sectionFamilyFromComponentId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function sectionVariantFromComponentId(componentId: string): SectionVariant {
  const match = componentId.match(/-(00[1-5])$/);
  const value = match ? Number(match[1]) : 1;
  return value >= 1 && value <= 5 ? value as SectionVariant : 1;
}

function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalString(value: unknown) { const valueString = string(value); return valueString || null; }
function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(string).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
function hexArray(value: unknown) {
  return stringArray(value).filter((item) => /^#[0-9a-f]{6}$/i.test(item)).slice(0, 5);
}
async function remoteError(response: Response) {
  const body = await response.text();
  const error = new Error(body || `Remote request failed (${response.status}).`) as Error & { status?: number };
  error.status = response.status;
  return error;
}
function errorResponse(error: unknown) {
  const status = (error as Error & { status?: number }).status ?? 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Onboarding failed." }, { status });
}
