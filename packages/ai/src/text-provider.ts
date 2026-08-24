import type { PlannerModel, PlannerModelRequest } from "./planner-adapter";
import { calculateTokenCostMicrousd, type TokenPricing } from "./pricing";

export type TextProviderUsage = {
  inputTokens: number;
  outputTokens: number;
  costMicrousd: number;
};

export type TextProviderUsageSink = (usage: TextProviderUsage) => void | Promise<void>;

export type OpenAiCompatibleTextProviderConfig = {
  id: string;
  endpoint: string;
  apiKey: string;
  model: string;
  pricing: TokenPricing;
  temperature?: number;
  maxOutputTokens?: number;
  headers?: Record<string, string>;
  onUsage?: TextProviderUsageSink;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: { message?: string };
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const MAX_JSON_CONTENT_ATTEMPTS = 2;
const BASE_DELAY_MS = 350;
const MAX_DELAY_MS = 5_000;
const JSON_RECOVERY_INSTRUCTION = [
  "Your previous response could not be parsed as JSON.",
  "Return exactly one complete valid JSON object or array and nothing else.",
  "Do not use Markdown fences, comments, prose, trailing commas, or unquoted keys.",
  "Close every string, object, and array before finishing the response.",
].join(" ");

class InvalidJsonContentError extends Error {
  constructor() {
    super("Text provider returned content that is not valid JSON.");
    this.name = "InvalidJsonContentError";
  }
}

export function createOpenAiCompatibleJsonPlannerModel(config: OpenAiCompatibleTextProviderConfig): PlannerModel {
  validateConfig(config);
  return {
    id: config.id,
    async generate(request: PlannerModelRequest): Promise<unknown> {
      for (let contentAttempt = 1; contentAttempt <= MAX_JSON_CONTENT_ATTEMPTS; contentAttempt += 1) {
        const response = await fetchWithRetry(config.endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.apiKey}`,
            ...config.headers,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content: contentAttempt === 1
                  ? request.system
                  : `${request.system}\n\n${JSON_RECOVERY_INSTRUCTION}`,
              },
              { role: "user", content: serializeInput(request.input) },
            ],
            ...(request.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
            ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
            ...(config.maxOutputTokens !== undefined ? { max_tokens: config.maxOutputTokens } : {}),
          }),
        });

        const payload = await parsePayload(response);
        if (!response.ok) {
          throw new Error(payload.error?.message ?? `Text provider request failed (${response.status}).`);
        }

        const content = payload.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          throw new Error("Text provider returned no message content.");
        }

        await recordUsage(config, payload);

        try {
          return parseJsonContent(content);
        } catch (error) {
          if (!(error instanceof InvalidJsonContentError) || contentAttempt === MAX_JSON_CONTENT_ATTEMPTS) throw error;
        }
      }

      throw new InvalidJsonContentError();
    },
  };
}

async function recordUsage(config: OpenAiCompatibleTextProviderConfig, payload: ChatCompletionResponse): Promise<void> {
  const inputTokens = normalizeTokenCount(payload.usage?.prompt_tokens ?? payload.usage?.input_tokens);
  const outputTokens = normalizeTokenCount(payload.usage?.completion_tokens ?? payload.usage?.output_tokens);
  if (!config.onUsage || inputTokens === undefined || outputTokens === undefined) return;

  await config.onUsage({
    inputTokens,
    outputTokens,
    costMicrousd: calculateTokenCostMicrousd(config.pricing, { inputTokens, outputTokens }),
  });
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_ATTEMPTS) return response;
      await discardBody(response);
      await sleep(retryDelayMs(response.headers.get("retry-after"), attempt));
    } catch (error) {
      if (!isRetryableNetworkError(error) || attempt === MAX_ATTEMPTS) throw error;
      lastError = error;
      await sleep(retryDelayMs(null, attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Text provider request failed after retries.");
}

function retryDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(MAX_DELAY_MS, Math.round(seconds * 1_000));
    const timestamp = Date.parse(retryAfter);
    if (Number.isFinite(timestamp)) return Math.min(MAX_DELAY_MS, Math.max(0, timestamp - Date.now()));
  }
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempt - 1));
}

function isRetryableNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return error instanceof TypeError || (error instanceof Error && /network|fetch failed|socket|timeout|timed out|connection|econn/i.test(error.message));
}

async function discardBody(response: Response): Promise<void> {
  try { await response.arrayBuffer(); } catch { /* best effort */ }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateConfig(config: OpenAiCompatibleTextProviderConfig): void {
  if (!config.id.trim()) throw new Error("Text provider id is required.");
  if (!config.model.trim()) throw new Error("Text provider model is required.");
  if (!config.apiKey.trim()) throw new Error("Text provider API key is required.");
  let endpoint: URL;
  try {
    endpoint = new URL(config.endpoint);
  } catch {
    throw new Error("Text provider endpoint must be a valid URL.");
  }
  if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost" && endpoint.hostname !== "127.0.0.1") {
    throw new Error("Text provider endpoint must use HTTPS unless it is local development.");
  }
}

async function parsePayload(response: Response): Promise<ChatCompletionResponse> {
  try {
    return await response.json() as ChatCompletionResponse;
  } catch {
    throw new Error(`Text provider returned invalid JSON (${response.status}).`);
  }
}

function serializeInput(input: unknown): string {
  if (typeof input === "string") return input;
  return JSON.stringify(input);
}

function parseJsonContent(content: string): unknown {
  const trimmed = stripOuterCodeFence(content);
  const direct = tryParseJson(trimmed);
  if (direct.ok) return direct.value;

  const candidates = extractBalancedJsonCandidates(trimmed)
    .map((candidate) => tryParseJson(candidate))
    .filter((result): result is { ok: true; value: unknown } => result.ok);

  if (candidates.length === 1) return candidates[0].value;
  throw new InvalidJsonContentError();
}

function stripOuterCodeFence(content: string): string {
  return content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function tryParseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function extractBalancedJsonCandidates(content: string): string[] {
  const candidates: string[] = [];
  let start = -1;
  let stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (start < 0) {
      if (char === "{" || char === "[") {
        start = index;
        stack = [char];
        inString = false;
        escaped = false;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char !== "}" && char !== "]") continue;

    const expectedOpen = char === "}" ? "{" : "[";
    if (stack[stack.length - 1] !== expectedOpen) {
      start = -1;
      stack = [];
      inString = false;
      escaped = false;
      continue;
    }

    stack.pop();
    if (stack.length === 0) {
      candidates.push(content.slice(start, index + 1));
      start = -1;
      inString = false;
      escaped = false;
    }
  }

  return candidates;
}

function normalizeTokenCount(value: number | undefined): number | undefined {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : undefined;
}
