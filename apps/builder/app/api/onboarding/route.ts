import { NextRequest, NextResponse } from "next/server";

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
    const query = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      site_id: `eq.${siteId}`,
      select: "*",
      limit: "1",
    });
    const response = await fetch(`${url}/rest/v1/business_onboarding_profiles?${query}`, { headers: headers(request), cache: "no-store" });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json() as unknown[];
    return NextResponse.json({ completed: Boolean((rows[0] as any)?.completed_at), profile: rows[0] ?? null });
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

    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: commonHeaders, cache: "no-store" });
    if (!userResponse.ok) throw await remoteError(userResponse);
    const user = await userResponse.json() as { id?: string };
    if (!user.id) throw new Error("Authenticated user could not be resolved.");

    const requestPayload = {
      workspace_id: workspaceId,
      site_id: siteId,
      industry,
      subindustry: optionalString(body.subindustry),
      style_tags: stringArray(body.styleTags),
      required_capabilities: stringArray(body.requiredCapabilities),
      goals: stringArray(body.goals),
    };

    const planResponse = await fetch(`${url}/functions/v1/plan-site`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify(requestPayload),
    });
    if (!planResponse.ok) throw await remoteError(planResponse);
    const plan = await planResponse.json() as { plan_id?: string; blueprint?: unknown };
    if (!plan.plan_id) throw new Error("Planner did not return a plan ID.");

    const buildResponse = await fetch(`${url}/functions/v1/build-site`, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ plan_id: plan.plan_id, site_id: siteId }),
    });
    if (!buildResponse.ok) throw await remoteError(buildResponse);
    const buildPayload = await buildResponse.json() as { build?: any };
    const build = buildPayload.build;
    const buildId = typeof build === "object" && build ? (build.id ?? build.build_id ?? null) : null;

    const profile = {
      workspace_id: workspaceId,
      site_id: siteId,
      created_by: user.id,
      business_name: businessName,
      industry,
      subindustry: optionalString(body.subindustry),
      location: optionalString(body.location),
      services: stringArray(body.services),
      goals: stringArray(body.goals),
      style_tags: stringArray(body.styleTags),
      required_capabilities: stringArray(body.requiredCapabilities),
      languages: stringArray(body.languages).length ? stringArray(body.languages) : ["en"],
      notes: optionalString(body.notes),
      plan_id: plan.plan_id,
      build_id: buildId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const profileResponse = await fetch(`${url}/rest/v1/business_onboarding_profiles?on_conflict=workspace_id,site_id`, {
      method: "POST",
      headers: { ...commonHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(profile),
    });
    if (!profileResponse.ok) throw await remoteError(profileResponse);
    const savedProfiles = await profileResponse.json() as unknown[];

    return NextResponse.json({ ok: true, planId: plan.plan_id, build, blueprint: plan.blueprint, profile: savedProfiles[0] ?? profile });
  } catch (error) {
    return errorResponse(error);
  }
}

function string(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalString(value: unknown) { const valueString = string(value); return valueString || null; }
function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(string).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
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
