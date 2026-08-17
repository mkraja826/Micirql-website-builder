export type FaviconStrategy = "reuse-logo" | "derive-symbol" | "initial-mark";

export type FaviconIntelligenceInput = {
  logoShape?: "horizontal" | "square" | "vertical";
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  cleanupApplied?: boolean;
  businessName?: string;
};

export type FaviconIntelligenceResult = {
  strategy: FaviconStrategy;
  targetSize: 256;
  safePaddingRatio: number;
  initial?: string;
  reasons: string[];
};

/**
 * Chooses how MiCirql should create a compact browser/app mark.
 * A long wordmark should never simply be shrunk to favicon size.
 */
export function evaluateFaviconStrategy(input: FaviconIntelligenceInput): FaviconIntelligenceResult {
  const width = positive(input.width);
  const height = positive(input.height);
  const ratio = width && height ? width / height : undefined;
  const shape = input.logoShape ?? (ratio ? (ratio >= 1.65 ? "horizontal" : ratio <= 0.72 ? "vertical" : "square") : undefined);
  const reasons: string[] = [];

  if (shape === "square" && (input.hasTransparency || input.cleanupApplied)) {
    reasons.push("Compact square artwork is suitable for direct favicon reuse.");
    return { strategy: "reuse-logo", targetSize: 256, safePaddingRatio: 0.12, reasons };
  }

  if (shape === "horizontal") {
    reasons.push("Horizontal wordmarks become unreadable at browser-icon sizes, so a compact symbol should be derived instead.");
    return { strategy: "derive-symbol", targetSize: 256, safePaddingRatio: 0.1, reasons };
  }

  if (shape === "vertical") {
    reasons.push("Vertical artwork needs a compact crop before favicon use.");
    return { strategy: "derive-symbol", targetSize: 256, safePaddingRatio: 0.11, reasons };
  }

  const initial = firstInitial(input.businessName);
  reasons.push("No reliable compact logo mark is available, so use a controlled brand initial rather than an unreadable logo.");
  return { strategy: "initial-mark", targetSize: 256, safePaddingRatio: 0.16, ...(initial ? { initial } : {}), reasons };
}

function positive(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function firstInitial(value?: string) {
  const match = value?.trim().match(/[\p{L}\p{N}]/u);
  return match?.[0]?.toUpperCase();
}
