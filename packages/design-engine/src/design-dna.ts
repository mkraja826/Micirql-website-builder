export type TasteLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type DesignDnaInput = {
  industry?: string | null;
  subindustry?: string | null;
  businessName?: string | null;
  goals?: string[] | null;
  styleTags?: string[] | null;
  services?: string[] | null;
  notes?: string | null;
};

export type DesignDna = {
  version: 1;
  variance: TasteLevel;
  density: TasteLevel;
  motion: TasteLevel;
  trust: TasteLevel;
  warmth: TasteLevel;
  luxury: TasteLevel;
  editorial: TasteLevel;
  conversionIntensity: TasteLevel;
  visualDominance: TasteLevel;
  typography: "clinical-sans" | "humanist-sans" | "editorial-serif" | "modern-grotesk" | "luxury-serif";
  spacing: "compact" | "balanced" | "airy" | "editorial";
  radius: "square" | "soft" | "rounded" | "pill-accent";
  heroStrategy: "authority-split" | "editorial-image" | "immersive-media" | "conversion-first" | "doctor-led";
  photography: "clinical" | "portrait-led" | "lifestyle" | "outcome-led" | "technology-led";
  sectionRhythm: "alternating" | "editorial" | "minimal" | "conversion" | "immersive";
  rationale: string[];
};

/**
 * Converts an onboarding brief into deterministic visual taste controls.
 * This is intentionally rule-based: AI can propose copy/assets, but the visual
 * character remains inspectable, reproducible and safe to score downstream.
 */
export function deriveDesignDna(input: DesignDnaInput): DesignDna {
  const text = normalize([
    input.industry,
    input.subindustry,
    input.businessName,
    ...(input.goals ?? []),
    ...(input.styleTags ?? []),
    ...(input.services ?? []),
    input.notes,
  ].filter(Boolean).join(" "));

  const dental = /dental|dentist|dentistry|orthodont|implant|endodont|smile|veneer|root canal/.test(text);
  const cosmetic = /cosmetic|smile|veneer|whitening|aesthetic/.test(text);
  const implant = /implant|full mouth|all-on/.test(text);
  const family = /family|pediatric|children|general dentistry/.test(text);
  const technology = /digital|scanner|technology|precision|3d|cad|cam/.test(text);
  const premium = /premium|luxury|high-end|boutique|elegant|sophisticated|exclusive/.test(text);
  const clinical = /clinical|specialist|expert|authority|trust|professional/.test(text) || dental;
  const warm = /warm|friendly|calm|reassuring|approachable|family/.test(text);
  const editorialSignal = /editorial|magazine|fashion|minimal|refined|sophisticated/.test(text);
  const visual = /visual|gallery|before|after|outcome|photography|results/.test(text) || cosmetic;
  const conversion = /book|appointment|enquir|consultation|call|whatsapp|lead|contact/.test(text);
  const expressive = /bold|experimental|creative|dynamic|cinematic|immersive/.test(text);

  const luxury = level(4 + (premium ? 4 : 0) + (cosmetic ? 1 : 0));
  const trust = level(5 + (clinical ? 3 : 0) + (implant ? 1 : 0));
  const warmth = level(4 + (warm ? 3 : 0) + (family ? 2 : 0) - (premium && !warm ? 1 : 0));
  const editorial = level(3 + (editorialSignal ? 4 : 0) + (premium ? 1 : 0) + (cosmetic ? 1 : 0));
  const visualDominance = level(4 + (visual ? 3 : 0) + (cosmetic ? 1 : 0) + (technology ? 1 : 0));
  const conversionIntensity = level(4 + (conversion ? 4 : 0) + (family ? 1 : 0));
  const variance = level(4 + (expressive ? 3 : 0) + (editorialSignal ? 1 : 0) + (cosmetic ? 1 : 0) - (clinical && !cosmetic ? 1 : 0));
  const density = level(5 + (conversion ? 1 : 0) + (technology ? 1 : 0) - (premium ? 2 : 0) - (editorialSignal ? 1 : 0));
  const motion = level(3 + (expressive ? 3 : 0) + (technology ? 1 : 0) - (clinical ? 1 : 0));

  const typography: DesignDna["typography"] = premium
    ? (editorial >= 7 ? "luxury-serif" : "editorial-serif")
    : technology
      ? "modern-grotesk"
      : warm
        ? "humanist-sans"
        : "clinical-sans";

  const spacing: DesignDna["spacing"] = luxury >= 8 || editorial >= 8
    ? "editorial"
    : density <= 4
      ? "airy"
      : density >= 8
        ? "compact"
        : "balanced";

  const radius: DesignDna["radius"] = premium && editorial >= 7
    ? "square"
    : cosmetic || warm
      ? "rounded"
      : conversionIntensity >= 8
        ? "pill-accent"
        : "soft";

  const heroStrategy: DesignDna["heroStrategy"] = visualDominance >= 8 && editorial >= 7
    ? "editorial-image"
    : technology && variance >= 6
      ? "immersive-media"
      : implant && trust >= 8
        ? "doctor-led"
        : conversionIntensity >= 9
          ? "conversion-first"
          : "authority-split";

  const photography: DesignDna["photography"] = cosmetic
    ? "outcome-led"
    : technology
      ? "technology-led"
      : implant || premium
        ? "portrait-led"
        : warm
          ? "lifestyle"
          : "clinical";

  const sectionRhythm: DesignDna["sectionRhythm"] = editorial >= 8
    ? "editorial"
    : motion >= 7
      ? "immersive"
      : conversionIntensity >= 8
        ? "conversion"
        : density <= 4
          ? "minimal"
          : "alternating";

  const rationale: string[] = [];
  if (premium) rationale.push("premium/luxury language increases whitespace, restraint and typographic character");
  if (clinical) rationale.push("clinical trust signals keep hierarchy clear and evidence-led");
  if (cosmetic) rationale.push("cosmetic services increase visual dominance and outcome-led photography");
  if (implant) rationale.push("implant intent increases clinician authority and trust weighting");
  if (family) rationale.push("family-care signals increase warmth and approachable interaction patterns");
  if (technology) rationale.push("technology signals support modern typography and stronger motion/media treatment");
  if (conversion) rationale.push("appointment intent increases conversion intensity without allowing CTA repetition to dominate");
  if (!rationale.length) rationale.push("balanced defaults preserve a professional baseline while leaving room for industry-specific ranking");

  return {
    version: 1,
    variance,
    density,
    motion,
    trust,
    warmth,
    luxury,
    editorial,
    conversionIntensity,
    visualDominance,
    typography,
    spacing,
    radius,
    heroStrategy,
    photography,
    sectionRhythm,
    rationale,
  };
}

/**
 * Scores how well a curated blueprint's declared design traits match the Design
 * DNA. This is a ranking signal only; it never bypasses QA/certification gates.
 */
export function scoreDesignDnaMatch(
  dna: DesignDna,
  blueprint: {
    archetype?: string | null;
    styleTags?: string[] | null;
    design?: {
      density?: string | null;
      imageStyle?: string | null;
      radius?: string | null;
      sectionRhythm?: string | null;
    } | null;
  },
): number {
  const haystack = normalize([
    blueprint.archetype,
    ...(blueprint.styleTags ?? []),
    blueprint.design?.density,
    blueprint.design?.imageStyle,
    blueprint.design?.radius,
    blueprint.design?.sectionRhythm,
  ].filter(Boolean).join(" "));

  let score = 0;
  if (dna.luxury >= 7 && /premium|luxury|boutique|editorial|minimal/.test(haystack)) score += 6;
  if (dna.trust >= 8 && /clinical|authority|doctor|expert|trust/.test(haystack)) score += 5;
  if (dna.visualDominance >= 8 && /visual|image|outcome|portrait|gallery/.test(haystack)) score += 5;
  if (dna.conversionIntensity >= 8 && /conversion|lead|appointment|direct/.test(haystack)) score += 4;
  if (dna.motion >= 7 && /immersive|experimental|modern|technology/.test(haystack)) score += 3;
  if (dna.warmth >= 7 && /family|friendly|warm|approachable|lifestyle/.test(haystack)) score += 4;
  if (blueprint.design?.sectionRhythm === dna.sectionRhythm) score += 4;
  if (blueprint.design?.imageStyle === dna.photography) score += 4;
  if (blueprint.design?.radius === dna.radius) score += 2;

  const density = normalize(blueprint.design?.density ?? "");
  if ((dna.density <= 4 && density === "airy") || (dna.density >= 8 && density === "compact") || (dna.density > 4 && dna.density < 8 && density === "balanced")) score += 3;

  return Math.max(0, Math.min(30, score));
}

function level(value: number): TasteLevel {
  return Math.max(1, Math.min(10, Math.round(value))) as TasteLevel;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_–—]/g, "-").replace(/\s+/g, " ");
}
