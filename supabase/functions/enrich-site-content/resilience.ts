export type GatewayFailureCategory =
  | "authorization"
  | "configuration"
  | "invalid_response"
  | "request"
  | "transient"
  | "unknown";

export type GatewayFailure = {
  code: string;
  category: GatewayFailureCategory;
  retryable: boolean;
  status: number | null;
};

export class GatewayRequestError extends Error {
  readonly failure: GatewayFailure;
  readonly attempts: number;

  constructor(failure: GatewayFailure, attempts = 1) {
    super(failure.code);
    this.name = "GatewayRequestError";
    this.failure = failure;
    this.attempts = attempts;
  }
}

type GatewayPayload = Record<string, unknown>;

const categories = new Set<GatewayFailureCategory>([
  "authorization",
  "configuration",
  "invalid_response",
  "request",
  "transient",
  "unknown",
]);

export function gatewayFailureFromResponse(
  status: number,
  payload: unknown,
): GatewayFailure {
  const record = isRecord(payload) ? payload : {};
  const code =
    text(record.code) || text(record.error) || `gateway_http_${status}`;
  const explicitCategory = text(record.category) as GatewayFailureCategory;
  const combined = [
    code,
    text(record.error),
    ...stringArray(record.warnings),
  ].join(" ");

  let category: GatewayFailureCategory;
  if (categories.has(explicitCategory)) category = explicitCategory;
  else if (
    status === 401 ||
    status === 403 ||
    /\b(?:401|403|unauthori[sz]ed|forbidden|invalid api key|api[_ -]?key[^\n]*(?:invalid|expired)|credential[^\n]*(?:invalid|expired))\b/i.test(
      combined,
    )
  )
    category = "authorization";
  else if (
    /not[_ -]?configured|configuration|unsupported[^\n]*model|model[^\n]*(?:not found|unavailable)|invalid[^\n]*model|\b404\b/i.test(
      combined,
    )
  )
    category = "configuration";
  else if (
    /invalid[_ -]?(?:json|response)|page[_ -]?id[_ -]?mismatch/i.test(combined)
  )
    category = "invalid_response";
  else if (
    isTransientStatus(status) ||
    /\b(?:408|425|429|500|502|503|504)\b|rate.?limit|too many requests|quota|overload|temporar|timed?\s*out|timeout|connection|network|fetch failed|service unavailable/i.test(
      combined,
    )
  )
    category = "transient";
  else if (status >= 400 && status < 500) category = "request";
  else category = "unknown";

  const explicitRetryable =
    typeof record.retryable === "boolean" ? record.retryable : undefined;
  return {
    code,
    category,
    retryable: explicitRetryable ?? category === "transient",
    status,
  };
}

export function gatewayFailureFromError(error: unknown): GatewayFailure {
  if (error instanceof GatewayRequestError) return error.failure;
  const message =
    error instanceof Error
      ? error.message
      : text(error) || "gateway_request_failed";
  const transient =
    error instanceof TypeError ||
    /abort|network|fetch|connection|timed?\s*out|timeout|temporar|unavailable/i.test(
      message,
    );
  return {
    code: transient ? "gateway_network_error" : normalizeCode(message),
    category: transient ? "transient" : "unknown",
    retryable: transient,
    status: null,
  };
}

export type RetryContext = {
  attempt: number;
  signal: AbortSignal;
};

export type RetryOptions = {
  maxAttempts: number;
  timeoutMs: number;
  delayMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export type SettledRetryResult<T> =
  | { ok: true; value: T; attempts: number }
  | { ok: false; failure: GatewayFailure; attempts: number };

export async function runBoundedWithRetry<Input, Output>(
  items: readonly Input[],
  operation: (
    item: Input,
    index: number,
    context: RetryContext,
  ) => Promise<Output>,
  options: RetryOptions & { concurrency: number },
): Promise<SettledRetryResult<Output>[]> {
  return mapWithConcurrency(items, options.concurrency, async (item, index) => {
    try {
      const result = await retryTransient(
        (context) => operation(item, index, context),
        options,
      );
      return {
        ok: true,
        value: result.value,
        attempts: result.attempts,
      } as const;
    } catch (error) {
      const requestError =
        error instanceof GatewayRequestError
          ? error
          : new GatewayRequestError(gatewayFailureFromError(error));
      return {
        ok: false,
        failure: requestError.failure,
        attempts: requestError.attempts,
      } as const;
    }
  });
}

export async function retryTransient<T>(
  operation: (context: RetryContext) => Promise<T>,
  options: RetryOptions,
): Promise<{ value: T; attempts: number }> {
  const maxAttempts = Math.max(1, Math.trunc(options.maxAttempts));
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const value = await runWithTimeout(operation, attempt, options.timeoutMs);
      return { value, attempts: attempt };
    } catch (error) {
      const failure = gatewayFailureFromError(error);
      if (!failure.retryable || attempt >= maxAttempts) {
        throw new GatewayRequestError(failure, attempt);
      }
      if (options.delayMs > 0) await sleep(options.delayMs);
    }
  }

  throw new GatewayRequestError(
    {
      code: "gateway_retry_exhausted",
      category: "transient",
      retryable: true,
      status: null,
    },
    maxAttempts,
  );
}

async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  requestedConcurrency: number,
  operation: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!items.length) return [];
  const concurrency = Math.max(
    1,
    Math.min(items.length, Math.trunc(requestedConcurrency) || 1),
  );
  const output = new Array<Output>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      if (index >= items.length) return;
      nextIndex += 1;
      output[index] = await operation(items[index]!, index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return output;
}

async function runWithTimeout<T>(
  operation: (context: RetryContext) => Promise<T>,
  attempt: number,
  requestedTimeoutMs: number,
): Promise<T> {
  const timeoutMs = Math.max(1, Math.trunc(requestedTimeoutMs));
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(
        new GatewayRequestError({
          code: "gateway_timeout",
          category: "transient",
          retryable: true,
          status: 504,
        }),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      operation({ attempt, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}

function isTransientStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function normalizeCode(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || "gateway_request_failed";
}

function isRecord(value: unknown): value is GatewayPayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
