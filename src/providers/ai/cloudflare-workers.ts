import type { AiJsonProvider, AiJsonRequest, AiJsonResult } from "./schema";

export const DEFAULT_CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

export type WorkersAiBinding = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

type WorkersAiResponse = {
  response?: string | Record<string, unknown> | unknown[];
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
};

export function createCloudflareWorkersAiProvider(ai: WorkersAiBinding, options?: { model?: string }): AiJsonProvider {
  const model = options?.model ?? DEFAULT_CLOUDFLARE_MODEL;
  return {
    id: "cloudflare-workers-ai",
    async generateJson<T = unknown>(request: AiJsonRequest): Promise<AiJsonResult<T>> {
      const payload = await ai.run(model, {
        messages: [
          { role: "system", content: `${request.system}\nReturn valid JSON only. Do not invent business-specific facts that are absent from the supplied input.` },
          { role: "user", content: typeof request.input === "string" ? request.input : JSON.stringify(request.input) },
        ],
        temperature: request.temperature ?? 0.28,
        max_tokens: request.maxOutputTokens ?? 8000,
      }) as WorkersAiResponse;

      const raw = typeof payload.response === "object" && payload.response !== null
        ? payload.response
        : typeof payload.response === "string"
          ? payload.response
          : payload.choices?.[0]?.message?.content;

      if (raw === undefined || raw === null || raw === "") throw new Error("Cloudflare Workers AI returned no content.");
      const value = typeof raw === "string" ? parseJson(raw) : raw;
      const inputTokens = tokenCount(payload.usage?.prompt_tokens ?? payload.usage?.input_tokens);
      const outputTokens = tokenCount(payload.usage?.completion_tokens ?? payload.usage?.output_tokens);
      return {
        provider: "cloudflare-workers-ai",
        model,
        value: value as T,
        ...(inputTokens !== undefined || outputTokens !== undefined ? { usage: { inputTokens, outputTokens } } : {}),
      };
    },
  };
}

function parseJson(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Cloudflare Workers AI returned content that is not valid JSON.");
  }
}

function tokenCount(value: number | undefined) {
  return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
}
