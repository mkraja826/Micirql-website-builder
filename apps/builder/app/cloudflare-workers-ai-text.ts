import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { PlannerModel, PlannerModelRequest, TextProviderUsageSink } from "@micirql/ai";

export const CLOUDFLARE_CONTENT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
export const CLOUDFLARE_CONTENT_PROFILE_ID = "cloudflare-workers-ai-content";

// Current Cloudflare Workers AI list price for this exact model.
export const CLOUDFLARE_CONTENT_INPUT_MICROUSD_PER_MILLION = 152_000;
export const CLOUDFLARE_CONTENT_OUTPUT_MICROUSD_PER_MILLION = 287_000;

type WorkersAiBinding = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

type WorkersAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

type WorkersAiResponse = {
  response?: string | Record<string, unknown> | unknown[];
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: WorkersAiUsage;
};

export function getWorkersAiTextBinding(): WorkersAiBinding | null {
  try {
    const context = getCloudflareContext();
    const ai = (context.env as unknown as Record<string, unknown>).AI;
    if (!ai || typeof (ai as { run?: unknown }).run !== "function") return null;
    return ai as WorkersAiBinding;
  } catch {
    return null;
  }
}

export function createWorkersAiJsonPlannerModel(options?: { onUsage?: TextProviderUsageSink; maxOutputTokens?: number }): PlannerModel | null {
  const ai = getWorkersAiTextBinding();
  if (!ai) return null;

  return {
    id: CLOUDFLARE_CONTENT_PROFILE_ID,
    async generate(request: PlannerModelRequest): Promise<unknown> {
      // This FP8 model is not on Cloudflare's JSON-Mode supported-model list.
      // Passing response_format causes inference to fail before a response/usage
      // payload is returned. The MiCirql content contract already asks for JSON-only
      // output and parseWorkersAiResponse enforces valid JSON locally, so keep the
      // provider request in normal text-generation mode for this model.
      const payload = await ai.run(CLOUDFLARE_CONTENT_MODEL, {
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: serializeInput(request.input) },
        ],
        temperature: 0.28,
        max_tokens: options?.maxOutputTokens ?? 8_000,
      }) as WorkersAiResponse;

      const usage = normalizeUsage(payload.usage);
      if (usage && options?.onUsage) {
        await options.onUsage({
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          costMicrousd: 0,
        });
      }

      return parseWorkersAiResponse(payload);
    },
  };
}

function parseWorkersAiResponse(payload: WorkersAiResponse): unknown {
  if (payload.response && typeof payload.response === "object") return payload.response;

  const raw = typeof payload.response === "string"
    ? payload.response
    : payload.choices?.[0]?.message?.content;

  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Cloudflare Workers AI returned no content.");
  }

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("Cloudflare Workers AI returned content that is not valid JSON.");
  }
}

function normalizeUsage(usage: WorkersAiUsage | undefined) {
  if (!usage) return undefined;
  const inputTokens = tokenCount(usage.prompt_tokens ?? usage.input_tokens);
  const outputTokens = tokenCount(usage.completion_tokens ?? usage.output_tokens);
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  return { inputTokens, outputTokens };
}

function tokenCount(value: number | undefined) {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : undefined;
}

function serializeInput(input: unknown) {
  return typeof input === "string" ? input : JSON.stringify(input);
}
