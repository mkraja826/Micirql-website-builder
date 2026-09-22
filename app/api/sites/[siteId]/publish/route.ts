import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  emitOperationalEvent,
  getOperationalRequestId,
  type OperationalFailureCode,
  type OperationalOperation,
  type OperationalOutcome,
} from "../../../../../src/core/observability/operational-events";
import { SupabaseSitePersistenceRepository } from "../../../../../src/core/persistence/supabase";

export const dynamic = "force-dynamic";

type EventContext = {
  requestId: string;
  operation: OperationalOperation;
  startedAt: number;
  siteId?: string;
};

function record(
  context: EventContext,
  outcome: OperationalOutcome,
  details: {
    statusCode: number;
    failureCode?: OperationalFailureCode;
    versionId?: string;
    previousVersionId?: string | null;
  },
) {
  emitOperationalEvent({
    requestId: context.requestId,
    operation: context.operation,
    outcome,
    durationMs: Date.now() - context.startedAt,
    siteId: context.siteId,
    ...details,
  });
}

function reply(requestId: string, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  });
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

async function authorize(request: Request, context: EventContext) {
  const token = bearerToken(request);
  if (!token) {
    record(context, "rejected", { statusCode: 401, failureCode: "auth_rejected" });
    return { response: reply(context.requestId, { error: "Unauthorized" }, 401) } as const;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    record(context, "failure", { statusCode: 503, failureCode: "service_unavailable" });
    return { response: reply(context.requestId, { error: "Publication service unavailable" }, 503) } as const;
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      const status = error && typeof error.status === "number" && error.status >= 400 && error.status < 500 ? 401 : 503;
      record(context, status === 401 ? "rejected" : "failure", {
        statusCode: status,
        failureCode: status === 401 ? "auth_rejected" : "service_unavailable",
      });
      return {
        response: reply(
          context.requestId,
          { error: status === 503 ? "Authentication service unavailable" : "Unauthorized" },
          status,
        ),
      } as const;
    }
    return { client, userId: data.user.id } as const;
  } catch {
    record(context, "failure", { statusCode: 503, failureCode: "service_unavailable" });
    return {
      response: reply(context.requestId, { error: "Authentication service unavailable" }, 503),
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
  const startedAt = Date.now();
  const requestId = getOperationalRequestId(request.headers);
  const { siteId } = await context.params;
  const eventContext: EventContext = {
    requestId,
    operation: "publication.reconcile",
    startedAt,
    siteId,
  };
  const auth = await authorize(request, eventContext);
  if ("response" in auth) return auth.response;

  const requestedVersionId = new URL(request.url).searchParams.get("versionId")?.trim() ?? "";
  if (!siteId.trim() || !requestedVersionId) {
    record(eventContext, "rejected", { statusCode: 400, failureCode: "invalid_request" });
    return reply(requestId, { error: "siteId and versionId are required" }, 400);
  }

  try {
    const { data: memberships, error: membershipError } = await auth.client
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", auth.userId);
    if (membershipError) throw membershipError;

    const { data: site, error: siteError } = await auth.client
      .from("sites")
      .select("workspace_id")
      .eq("id", siteId)
      .maybeSingle();
    if (siteError) throw siteError;
    if (!site || !memberships?.some((membership) => membership.workspace_id === site.workspace_id)) {
      record(eventContext, "rejected", { statusCode: 404, failureCode: "site_not_found_or_forbidden" });
      return reply(requestId, { error: "Site not found" }, 404);
    }

    const repository = new SupabaseSitePersistenceRepository(auth.client);
    const published = await repository.loadPublished({ siteId });
    if (!published) {
      record(eventContext, "not_found", {
        statusCode: 200,
        versionId: requestedVersionId,
        failureCode: "published_revision_absent",
      });
      return reply(requestId, {
        state: "not_published",
        requestedVersionId,
        publishedVersionId: null,
        matchesRequestedVersion: false,
      });
    }

    const matchesRequestedVersion = published.versionId === requestedVersionId;
    record(eventContext, "success", {
      statusCode: 200,
      versionId: published.versionId,
      previousVersionId: published.publishedVersionId,
    });
    return reply(requestId, {
      state: matchesRequestedVersion ? "requested_version_published" : "different_version_published",
      requestedVersionId,
      publishedVersionId: published.versionId,
      matchesRequestedVersion,
    });
  } catch {
    record(eventContext, "failure", { statusCode: 503, failureCode: "reconciliation_failed" });
    return reply(requestId, { error: "Unable to reconcile publication state" }, 503);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const startedAt = Date.now();
  const requestId = getOperationalRequestId(request.headers);
  const { siteId } = await context.params;
  const eventContext: EventContext = {
    requestId,
    operation: "publication.publish",
    startedAt,
    siteId,
  };
  const auth = await authorize(request, eventContext);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    record(eventContext, "rejected", { statusCode: 400, failureCode: "invalid_request" });
    return reply(requestId, { error: "Invalid JSON body" }, 400);
  }

  const versionId = typeof body === "object" && body !== null && "versionId" in body
    ? String((body as { versionId?: unknown }).versionId ?? "").trim()
    : "";
  if (!siteId.trim() || !versionId) {
    record(eventContext, "rejected", { statusCode: 400, failureCode: "invalid_request" });
    return reply(requestId, { error: "siteId and versionId are required" }, 400);
  }

  try {
    const repository = new SupabaseSitePersistenceRepository(auth.client);
    const transition = await repository.setPublishedVersion({
      siteId,
      versionId,
      actorId: auth.userId,
    });
    record(eventContext, "success", {
      statusCode: 200,
      versionId: transition.publishedVersionId,
      previousVersionId: transition.previousPublishedVersionId,
    });
    return reply(requestId, transition, 200);
  } catch (error) {
    if (isDefinitivePublicationRejection(error)) {
      record(eventContext, "rejected", { statusCode: 403, failureCode: "publication_rejected", versionId });
      return reply(requestId, { error: "Publication was rejected for this site or version." }, 403);
    }

    record(eventContext, "uncertain", { statusCode: 503, failureCode: "publication_outcome_unknown", versionId });
    const recoveryUrl = new URL(request.url);
    recoveryUrl.search = new URLSearchParams({ versionId }).toString();
    return reply(requestId, {
      error: "Publication outcome is uncertain. Reconcile the active revision before retrying.",
      outcome: "unknown",
      recoveryUrl: recoveryUrl.toString(),
    }, 503);
  }
}
