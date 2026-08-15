export type TokenPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

const MICRO_USD_PER_USD = 1_000_000;
const TOKENS_PER_MILLION = 1_000_000;

export function calculateTokenCostMicrousd(pricing: TokenPricing, usage: TokenUsage): number {
  assertNonNegativeFinite("inputUsdPerMillionTokens", pricing.inputUsdPerMillionTokens);
  assertNonNegativeFinite("outputUsdPerMillionTokens", pricing.outputUsdPerMillionTokens);
  assertNonNegativeInteger("inputTokens", usage.inputTokens);
  assertNonNegativeInteger("outputTokens", usage.outputTokens);

  const inputMicrousd = (usage.inputTokens / TOKENS_PER_MILLION) * pricing.inputUsdPerMillionTokens * MICRO_USD_PER_USD;
  const outputMicrousd = (usage.outputTokens / TOKENS_PER_MILLION) * pricing.outputUsdPerMillionTokens * MICRO_USD_PER_USD;
  return Math.round(inputMicrousd + outputMicrousd);
}

export function usdToMicrousd(usd: number): number {
  assertNonNegativeFinite("usd", usd);
  return Math.round(usd * MICRO_USD_PER_USD);
}

export function microusdToUsd(microusd: number): number {
  assertNonNegativeInteger("microusd", microusd);
  return microusd / MICRO_USD_PER_USD;
}

function assertNonNegativeFinite(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative finite number.`);
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
}
