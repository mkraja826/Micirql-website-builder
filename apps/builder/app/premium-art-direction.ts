import { siteSchema, type Site } from "@micirql/schema";

export type PremiumArtDirectionInput = {
  industry: string;
  subindustry?: string | null;
  styleTags: string[];
  goals: string[];
};

export type PremiumArtDirection = {
  id: string;
  family: Site["theme"]["family"];
  tone: NonNullable<Site["theme"]["brand"]["intelligence"]>["tone"];
  typographyMood: NonNullable<Site["theme"]["brand"]["intelligence"]>["typographyMood"];
  buttonStyle: NonNullable<Site["theme"]["brand"]["intelligence"]>["buttonStyle"];
  imageryStyle: NonNullable<Site["theme"]["brand"]["intelligence"]>["imageryStyle"];
  typography: Site["theme"]["brand"]["typography"];
  density: Site["theme"]["brand"]["density"];
  shape: Site["theme"]["brand"]["shape"];
  motion: Site["theme"]["brand"]["motion"];
  reasons: string[];
};

export type PremiumArtDirectionResult = {
  site: Site;
  direction: PremiumArtDirection;
};

const PREMIUM_WORDS = new Set(["premium", "luxury", "elegant", "refined", "high-end", "high end", "boutique"]);
const EDITORIAL_WORDS = new Set(["editorial", "minimal", "minimalist", "clean", "quiet", "sophisticated"]);
const WARM_WORDS = new Set(["warm", "friendly", "human", "organic", "welcoming", "natural"]);
const BOLD_WORDS = new Set(["bold", "dramatic", "cinematic", "immersive", "confident"]);

export function applyPremiumArtDirection(site: Site, input: PremiumArtDirectionInput): PremiumArtDirectionResult {
  const direction = selectPremiumArtDirection(input);
  const candidate = structuredClone(site);

  candidate.theme.family = direction.family;
  candidate.theme.modifiers = direction.family === "luxury" || direction.family === "editorial"
    ? ["motion-subtle", "photography-led"]
    : direction.family === "cinematic"
      ? ["motion-rich", "photography-led"]
      : ["motion-subtle"];
  candidate.theme.brand.typography = { ...direction.typography };
  candidate.theme.brand.density = direction.density;
  candidate.theme.brand.shape = direction.shape;
  candidate.theme.brand.motion = direction.motion;
  candidate.theme.brand.intelligence = {
    tone: direction.tone,
    typographyMood: direction.typographyMood,
    buttonStyle: direction.buttonStyle,
    imageryStyle: direction.imageryStyle,
    recommendations: [
      `Art direction locked: ${direction.id}.`,
      "Preserve one typography system across every page.",
      "Preserve one surface/radius/motion language across every section.",
      "Use brand accent deliberately rather than as a default section background.",
      "Prefer varied editorial rhythm over consecutive card grids.",
      ...direction.reasons,
    ].slice(0, 12),
  };

  return { site: siteSchema.parse(candidate), direction };
}

export function selectPremiumArtDirection(input: PremiumArtDirectionInput): PremiumArtDirection {
  const tags = normalize(input.styleTags);
  const domain = `${input.industry} ${input.subindustry ?? ""}`.toLowerCase();
  const healthcare = /dental|dentist|clinic|health|medical|wellness/.test(domain);

  if (hasAny(tags, BOLD_WORDS) && !healthcare) {
    return direction("cinematic-bold", "cinematic", "bold", "geometric", "high-contrast", "architectural", "Manrope", "Inter", "Inter", "spacious", "balanced", "standard", ["Bold intent is explicit in the brief."]);
  }

  if (hasAny(tags, WARM_WORDS)) {
    return direction("warm-modern", "organic", "friendly", "humanist", "solid", healthcare ? "human-lifestyle" : "editorial-lifestyle", "Manrope", "Inter", "Inter", "spacious", "soft", "subtle", ["Warm/human intent is explicit in the brief."]);
  }

  if (hasAny(tags, PREMIUM_WORDS) || healthcare) {
    return direction("quiet-premium", hasAny(tags, EDITORIAL_WORDS) ? "editorial" : "luxury", "premium", hasAny(tags, EDITORIAL_WORDS) ? "editorial" : "classic", "high-contrast", healthcare ? "clean-realistic" : "editorial-lifestyle", hasAny(tags, EDITORIAL_WORDS) ? "DM Serif Display" : "Cormorant Garamond", "Inter", "Inter", "spacious", "sharp", "subtle", [healthcare ? "Healthcare defaults to calm premium restraint rather than SaaS styling." : "Premium intent is explicit in the brief."]);
  }

  if (hasAny(tags, EDITORIAL_WORDS)) {
    return direction("editorial-minimal", "editorial", "editorial", "editorial", "outline-accent", "editorial", "DM Serif Display", "Inter", "Inter", "spacious", "sharp", "subtle", ["Editorial/minimal intent is explicit in the brief."]);
  }

  return direction("modern-premium", "minimalist", "neutral", "geometric", "solid", "clean-realistic", "Manrope", "Inter", "Inter", "comfortable", "balanced", "subtle", ["Fallback uses the restrained premium baseline rather than unconstrained styling."]);
}

function direction(
  id: string,
  family: PremiumArtDirection["family"],
  tone: PremiumArtDirection["tone"],
  typographyMood: PremiumArtDirection["typographyMood"],
  buttonStyle: PremiumArtDirection["buttonStyle"],
  imageryStyle: PremiumArtDirection["imageryStyle"],
  display: string,
  body: string,
  ui: string,
  density: PremiumArtDirection["density"],
  shape: PremiumArtDirection["shape"],
  motion: PremiumArtDirection["motion"],
  reasons: string[],
): PremiumArtDirection {
  return { id, family, tone, typographyMood, buttonStyle, imageryStyle, typography: { display, body, ui }, density, shape, motion, reasons };
}

function normalize(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

function hasAny(values: Set<string>, candidates: Set<string>): boolean {
  for (const value of values) if (candidates.has(value)) return true;
  return false;
}
