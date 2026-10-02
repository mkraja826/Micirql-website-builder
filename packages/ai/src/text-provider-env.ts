import { createOpenAiCompatibleJsonPlannerModel, type OpenAiCompatibleTextProviderConfig } from "./text-provider";

export type TextProviderEnvironment = Record<string, string | undefined>;

const AIMLAPI_DEFAULT_ENDPOINT = "https://api.aimlapi.com/v1/chat/completions";

export function textProviderConfigFromEnvironment(env: TextProviderEnvironment): OpenAiCompatibleTextProviderConfig | undefined {
  const provider = clean(env.MICIRQL_TEXT_PROVIDER)?.toLowerCase();
  const aimlApiKey = clean(env.AIMLAPI_API_KEY);
  const aimlApiModel = clean(env.AIMLAPI_MODEL);
  const aimlApiEndpoint = clean(env.AIMLAPI_ENDPOINT);
  const aimlApiSelected = provider === "aimlapi" || Boolean(aimlApiKey || aimlApiModel || aimlApiEndpoint);

  if (aimlApiSelected) {
    if (!aimlApiKey) throw new Error("AIMLAPI_API_KEY is required when AIMLAPI is selected.");
    if (!aimlApiModel) throw new Error("AIMLAPI_MODEL is required when AIMLAPI is selected.");

    const temperature = optionalNumber(env.AIMLAPI_TEMPERATURE ?? env.MICIRQL_TEXT_MODEL_TEMPERATURE, "AIMLAPI_TEMPERATURE");
    const maxOutputTokens = optionalInteger(
      env.AIMLAPI_MAX_OUTPUT_TOKENS ?? env.MICIRQL_TEXT_MODEL_MAX_OUTPUT_TOKENS,
      "AIMLAPI_MAX_OUTPUT_TOKENS",
    );

    return {
      id: clean(env.AIMLAPI_PROFILE_ID) ?? "aimlapi-text",
      endpoint: aimlApiEndpoint ?? AIMLAPI_DEFAULT_ENDPOINT,
      apiKey: aimlApiKey,
      model: aimlApiModel,
      pricing: {
        inputUsdPerMillionTokens: optionalPrice(
          env.AIMLAPI_INPUT_USD_PER_MILLION ?? env.MICIRQL_TEXT_MODEL_INPUT_USD_PER_MILLION,
          "AIMLAPI_INPUT_USD_PER_MILLION",
        ),
        outputUsdPerMillionTokens: optionalPrice(
          env.AIMLAPI_OUTPUT_USD_PER_MILLION ?? env.MICIRQL_TEXT_MODEL_OUTPUT_USD_PER_MILLION,
          "AIMLAPI_OUTPUT_USD_PER_MILLION",
        ),
      },
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
    };
  }

  const endpoint = clean(env.MICIRQL_TEXT_MODEL_ENDPOINT);
  const apiKey = clean(env.MICIRQL_TEXT_MODEL_API_KEY);
  const model = clean(env.MICIRQL_TEXT_MODEL);
  if (!endpoint && !apiKey && !model) return undefined;
  if (!endpoint) throw new Error("MICIRQL_TEXT_MODEL_ENDPOINT is required when text AI is configured.");
  if (!apiKey) throw new Error("MICIRQL_TEXT_MODEL_API_KEY is required when text AI is configured.");
  if (!model) throw new Error("MICIRQL_TEXT_MODEL is required when text AI is configured.");

  const temperature = optionalNumber(env.MICIRQL_TEXT_MODEL_TEMPERATURE, "MICIRQL_TEXT_MODEL_TEMPERATURE");
  const maxOutputTokens = optionalInteger(env.MICIRQL_TEXT_MODEL_MAX_OUTPUT_TOKENS, "MICIRQL_TEXT_MODEL_MAX_OUTPUT_TOKENS");

  return {
    id: clean(env.MICIRQL_TEXT_MODEL_PROFILE_ID) ?? "primary-text",
    endpoint,
    apiKey,
    model,
    pricing: {
      inputUsdPerMillionTokens: requiredPrice(env.MICIRQL_TEXT_MODEL_INPUT_USD_PER_MILLION, "MICIRQL_TEXT_MODEL_INPUT_USD_PER_MILLION"),
      outputUsdPerMillionTokens: requiredPrice(env.MICIRQL_TEXT_MODEL_OUTPUT_USD_PER_MILLION, "MICIRQL_TEXT_MODEL_OUTPUT_USD_PER_MILLION"),
    },
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
  };
}

export function plannerModelFromEnvironment(env: TextProviderEnvironment) {
  const config = textProviderConfigFromEnvironment(env);
  return config ? createOpenAiCompatibleJsonPlannerModel(config) : undefined;
}

function clean(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function requiredPrice(value: string | undefined, name: string): number {
  const parsed = optionalNumber(value, name);
  if (parsed === undefined) throw new Error(`${name} is required when text AI is configured.`);
  if (parsed < 0) throw new Error(`${name} must not be negative.`);
  return parsed;
}

function optionalPrice(value: string | undefined, name: string): number {
  const parsed = optionalNumber(value, name);
  return parsed ?? 0;
}

function optionalNumber(value: string | undefined, name: string): number | undefined {
  const next = clean(value);
  if (next === undefined) return undefined;
  const parsed = Number(next);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a finite number.`);
  return parsed;
}

function optionalInteger(value: string | undefined, name: string): number | undefined {
  const parsed = optionalNumber(value, name);
  if (parsed === undefined) return undefined;
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
