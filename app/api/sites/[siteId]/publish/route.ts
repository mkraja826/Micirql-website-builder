import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SupabaseSitePersistenceRepository } from "../../../../../src/core/persistence/supabase";

export const dynamic = "force-dynamic";

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

async function authorize(request: Request) {
  const token = bearerToken(request);
  if (!token) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { response: NextResponse.json({ error: "Publication service unavailable" }, { status: 503 }) } as const;
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      const status = error && typeof error.status === "number" && error.status >= 500 ? 503 : 401;
      return {
        response: NextResponse.json(
          { error: status === 503 ? "Authentication service unavailable" : "Unauthorized" },
          { status },
        ),
      } as const;
    }
    return { client, userId: data.user.id } as const;
  } catch {
    return {
      response: NextResponse.json({ error: "Authentication service unavailable" }, { status: 503 }),
    } as const;
  }
}

function isDefinitivePublicationRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return [
    "authenticated actor mismatch",
    "site not found or actor is not a workspace member",
    "publication version does not belong to site",
    "publication version is not publishable",
  ].some((reason) => message.includes(reason));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  const { siteId } = await context.params;
  const requestedVersionId = new URL(request.url).searchParams.get("versionId")?.trim() ?? "";
  if (!siteId.trim() || !requestedVersionId) {
    return NextResponse.json({ error: "siteId and versionId are required" }, { status: 400 });
  }

  try {
    const repository = new SupabaseSitePersistenceRepository(auth.client);
    const published = await repository.loadPublished({ siteId });
    if (!published) {
      return NextResponse.json({
        state: "not_published",
        requestedVersionId,
        publishedVersionId: null,
        matchesRequestedVersion: false,
      });
    }

    return NextResponse.json({
      state: published.versionId === requestedVersionId ? "requested_version_published" : "different_version_published",
      requestedVersionId,
      publishedVersionId: published.versionId,
      matchesRequestedVersion: published.versionId === requestedVersionId,
    });
  } catch {
    return NextResponse.json({ error: "Unable to reconcile publication state" }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const versionId = typeof body === "object" && body !== null && "versionId" in body
    ? String((body as { versionId?: unknown }).versionId ?? "").trim()
    : "";
  const { siteId } = await context.params;
  if (!siteId.trim() || !versionId) {
    return NextResponse.json({ error: "siteId and versionId are required" }, { status: 400 });
  }

  try {
    const repository = new SupabaseSitePersistenceRepository(auth.client);
    const transition = await repository.setPublishedVersion({
      siteId,
      versionId,
      actorId: auth.userId,
    });
    return NextResponse.json(transition, { status: 200 });
  } catch (error) {
    if (isDefinitivePublicationRejection(error)) {
      return NextResponse.json({ error: "Publication was rejected for this site or version." }, { status: 403 });
    }

    const recoveryUrl = new URL(request.url);
    recoveryUrl.search = new URLSearchParams({ versionId }).toString();
    return NextResponse.json({
      error: "Publication outcome is uncertain. Reconcile the active revision before retrying.",
      outcome: "unknown",
      recoveryUrl: recoveryUrl.toString(),
    }, { status: 503 });
  }
}
