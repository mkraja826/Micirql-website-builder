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

export async function POST(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Publication service unavailable" }, { status: 503 });
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const repository = new SupabaseSitePersistenceRepository(client);
    const transition = await repository.setPublishedVersion({
      siteId,
      versionId,
      actorId: userData.user.id,
    });
    return NextResponse.json(transition, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publication transition failed";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
