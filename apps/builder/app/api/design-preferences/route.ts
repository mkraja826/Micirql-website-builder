import { NextRequest, NextResponse } from "next/server";
import { buildDesignPreferenceProfile, type PreferenceSignal } from "@micirql/design-engine";

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
    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    const { url, key } = config();
    const auth = authorization(request);

    // Workspace-wide learning lets future sites benefit from prior explicit choices.
    // siteId is returned for observability but does not restrict the learned profile.
    const query = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      select: "signal_type,direction_signature,theme_family,density,shape,motion,typography_display,typography_body,metadata,created_at",
      order: "created_at.desc",
      limit: "250",
    });
    const response = await fetch(`${url}/rest/v1/design_preference_signals?${query}`, {
      headers: { apikey: key, authorization: auth },
      cache: "no-store",
    });
    if (!response.ok) throw await remoteError(response);
    const rows = await response.json() as SignalRow[];
    const signals = rows.map(toPreferenceSignal).filter((signal): signal is PreferenceSignal => Boolean(signal));
    const profile = buildDesignPreferenceProfile(signals);
    return NextResponse.json({ profile, signalCount: signals.length, workspaceId, siteId: siteId || null });
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

type SignalRow = {
  signal_type?: string | null;
  direction_signature?: string | null;
  theme_family?: string | null;
  density?: string | null;
  shape?: string | null;
  motion?: string | null;
  typography_display?: string | null;
  typography_body?: string | null;
  metadata?: Record<string, unknown> | null;
};

function toPreferenceSignal(row: SignalRow): PreferenceSignal | undefined {
  const signalType = row.signal_type;
  if (!signalType || !SIGNALS.has(signalType)) return undefined;
  const metadataFingerprint = row.metadata?.fingerprint;
  const fingerprint = metadataFingerprint && typeof metadataFingerprint === "object"
    ? metadataFingerprint as PreferenceSignal["fingerprint"]
    : signatureFingerprint(row.direction_signature);
  return {
    signalType: signalType as PreferenceSignal["signalType"],
    fingerprint,
    themeFamily: row.theme_family,
    density: row.density,
    shape: row.shape,
    typography: [row.typography_display, row.typography_body].filter(Boolean).join("|") || null,
  };
}

function signatureFingerprint(signature?: string | null): PreferenceSignal["fingerprint"] {
  if (!signature) return undefined;
  const parts = signature.split("|").filter(Boolean);
  return parts.length > 4 ? { structure: parts.slice(4).join("|") } : undefined;
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
