export type LogoShape = "horizontal" | "square" | "vertical";
export type LogoTreatment = "direct" | "neutral-container" | "cleanup-recommended";

export type LogoIntelligenceInput = {
  width?: number;
  height?: number;
  hasTransparency?: boolean;
  edgeBackgroundRatio?: number;
  paletteDecision?: "use" | "repair" | "decouple";
  paletteScore?: number;
};

export type LogoIntelligenceResult = {
  shape: LogoShape;
  treatment: LogoTreatment;
  navbarMaxHeight: number;
  footerMaxHeight: number;
  paddingScale: number;
  preserveOriginal: true;
  reasons: string[];
};

/**
 * Decides presentation treatment only. It never mutates the customer's logo.
 * Cleanup/redesign can be offered as a separate explicit workflow later.
 */
export function evaluateLogoUsability(input: LogoIntelligenceInput): LogoIntelligenceResult {
  const width = positive(input.width) ?? 1;
  const height = positive(input.height) ?? 1;
  const ratio = width / height;
  const shape: LogoShape = ratio >= 1.65 ? "horizontal" : ratio <= 0.72 ? "vertical" : "square";
  const reasons: string[] = [];

  let treatment: LogoTreatment = "direct";
  let paddingScale = 1;

  const backgroundHeavy = typeof input.edgeBackgroundRatio === "number" && input.edgeBackgroundRatio >= 0.72;
  if (backgroundHeavy && !input.hasTransparency) {
    treatment = "neutral-container";
    paddingScale = 1.15;
    reasons.push("Logo appears to include a strong rectangular background, so it should sit on a controlled neutral surface.");
  }

  if (input.paletteDecision === "decouple") {
    treatment = "neutral-container";
    paddingScale = Math.max(paddingScale, 1.12);
    reasons.push("Website colors are decoupled from the logo, so a neutral logo surface prevents visual conflict.");
  }

  if ((input.paletteScore ?? 100) < 35 && backgroundHeavy) {
    treatment = "cleanup-recommended";
    reasons.push("Low palette quality plus a heavy embedded background makes cleanup worthwhile before prominent use.");
  }

  if (shape === "vertical") {
    paddingScale = Math.max(paddingScale, 1.08);
    reasons.push("Vertical logos need more restrained navbar sizing to avoid oversized navigation.");
  }

  if (!reasons.length) reasons.push("Logo can be placed directly with responsive size constraints.");

  return {
    shape,
    treatment,
    navbarMaxHeight: shape === "horizontal" ? 44 : shape === "square" ? 42 : 38,
    footerMaxHeight: shape === "horizontal" ? 58 : shape === "square" ? 54 : 48,
    paddingScale,
    preserveOriginal: true,
    reasons,
  };
}

function positive(value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
