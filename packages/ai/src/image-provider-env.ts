import { createBflImageExecutor } from "./bfl-image-provider";
import { createOpenAiCompatibleImageExecutor, type ImageProviderConfig } from "./image-provider";

export type ImageProviderEnvironment = Record<string, string | undefined>;

export function imageProviderConfigFromEnvironment(env: ImageProviderEnvironment): ImageProviderConfig | undefined {
  const bflApiKey = clean(env.MICIRQL_BFL_API_KEY);
  if (bflApiKey) {
    return {
      id: clean(env.MICIRQL_IMAGE_MODEL_PROFILE_ID) ?? "bfl-flux2-klein-4b",
      endpoint: clean(env.MICIRQL_BFL_ENDPOINT) ?? "https://api.bfl.ai/v1/flux-2-klein-4b",
      apiKey: bflApiKey,
      model: "flux-2-klein-4b",
      size: (clean(env.MICIRQL_IMAGE_MODEL_SIZE) ?? "1536x1024") as `${number}x${number}`,
      imageCostMicrousd: parseCost(clean(env.MICIRQL_IMAGE_MODEL_COST_MICROUSD) ?? "15000"),
      responseFormat: "url",
    };
  }

  const endpoint = clean(env.MICIRQL_IMAGE_MODEL_ENDPOINT);
  const apiKey = clean(env.MICIRQL_IMAGE_MODEL_API_KEY);
  const model = clean(env.MICIRQL_IMAGE_MODEL);
  const cost = clean(env.MICIRQL_IMAGE_MODEL_COST_MICROUSD);
  if (!endpoint && !apiKey && !model && !cost) return undefined;
  if (!endpoint) throw new Error("MICIRQL_IMAGE_MODEL_ENDPOINT is required when image AI is configured.");
  if (!apiKey) throw new Error("MICIRQL_IMAGE_MODEL_API_KEY is required when image AI is configured.");
  if (!model) throw new Error("MICIRQL_IMAGE_MODEL is required when image AI is configured.");
  if (!cost) throw new Error("MICIRQL_IMAGE_MODEL_COST_MICROUSD is required when image AI is configured.");
  const size = (clean(env.MICIRQL_IMAGE_MODEL_SIZE) ?? "1536x1024") as `${number}x${number}`;
  return {
    id: clean(env.MICIRQL_IMAGE_MODEL_PROFILE_ID) ?? "primary-image",
    endpoint,
    apiKey,
    model,
    size,
    imageCostMicrousd: parseCost(cost),
    responseFormat: clean(env.MICIRQL_IMAGE_MODEL_RESPONSE_FORMAT) === "url" ? "url" : "b64_json",
  };
}

export function imageExecutorFromEnvironment(env: ImageProviderEnvironment) {
  const config = imageProviderConfigFromEnvironment(env);
  if (!config) return undefined;
  return clean(env.MICIRQL_BFL_API_KEY) ? createBflImageExecutor(config) : createOpenAiCompatibleImageExecutor(config);
}

function parseCost(value: string): number {
  const cost = Number(value);
  if (!Number.isInteger(cost) || cost < 0) throw new Error("MICIRQL_IMAGE_MODEL_COST_MICROUSD must be a non-negative integer.");
  return cost;
}

function clean(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}
