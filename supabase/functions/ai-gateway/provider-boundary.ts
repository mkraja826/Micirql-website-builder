export type ProviderBoundaryOptions = {
  timeoutMs: number;
  callerSignal?: AbortSignal | null;
};

export class ProviderRequestTimeoutError extends Error {
  readonly code = "provider_timeout";
  readonly category = "transient";
  readonly retryable = true;
  readonly status = 504;
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super("provider_timeout");
    this.name = "ProviderRequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class ProviderRequestAbortedError extends Error {
  readonly code = "provider_request_aborted";
  readonly category = "request";
  readonly retryable = false;
  readonly status = 499;

  constructor() {
    super("provider_request_aborted");
    this.name = "ProviderRequestAbortedError";
  }
}

export function providerTimeoutFailure(
  error: ProviderRequestTimeoutError,
  context: { provider: string; model: string; warnings: string[] },
) {
  return {
    status: error.status,
    body: {
      error: error.code,
      code: error.code,
      category: error.category,
      retryable: error.retryable,
      provider: context.provider,
      model: context.model,
      timeout_ms: error.timeoutMs,
      warnings: context.warnings,
    },
  } as const;
}

/**
 * Bounds the complete provider exchange, including response-body parsing. The
 * caller signal is mirrored onto the provider request so a disconnected parent
 * Edge Function does not leave the NVIDIA request running until wall-clock
 * retirement.
 */
export async function runWithProviderBoundary<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: ProviderBoundaryOptions,
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Math.trunc(options.timeoutMs));
  let callerAborted = false;
  let timedOut = false;

  const abortFromCaller = () => {
    callerAborted = true;
    controller.abort(options.callerSignal?.reason);
  };
  if (options.callerSignal?.aborted) abortFromCaller();
  else
    options.callerSignal?.addEventListener("abort", abortFromCaller, {
      once: true,
    });

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (callerAborted || options.callerSignal?.aborted) {
      throw new ProviderRequestAbortedError();
    }
    if (timedOut) throw new ProviderRequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeout);
    options.callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}
