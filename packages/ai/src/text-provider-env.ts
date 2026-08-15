import { createOpenAiCompatibleJsonPlannerModel, type OpenAiCompatibleTextProviderConfig } from "./text-provider";

export type TextProviderEnvironment = Record<string, string | undefined>;

const GEMINI_OPENAI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

export function textProviderConfigFromEnvironment(env: TextProviderEnvironment): OpenAiCompatibleTextProviderConfig | undefined {
  const endpoint = clean(env.MICIRQL_TEXT_MODEL_ENDPOINT);
  const apiKey = clean(env.MICIRQL_TEXT_MODEL_API_KEY);
  const model = clean(env.MICIRQL_TEXT_MODEL);

  if (!endpoint && !apiKey && !model) {
    const geminiApiKey = clean(env.GEMINI_API_KEY);
    if (!geminiApiKey) return undefined;

    return {
      id: clean(env.MICIRQL_TEXT_MODEL_PROFILE_ID) ?? "gemini-testing",
      endpoint: GEMINI_OPENAI_ENDPOINT,
      apiKey: geminiApiKey,
      model: clean(env.GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL,
      pricing: {
        inputUsdPerMillionTokens: 0,
        outputUsdPerMillionTokens: 0,
      },
      temperature: optionalNumber(env.MICIRQL_TEXT_MODEL_TEMPERATURE, "MICIRQL_TEXT_MODEL_TEMPERATURE") ?? 0.2,
      maxOutputTokens: optionalInteger(env.MICIRQL_TEXT_MODEL_MAX_OUTPUT_TOKENS, "MICIRQL_TEXT_MODEL_MAX_OUTPUT_TOKENS") ?? 1200,
    };
  }

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
