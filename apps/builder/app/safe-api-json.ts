export class ApiResponseError extends Error {
  constructor(
    public readonly code: "NON_JSON_API_RESPONSE" | "INVALID_JSON_API_RESPONSE" | "API_REQUEST_FAILED",
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly contentType: string,
  ) {
    super(code);
    this.name = "ApiResponseError";
  }
}

export async function readJsonResponse<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) {
    // Consume the body so the connection can be reused, but never expose HTML/error-page
    // contents to the customer. Status/content type are sufficient for diagnostics.
    await response.text().catch(() => "");
    throw new ApiResponseError(
      "NON_JSON_API_RESPONSE",
      response.status,
      isRetryableStatus(response.status),
      contentType,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiResponseError(
      "INVALID_JSON_API_RESPONSE",
      response.status,
      isRetryableStatus(response.status),
      contentType,
    );
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiResponseError(
      "INVALID_JSON_API_RESPONSE",
      response.status,
      isRetryableStatus(response.status),
      contentType,
    );
  }
  return payload as T;
}

export async function fetchJsonWithRetry<T extends Record<string, unknown>>(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { retries?: number; onRetry?: (error: ApiResponseError | Error, attempt: number) => void } = {},
): Promise<{ response: Response; payload: T; attempts: number }> {
  const retries = Math.max(0, options.retries ?? 1);
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      const payload = await readJsonResponse<T>(response);
      if (!response.ok) {
        const error = new ApiResponseError(
          "API_REQUEST_FAILED",
          response.status,
          isRetryableStatus(response.status),
          (response.headers.get("content-type") ?? "").toLowerCase(),
        );
        if (!error.retryable || attempt >= retries) return { response, payload, attempts: attempt + 1 };
        lastError = error;
        options.onRetry?.(error, attempt + 1);
        await retryDelay(attempt);
        continue;
      }
      return { response, payload, attempts: attempt + 1 };
    } catch (error) {
      const retryable = error instanceof ApiResponseError ? error.retryable : true;
      lastError = error;
      if (!retryable || attempt >= retries) throw error;
      options.onRetry?.(error instanceof Error ? error : new Error("API request failed"), attempt + 1);
      await retryDelay(attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("API request failed");
}

export function customerSafeApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiResponseError) {
    return error.retryable
      ? "MiCirql couldn’t complete this step after retrying safely. Please try again."
      : fallback;
  }
  return fallback;
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;
}

function retryDelay(attempt: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
}
