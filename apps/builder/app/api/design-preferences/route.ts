import { NextRequest, NextResponse } from "next/server";

const SIGNALS = new Set(["more_like_this", "compare", "regenerate", "selected"]);

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  return { url, key };
}

function authorization(request: NextRequest) {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) {
    const error = new Error("AUTH_REQUIRED") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId")?.trim();
    const siteId = request.nextUrl.searchParams.get("siteId")?.trim();
    if (!workspaceId || !siteId) return NextResponse.json({ error: "workspaceId and siteId are required" }, { status: 400 });
    const { url, key } = config();
    const auth = authorization(request);
    const query = new URLSearchParams({ workspace_id: `eq.${workspaceId}`, site_id: `eq.${siteId}`, select: "*", limit: "1" });
    const response = await fetch(`${url}/rest/v1/design_preference_profiles?${query}`, {
      headers: { apikey: key, authorization: auth },
      cache: "no-store",
    });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json() as unknown[];
    return NextResponse.json({ profile: rows[0] ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const workspaceId = text(body.workspaceId);
    const siteId = text(body.siteId);
    const signalType = text(body.signalType);
    const directionId = text(body.directionId);
    if (!workspaceId || !siteId || !directionId || !SIGNALS.has(signalType)) {
      return NextResponse.json({ error: "workspaceId, siteId, directionId and a valid signalType are required" }, { status: 400 });
    }

    const { url, key } = config();
    const auth = authorization(request);
    const commonHeaders = { apikey: key, authorization: auth, "content-type": "application/json" };
    const userResponse = await fetch(`${url}/auth/v1/user`, { headers: commonHeaders, cache: "no-store" });
    if (!userResponse.ok) throw await remoteError(userResponse);
    const user = await userResponse.json() as { id?: string };
    if (!user.id) throw new Error("Authenticated user could not be resolved.");

    const payload = {
      workspace_id: workspaceId,
      site_id: siteId,
      user_id: user.id,
      signal_type: signalType,
      direction_id: directionId,
      direction_signature: nullableText(body.directionSignature),
      theme_family: nullableText(body.themeFamily),
      density: nullableText(body.density),
      shape: nullableText(body.shape),
      motion: nullableText(body.motion),
      typography_display: nullableText(body.typographyDisplay),
      typography_body: nullableText(body.typographyBody),
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    };

    const response = await fetch(`${url}/rest/v1/design_preference_signals`, {
      method: "POST",
      headers: { ...commonHeaders, Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw await remoteError(response);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function nullableText(value: unknown) { const result = text(value); return result || null; }
async function remoteError(response: Response) {
  const message = await response.text();
  const error = new Error(message || `Remote request failed (${response.status}).`) as Error & { status?: number };
  error.status = response.status;
  return error;
}
function errorResponse(error: unknown) {
  const status = (error as Error & { status?: number }).status ?? 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Design preference request failed." }, { status });
}
