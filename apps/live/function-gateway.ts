import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  executeFunction,
  nativeFunctionCatalog,
  recordStoreAdapterMap,
  type AuditSink,
  type RateLimiter,
  type RecordStore,
  type StoredFunctionRecord,
} from "@micirql/functions";
import { siteSchema, type Site } from "@micirql/live-runtime";

const MAX_BODY_BYTES = 16 * 1024;
const PUBLIC_GATEWAY_HOSTNAME = "forms.micirql.com";
const TURNSTILE_ACTION = "website_form";
const TURNSTILE_TOKEN_FIELD = "cf-turnstile-response";

type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

type PublicRateLimitInput = {
  key: string;
  kind: "preflight" | "action";
  limit: number;
  windowSeconds: number;
};

type PublishedSite = {
  siteId: string;
  snapshot: Site;
};

export type PublicFunctionDependencies = {
  getPublishedSite(siteId: string): Promise<PublishedSite | undefined>;
  createRecord(
    input: Omit<StoredFunctionRecord, "id" | "createdAt">,
  ): Promise<StoredFunctionRecord>;
  writeAudit(event: Parameters<AuditSink["write"]>[0]): Promise<void>;
  rateLimit(input: PublicRateLimitInput): Promise<boolean>;
  ipHashSalt: string;
  turnstileSiteKey?: string;
  verifyTurnstile?(
    token: string,
    ip: string,
    requestId: string,
  ): Promise<boolean>;
};

export async function handleProductionPublicFunctionRequest(
  request: Request,
  actionId: string,
): Promise<Response> {
  try {
    return await handlePublicFunctionRequest(
      request,
      actionId,
      productionPublicFunctionDependencies(),
    );
  } catch {
    const requestId = globalThis.crypto.randomUUID();
    return resultResponse(
      request,
      {
        ok: false,
        code: "SERVICE_UNAVAILABLE",
        message: "The website action service is temporarily unavailable.",
        requestId,
      },
      503,
    );
  }
}

export async function handlePublicFunctionRequest(
  request: Request,
  actionId: string,
  dependencies: PublicFunctionDependencies,
): Promise<Response> {
  const requestId = globalThis.crypto.randomUUID();
  try {
    if (request.method !== "POST") {
      return resultResponse(
        request,
        {
          ok: false,
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed.",
          requestId,
        },
        405,
      );
    }

    const definition = nativeFunctionCatalog.find(
      (item) => item.id === actionId,
    );
    if (!definition || definition.access !== "public") {
      return resultResponse(
        request,
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Website action not found.",
          requestId,
        },
        404,
      );
    }

    const url = new URL(request.url);
    const hostname = normalizedHostname(url.hostname);
    const siteId =
      hostname === PUBLIC_GATEWAY_HOSTNAME
        ? validSiteId(url.searchParams.get("siteId"))
        : undefined;
    if (!siteId) {
      return resultResponse(
        request,
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Website action not found.",
          requestId,
        },
        404,
      );
    }

    if (!dependencies.ipHashSalt.trim()) {
      throw new PublicFunctionError(
        503,
        "FUNCTION_GATEWAY_NOT_CONFIGURED",
        "The website action service is temporarily unavailable.",
      );
    }
    const turnstileConfigured = Boolean(
      dependencies.turnstileSiteKey && dependencies.verifyTurnstile,
    );
    if (
      Boolean(dependencies.turnstileSiteKey) !==
      Boolean(dependencies.verifyTurnstile)
    ) {
      throw new PublicFunctionError(
        503,
        "FUNCTION_GATEWAY_NOT_CONFIGURED",
        "The website action service is temporarily unavailable.",
      );
    }
    const clientIp = request.headers.get("cf-connecting-ip") ?? "anonymous";
    const preflightIpHash = await hashIp(
      clientIp,
      "preflight",
      dependencies.ipHashSalt,
    );
    const preflightAllowed = await dependencies.rateLimit({
      key: `preflight:${preflightIpHash}`,
      kind: "preflight",
      limit: 20,
      windowSeconds: 60,
    });
    if (!preflightAllowed) {
      return resultResponse(
        request,
        {
          ok: false,
          code: "RATE_LIMITED",
          message: "Too many requests. Please try again later.",
          requestId,
        },
        429,
      );
    }

    const published = await dependencies.getPublishedSite(siteId);
    const parsed = published
      ? siteSchema.safeParse(published.snapshot)
      : undefined;
    if (
      !published ||
      !parsed?.success ||
      published.siteId !== siteId ||
      parsed.data.siteId !== siteId ||
      !siteRegistersAction(parsed.data, actionId)
    ) {
      return resultResponse(
        request,
        {
          ok: false,
          code: "NOT_FOUND",
          message: "Website action not found.",
          requestId,
        },
        404,
      );
    }

    const payload = await parsePayload(request);
    if (typeof payload._website === "string" && payload._website.trim()) {
      return resultResponse(
        request,
        {
          ok: true,
          data: { recordId: "accepted", status: "received" },
          requestId,
        },
        201,
      );
    }
    const formIdempotencyKey = safeIdempotencyKey(
      stringValue(payload._idempotencyKey),
    );
    delete payload._website;
    delete payload.sourcePage;

    if (turnstileConfigured) {
      const token = stringValue(payload[TURNSTILE_TOKEN_FIELD]);
      delete payload[TURNSTILE_TOKEN_FIELD];
      if (!token) {
        if (request.headers.get("accept")?.includes("application/json")) {
          return resultResponse(
            request,
            {
              ok: false,
              code: "TURNSTILE_REQUIRED",
              message: "Please complete the verification challenge.",
              requestId,
            },
            403,
          );
        }
        return turnstileChallengeResponse(
          request,
          actionId,
          siteId,
          payload,
          dependencies.turnstileSiteKey!,
          requestId,
        );
      }

      if (token.length > 2_048) {
        return resultResponse(
          request,
          {
            ok: false,
            code: "TURNSTILE_FAILED",
            message: "Verification failed. Please try again.",
            requestId,
          },
          403,
        );
      }

      const verified = await dependencies.verifyTurnstile!(
        token,
        clientIp,
        requestId,
      );
      if (!verified) {
        return resultResponse(
          request,
          {
            ok: false,
            code: "TURNSTILE_FAILED",
            message: "Verification failed. Please try again.",
            requestId,
          },
          403,
        );
      }
    }

    delete payload._idempotencyKey;

    const ipHash = await hashIp(clientIp, siteId, dependencies.ipHashSalt);
    const rateLimiter: RateLimiter = {
      async consume({ key, limit }) {
        const allowed = await dependencies.rateLimit({
          key,
          kind: "action",
          limit,
          windowSeconds: definition.rateLimit.windowSeconds,
        });
        return { allowed, remaining: allowed ? Math.max(0, limit - 1) : 0 };
      },
    };
    const recordStore: RecordStore = {
      create: dependencies.createRecord,
    };
    const auditSink: AuditSink = {
      async write(event) {
        try {
          await dependencies.writeAudit(event);
        } catch {
          // The private audit stream is best effort; a persisted enquiry remains successful.
        }
      },
    };
    const idempotencyKey =
      safeIdempotencyKey(request.headers.get("idempotency-key")) ??
      formIdempotencyKey;
    const result = await executeFunction(
      {
        definitions: nativeFunctionCatalog,
        adapters: recordStoreAdapterMap(recordStore),
        rateLimiter,
        auditSink,
      },
      {
        actionId,
        payload,
        context: {
          siteId,
          workspaceId: parsed.data.workspaceId,
          actor: { ipHash },
          requestId,
          ...(idempotencyKey ? { idempotencyKey } : {}),
          now: new Date(),
        },
      },
    );
    return resultResponse(request, result, statusForResult(result));
  } catch (error) {
    if (error instanceof PublicFunctionError) {
      return resultResponse(
        request,
        { ok: false, code: error.code, message: error.message, requestId },
        error.status,
      );
    }
    return resultResponse(
      request,
      {
        ok: false,
        code: "SERVICE_UNAVAILABLE",
        message: "The website action service is temporarily unavailable.",
        requestId,
      },
      503,
    );
  }
}

export function productionPublicFunctionDependencies(): PublicFunctionDependencies {
  const supabaseUrl = requiredEnv("MICIRQL_SUPABASE_URL").replace(/\/+$/, "");
  const publishableKey = requiredEnv("MICIRQL_SUPABASE_PUBLISHABLE_KEY");
  const secretKey = requiredEnv("MICIRQL_SUPABASE_SECRET_KEY");
  const ipHashSalt = requiredEnv("MICIRQL_IP_HASH_SALT");
  const turnstileSiteKey = requiredEnv("MICIRQL_TURNSTILE_SITE_KEY");
  const turnstileSecretKey = requiredEnv("MICIRQL_TURNSTILE_SECRET_KEY");
  const { env } = getCloudflareContext() as unknown as {
    env: {
      MICIRQL_PUBLIC_FUNCTION_RATE_LIMITER?: RateLimitBinding;
      MICIRQL_NEWSLETTER_RATE_LIMITER?: RateLimitBinding;
      MICIRQL_PREFLIGHT_RATE_LIMITER?: RateLimitBinding;
    };
  };
  const publicLimiter = env.MICIRQL_PUBLIC_FUNCTION_RATE_LIMITER;
  const newsletterLimiter = env.MICIRQL_NEWSLETTER_RATE_LIMITER;
  const preflightLimiter = env.MICIRQL_PREFLIGHT_RATE_LIMITER;
  if (!publicLimiter || !newsletterLimiter || !preflightLimiter) {
    throw new PublicFunctionError(
      503,
      "RATE_LIMITER_NOT_CONFIGURED",
      "The website action service is temporarily unavailable.",
    );
  }

  const rpc = async <T>(
    name: string,
    body: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: restHeaders(publishableKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        `Public function RPC ${name} failed with ${response.status}.`,
      );
    }
    return (await response.json()) as T;
  };

  return {
    ipHashSalt,
    turnstileSiteKey,
    async getPublishedSite(siteId) {
      const rows = await rpc<Array<{ site_id?: unknown; snapshot?: unknown }>>(
        "get_live_published_site",
        { p_site_id: siteId },
      );
      const row = rows[0];
      const returnedSiteId = stringValue(row?.site_id);
      const snapshot = siteSchema.safeParse(row?.snapshot);
      return returnedSiteId && snapshot.success
        ? { siteId: returnedSiteId, snapshot: snapshot.data }
        : undefined;
    },
    async createRecord(input) {
      return createSupabaseFunctionRecord(supabaseUrl, secretKey, input);
    },
    async writeAudit(event) {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/function_audit_log`,
        {
          method: "POST",
          headers: restHeaders(secretKey),
          body: JSON.stringify({
            workspace_id: event.workspaceId,
            site_id: event.siteId,
            action_id: event.actionId,
            request_id: event.requestId,
            actor_user_id: event.actorUserId ?? null,
            success: event.success,
            result_code: event.code ?? null,
            occurred_at: event.occurredAt,
          }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        throw new Error(
          `Function audit insert failed with ${response.status}.`,
        );
      }
    },
    async rateLimit(input) {
      if (input.windowSeconds !== 60) {
        throw new Error("Unsupported public function rate-limit window.");
      }
      const limiter =
        input.kind === "preflight"
          ? preflightLimiter
          : input.limit <= 5
            ? newsletterLimiter
            : publicLimiter;
      return (await limiter.limit({ key: input.key })).success;
    },
    async verifyTurnstile(token, ip, requestId) {
      const body = new URLSearchParams({
        secret: turnstileSecretKey,
        response: token,
        idempotency_key: requestId,
      });
      if (ip !== "anonymous") body.set("remoteip", ip);
      const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          cache: "no-store",
          signal: AbortSignal.timeout(5_000),
        },
      );
      if (!response.ok) return false;
      const result = (await response.json()) as {
        success?: unknown;
        hostname?: unknown;
        action?: unknown;
      };
      return (
        result.success === true &&
        result.hostname === PUBLIC_GATEWAY_HOSTNAME &&
        result.action === TURNSTILE_ACTION
      );
    },
  };
}

export async function createSupabaseFunctionRecord(
  supabaseUrl: string,
  secretKey: string,
  input: Omit<StoredFunctionRecord, "id" | "createdAt">,
  fetcher: typeof fetch = fetch,
): Promise<StoredFunctionRecord> {
  const response = await fetcher(
    `${supabaseUrl}/rest/v1/site_function_records`,
    {
      method: "POST",
      headers: {
        ...restHeaders(secretKey),
        prefer: "return=representation",
      },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        site_id: input.siteId,
        action_id: input.actionId,
        action_version: input.actionVersion,
        idempotency_key: input.idempotencyKey ?? null,
        contact_name: input.contactName ?? null,
        contact_email: input.contactEmail ?? null,
        contact_phone: input.contactPhone ?? null,
        payload: input.payload,
        status: input.status,
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    if (response.status === 409 && input.idempotencyKey) {
      const query = new URLSearchParams({
        site_id: `eq.${input.siteId}`,
        action_id: `eq.${input.actionId}`,
        idempotency_key: `eq.${input.idempotencyKey}`,
        select: "id,created_at,status",
        limit: "1",
      });
      const existingResponse = await fetcher(
        `${supabaseUrl}/rest/v1/site_function_records?${query}`,
        {
          headers: restHeaders(secretKey),
          cache: "no-store",
        },
      );
      if (existingResponse.ok) {
        const existingRows = (await existingResponse.json()) as Array<{
          id?: unknown;
          created_at?: unknown;
          status?: unknown;
        }>;
        const existingId = stringValue(existingRows[0]?.id);
        const existingCreatedAt = stringValue(existingRows[0]?.created_at);
        const existingStatus = existingRows[0]?.status;
        if (
          existingId &&
          existingCreatedAt &&
          (existingStatus === "received" || existingStatus === "queued")
        ) {
          return {
            ...input,
            id: existingId,
            createdAt: existingCreatedAt,
            status: existingStatus,
          };
        }
      }
    }
    throw new Error(`Function record insert failed with ${response.status}.`);
  }
  const rows = (await response.json()) as Array<{
    id?: unknown;
    created_at?: unknown;
  }>;
  const id = stringValue(rows[0]?.id);
  const createdAt = stringValue(rows[0]?.created_at);
  if (!id || !createdAt)
    throw new Error("Function record insert returned no row.");
  return { ...input, id, createdAt };
}

function siteRegistersAction(site: Site, actionId: string): boolean {
  return site.pages.some((page) =>
    page.sections.some(
      (section) =>
        !section.hidden &&
        Object.values(section.bindings).some(
          (binding) => binding.actionId === actionId,
        ),
    ),
  );
}

async function parsePayload(
  request: Request,
): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new PublicFunctionError(
      413,
      "PAYLOAD_TOO_LARGE",
      "The submitted information is too large.",
    );
  }
  const text = await readBoundedText(request);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  let payload: Record<string, unknown>;
  if (contentType.includes("application/json")) {
    try {
      const value = JSON.parse(text) as unknown;
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error();
      payload = { ...(value as Record<string, unknown>) };
    } catch {
      throw new PublicFunctionError(
        400,
        "INVALID_INPUT",
        "The submitted information is invalid.",
      );
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    payload = Object.fromEntries(new URLSearchParams(text));
  } else {
    throw new PublicFunctionError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "The submitted form format is unsupported.",
    );
  }
  if (Object.keys(payload).length > 32) {
    throw new PublicFunctionError(
      400,
      "INVALID_INPUT",
      "The submitted information is invalid.",
    );
  }
  for (const [key, value] of Object.entries(payload)) {
    if (
      key.length > 64 ||
      (typeof value === "string" && value.length > 5_000) ||
      !["string", "number", "boolean"].includes(typeof value)
    ) {
      throw new PublicFunctionError(
        400,
        "INVALID_INPUT",
        "The submitted information is invalid.",
      );
    }
    if (typeof value === "string" && !value.trim()) {
      delete payload[key];
    }
  }
  for (const key of ["partySize", "guests"]) {
    if (typeof payload[key] === "string" && /^\d+$/.test(payload[key])) {
      payload[key] = Number(payload[key]);
    }
  }
  if (typeof payload.consent === "string") {
    payload.consent = ["1", "true", "on", "yes"].includes(
      payload.consent.toLowerCase(),
    );
  }
  return payload;
}

async function readBoundedText(request: Request): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new PublicFunctionError(
          413,
          "PAYLOAD_TOO_LARGE",
          "The submitted information is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new PublicFunctionError(
      400,
      "INVALID_INPUT",
      "The submitted information is invalid.",
    );
  }
}

async function hashIp(
  ip: string,
  siteId: string,
  salt: string,
): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${siteId}:${ip}`),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function turnstileChallengeResponse(
  request: Request,
  actionId: string,
  siteId: string,
  payload: Record<string, unknown>,
  siteKey: string,
  requestId: string,
): Response {
  const requestUrl = new URL(request.url);
  requestUrl.protocol = "https:";
  requestUrl.hostname = PUBLIC_GATEWAY_HOSTNAME;
  requestUrl.port = "";
  requestUrl.pathname = `/api/functions/${encodeURIComponent(actionId)}`;
  requestUrl.search = "";
  requestUrl.searchParams.set("siteId", siteId);
  const fields = Object.entries(payload)
    .map(
      ([name, value]) =>
        `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value))}">`,
    )
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Verify your request</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script><style>body{margin:0;display:grid;min-height:100svh;place-items:center;background:#f8fafc;color:#0f172a;font-family:system-ui,sans-serif}.card{width:min(100% - 2rem,34rem);padding:2rem;border:1px solid #cbd5e1;border-radius:1rem;background:#fff;box-shadow:0 1rem 3rem rgb(15 23 42/.08)}h1{margin-top:0}p{line-height:1.6}.challenge{min-height:70px;margin:1.25rem 0}button{min-height:44px;padding:.7rem 1rem;border:0;border-radius:.6rem;background:#155e75;color:#fff;font:inherit;font-weight:700}</style></head><body><main class="card"><h1>One quick check</h1><p>Please verify that you are human, then submit your request.</p><form method="post" action="${escapeHtml(requestUrl.toString())}">${fields}<div class="challenge"><div class="cf-turnstile" data-sitekey="${escapeHtml(siteKey)}" data-action="${TURNSTILE_ACTION}"></div></div><button type="submit">Submit request</button></form></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
      "content-security-policy":
        "default-src 'none'; script-src https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src https://challenges.cloudflare.com; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "permissions-policy":
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "x-micirql-request-id": requestId,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function validSiteId(value: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      normalized,
    )
    ? normalized
    : undefined;
}

function safeIdempotencyKey(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized &&
    normalized.length <= 128 &&
    /^[A-Za-z0-9._:-]+$/.test(normalized)
    ? normalized
    : undefined;
}

function normalizedHostname(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(",")[0]!
    .replace(/:\d+$/, "")
    .replace(/^\.+|\.+$/g, "");
}

function restHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    "content-type": "application/json",
    accept: "application/json",
    ...(isLegacyJwt(key) ? { authorization: `Bearer ${key}` } : {}),
  };
}

function isLegacyJwt(value: string): boolean {
  return value.split(".").length === 3;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new PublicFunctionError(
      503,
      "FUNCTION_GATEWAY_NOT_CONFIGURED",
      "The website action service is temporarily unavailable.",
    );
  }
  return value;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function statusForResult(result: { ok: boolean; code?: string }): number {
  if (result.ok) return 201;
  if (result.code === "INVALID_INPUT") return 400;
  if (result.code === "FORBIDDEN") return 403;
  if (result.code === "NOT_FOUND") return 404;
  if (result.code === "RATE_LIMITED") return 429;
  if (result.code === "NOT_CONFIGURED") return 503;
  return 500;
}

function resultResponse(
  request: Request,
  result: {
    ok: boolean;
    code?: string;
    message?: string;
    requestId: string;
    data?: unknown;
  },
  status: number,
): Response {
  const commonHeaders = {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-micirql-request-id": result.requestId,
  };
  if (request.headers.get("accept")?.includes("application/json")) {
    return Response.json(result, { status, headers: commonHeaders });
  }
  const title = result.ok ? "Thank you" : "Unable to submit";
  const message = result.ok
    ? "Your request has been received."
    : (result.message ?? "The request could not be completed.");
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{margin:0;display:grid;min-height:100svh;place-items:center;background:#f8fafc;color:#0f172a;font-family:system-ui,sans-serif}.card{width:min(100% - 2rem,34rem);padding:2rem;border:1px solid #cbd5e1;border-radius:1rem;background:#fff;box-shadow:0 1rem 3rem rgb(15 23 42/.08)}h1{margin-top:0}p{line-height:1.6}button{min-height:44px;padding:.7rem 1rem;border:0;border-radius:.6rem;background:#155e75;color:#fff;font:inherit;font-weight:700}</style></head><body><main class="card"><h1>${title}</h1><p>${message}</p><button type="button" onclick="history.back()">Return to website</button></main></body></html>`,
    {
      status,
      headers: {
        ...commonHeaders,
        "content-type": "text/html; charset=utf-8",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
    },
  );
}

class PublicFunctionError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
