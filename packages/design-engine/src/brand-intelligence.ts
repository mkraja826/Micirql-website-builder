export type BrandIntelligenceInput = {
  industry?: string;
  businessType?: string;
  audience?: string;
  paletteDecision?: "use" | "repair" | "decouple";
  paletteScore?: number;
  logoShape?: "horizontal" | "square" | "vertical";
  premium?: boolean;
};

export type BrandIntelligenceProfile = {
  tone: "clinical" | "corporate" | "premium" | "friendly" | "bold" | "editorial" | "neutral";
  typographyMood: "technical" | "humanist" | "editorial" | "geometric" | "classic";
  density: "compact" | "comfortable" | "spacious";
  shape: "sharp" | "balanced" | "soft";
  buttonStyle: "solid" | "soft" | "outline-accent" | "high-contrast";
  imageryStyle: "clean-realistic" | "editorial-lifestyle" | "product-led" | "architectural" | "minimal-illustrative";
  motion: "none" | "subtle" | "standard" | "rich";
  recommendations: string[];
};

const CLINICAL = /dental|dentist|clinic|medical|health|hospital|doctor|pharma|wellness/i;
const CORPORATE = /consult|enterprise|b2b|software|saas|technology|tech|finance|legal|account|industrial|manufactur/i;
const PROPERTY = /real estate|property|architect|interior|construction|hotel|hospitality/i;
const FOOD = /restaurant|cafe|food|bakery|hospitality/i;
const CREATIVE = /creative|design|studio|fashion|beauty|photography|media|agency/i;

export function deriveBrandIntelligence(input: BrandIntelligenceInput): BrandIntelligenceProfile {
  const descriptor = [input.industry, input.businessType, input.audience].filter(Boolean).join(" ");
  const premium = input.premium === true || /luxury|premium|boutique|exclusive/i.test(descriptor);
  const isClinical = CLINICAL.test(descriptor);
  const recommendations: string[] = [];

  let tone: BrandIntelligenceProfile["tone"] = "neutral";
  let typographyMood: BrandIntelligenceProfile["typographyMood"] = "humanist";
  let density: BrandIntelligenceProfile["density"] = "comfortable";
  let shape: BrandIntelligenceProfile["shape"] = "balanced";
  let buttonStyle: BrandIntelligenceProfile["buttonStyle"] = "solid";
  let imageryStyle: BrandIntelligenceProfile["imageryStyle"] = "clean-realistic";
  let motion: BrandIntelligenceProfile["motion"] = "subtle";

  if (isClinical) {
    tone = "clinical";
    typographyMood = "humanist";
    density = "comfortable";
    shape = "soft";
    buttonStyle = "solid";
    imageryStyle = "clean-realistic";
    motion = "subtle";
    recommendations.push("Prioritize trust, clarity and calm spacing over decorative styling.");
  } else if (CORPORATE.test(descriptor)) {
    tone = "corporate";
    typographyMood = "geometric";
    density = "comfortable";
    shape = "balanced";
    buttonStyle = "high-contrast";
    imageryStyle = "product-led";
    motion = "subtle";
    recommendations.push("Use restrained hierarchy, strong CTA contrast and proof-led imagery.");
  } else if (PROPERTY.test(descriptor)) {
    tone = premium ? "premium" : "editorial";
    typographyMood = "editorial";
    density = "spacious";
    shape = "balanced";
    buttonStyle = "outline-accent";
    imageryStyle = "architectural";
    motion = "standard";
    recommendations.push("Give imagery more visual weight and keep copy blocks concise.");
  } else if (FOOD.test(descriptor)) {
    tone = "friendly";
    typographyMood = "humanist";
    density = "comfortable";
    shape = "soft";
    buttonStyle = "solid";
    imageryStyle = "editorial-lifestyle";
    motion = "standard";
    recommendations.push("Use appetizing real photography and warm interaction cues.");
  } else if (CREATIVE.test(descriptor)) {
    tone = premium ? "premium" : "bold";
    typographyMood = premium ? "editorial" : "geometric";
    density = "spacious";
    shape = premium ? "balanced" : "sharp";
    buttonStyle = premium ? "outline-accent" : "high-contrast";
    imageryStyle = "editorial-lifestyle";
    motion = premium ? "standard" : "rich";
    recommendations.push("Allow stronger visual personality while preserving readable hierarchy.");
  }

  if (premium) {
    density = "spacious";
    motion = motion === "rich" ? "standard" : motion;
    if (isClinical) {
      tone = "clinical";
      typographyMood = "humanist";
      imageryStyle = "clean-realistic";
      shape = "soft";
      recommendations.push("Premium healthcare should feel calm and precise, using refined spacing and real clinical imagery rather than fashion-style display typography.");
    } else {
      tone = "premium";
      typographyMood = "editorial";
      recommendations.push("Premium positioning should use restraint: more whitespace, fewer competing accents and slower motion.");
    }
  }

  if (typeof input.paletteScore === "number" && input.paletteScore < 55) {
    motion = motion === "rich" ? "standard" : motion;
    buttonStyle = "high-contrast";
    recommendations.push("Because the source palette is weak, rely on typography, spacing and contrast—not extra color—for brand character.");
  }

  if (input.paletteDecision === "decouple") {
    recommendations.push("Keep website styling independent from unreliable logo colors while preserving the logo itself.");
  }

  if (input.logoShape === "vertical") {
    recommendations.push("Reserve additional brand whitespace so the vertical mark never compresses navigation.");
  }

  return { tone, typographyMood, density, shape, buttonStyle, imageryStyle, motion, recommendations };
}
