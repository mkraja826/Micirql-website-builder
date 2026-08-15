export const MICIRQL_PROTOCOL_VERSION = "1.0.0";

export const MOBILE_TEST_WIDTHS = [320, 360, 390, 430] as const;

export const PERFORMANCE_BUDGETS = {
  clientJsKb: 180,
  imageKbAboveFold: 350,
  totalFontKb: 160,
  thirdPartyScriptCount: 4,
} as const;

export const MIN_TAP_TARGET_PX = 44;

export const PROTOCOL_PRIORITY = [
  "functionality",
  "mobile",
  "performance",
  "accessibility",
  "seo",
  "security",
] as const;
