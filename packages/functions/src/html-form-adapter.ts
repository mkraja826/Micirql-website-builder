import type { FunctionGateway } from "./gateway";

export type HtmlFormAdapterOptions = {
  gateway: FunctionGateway;
  successParam?: string;
  errorParam?: string;
  defaultReturnPath?: string;
  ipHasher?: (ip: string) => Promise<string> | string;
};

export async function handleHtmlFunctionForm(request: Request, actionId: string, options: HtmlFormAdapterOptions): Promise<Response> {
  if (request.method.toUpperCase() !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded") && !contentType.includes("multipart/form-data")) {
    return new Response("Unsupported media type", { status: 415 });
  }

  const form = await request.formData();
  const sourcePage = safeReturnPath(String(form.get("sourcePage") ?? options.defaultReturnPath ?? "/"));
  const successParam = options.successParam ?? "form";
  const errorParam = options.errorParam ?? "formError";

  if (String(form.get("website") ?? "").trim()) return redirectWithState(request.url, sourcePage, errorParam, "verification");

  const payload = normalizePayload(form);
  delete payload.website;
  const requestId = crypto.randomUUID();
  const idempotencyKey = request.headers.get("idempotency-key") ?? crypto.randomUUID();
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = forwarded && options.ipHasher ? await options.ipHasher(forwarded) : undefined;
  const hostname = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host") ?? new URL(request.url).hostname;

  const result = await options.gateway.handle({
    hostname,
    actionId,
    payload,
    requestId,
    idempotencyKey,
    ...(ipHash ? { actor: { ipHash } } : {}),
  });

  if (result.ok) return redirectWithState(request.url, sourcePage, successParam, "received");
  return redirectWithState(request.url, sourcePage, errorParam, publicErrorCode(result.code));
}

function normalizePayload(form: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, raw] of form.entries()) {
    if (raw instanceof File) continue;
    const value = raw.trim();
    if (!value) continue;
    if (["partySize", "guests"].includes(key)) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) payload[key] = parsed;
      continue;
    }
    if (key === "consent") {
      payload[key] = value === "true" || value === "1" || value === "on";
      continue;
    }
    payload[key] = value;
  }
  return payload;
}

function redirectWithState(requestUrl: string, path: string, parameter: string, value: string): Response {
  const base = new URL(requestUrl);
  const target = new URL(path, base.origin);
  target.searchParams.set(parameter, value);
  target.hash = "enquiry";
  return Response.redirect(target.toString(), 303);
}

function safeReturnPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  try {
    const parsed = new URL(trimmed, "https://micirql.invalid");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "/";
  }
}

function publicErrorCode(code: string): string {
  if (code === "RATE_LIMITED") return "rate-limited";
  if (code === "INVALID_INPUT") return "check-details";
  if (code === "NOT_CONFIGURED") return "unavailable";
  return "try-again";
}
