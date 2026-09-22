import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  emitOperationalEvent,
  getOperationalRequestId,
} from "../../../../src/core/observability/operational-events";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 16 * 1024;

function reply(requestId: string, body: unknown, status: number, retryAfterSeconds?: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "x-request-id": requestId,
      ...(retryAfterSeconds ? { "retry-after": String(retryAfterSeconds) } : {}),
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function record(
  requestId: string,
  startedAt: number,
  outcome: "success" | "rejected" | "failure",
  statusCode: number,
  failureCode?: "invalid_request" | "request_rate_limited" | "request_submission_failed" | "service_unavailable",
  siteId?: string,
) {
  emitOperationalEvent({
    requestId,
    operation: "site_action.submit",
    outcome,
    statusCode,
    durationMs: Date.now() - startedAt,
    siteId,
    failureCode,
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getOperationalRequestId(request.headers);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    record(requestId, startedAt, "rejected", 413, "invalid_request");
    return reply(requestId, { error: "Request payload is too large." }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    record(requestId, startedAt, "rejected", 400, "invalid_request");
    return reply(requestId, { error: "Invalid request body." }, 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    record(requestId, startedAt, "rejected", 413, "invalid_request");
    return reply(requestId, { error: "Request payload is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    record(requestId, startedAt, "rejected", 400, "invalid_request");
    return reply(requestId, { error: "Invalid JSON body." }, 400);
  }
  if (!isRecord(body)) {
    record(requestId, startedAt, "rejected", 400, "invalid_request");
    return reply(requestId, { error: "Invalid request." }, 400);
  }

  const siteId = typeof body.siteId === "string" ? body.siteId : undefined;
  const actionId = body.actionId;
  const actionVersion = body.actionVersion;
  const submissionId = body.requestId;
  const name = body.name;
  const email = body.email;
  const phone = body.phone;
  const message = body.message;
  const fields = body.fields;
  const consent = body.consent;
  const sourcePage = body.sourcePage;

  if (
    !siteId || !/^[0-9a-f-]{36}$/i.test(siteId)
    || !boundedString(actionId, 128) || !actionId.trim()
    || !boundedString(actionVersion, 64) || !actionVersion.trim()
    || !boundedString(submissionId, 128) || submissionId.trim().length < 8
    || !boundedString(name, 120) || !name.trim()
    || (email !== undefined && !boundedString(email, 254))
    || (phone !== undefined && !boundedString(phone, 32))
    || (message !== undefined && !boundedString(message, 4000))
    || (sourcePage !== undefined && !boundedString(sourcePage, 512))
    || (fields !== undefined && !isRecord(fields))
    || consent !== true
    || (!(typeof email === "string" && email.trim()) && !(typeof phone === "string" && phone.trim()))
  ) {
    record(requestId, startedAt, "rejected", 400, "invalid_request", siteId);
    return reply(requestId, { error: "Request details are invalid." }, 400);
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    record(requestId, startedAt, "failure", 503, "service_unavailable", siteId);
    return reply(requestId, { error: "Request service unavailable." }, 503);
  }

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc("submit_site_action", {
      p_site_id: siteId,
      p_action_id: actionId.trim(),
      p_action_version: actionVersion.trim(),
      p_request_id: submissionId.trim(),
      p_name: name.trim(),
      p_email: typeof email === "string" ? email.trim() || null : null,
      p_phone: typeof phone === "string" ? phone.trim() || null : null,
      p_message: typeof message === "string" ? message.trim() || null : null,
      p_fields: fields ?? {},
      p_consent: true,
      p_source_page: typeof sourcePage === "string" ? sourcePage.trim() || null : null,
    });

    if (error) {
      if (error.code === "P0001" && error.message.includes("rate limit exceeded")) {
        record(requestId, startedAt, "rejected", 429, "request_rate_limited", siteId);
        return reply(requestId, { error: "Too many requests. Please try again later." }, 429, 3600);
      }
      record(requestId, startedAt, "rejected", 400, "invalid_request", siteId);
      return reply(requestId, { error: "Request could not be accepted." }, 400);
    }

    if (!isRecord(data) || data.accepted !== true || data.semantics !== "request_only") {
      record(requestId, startedAt, "failure", 503, "request_submission_failed", siteId);
      return reply(requestId, { error: "Request service unavailable." }, 503);
    }

    record(requestId, startedAt, "success", 200, undefined, siteId);
    return reply(requestId, data, 200);
  } catch {
    record(requestId, startedAt, "failure", 503, "request_submission_failed", siteId);
    return reply(requestId, { error: "Request service unavailable." }, 503);
  }
}
