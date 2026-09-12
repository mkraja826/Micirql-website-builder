import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import type { IndustryKnowledge } from "../industry/knowledge";

export type MediaRole = "hero" | "services" | "about" | "gallery" | "proof" | "context";
export type MediaSourceIntent = "supplied" | "curated" | "generated" | "fallback";
export type MediaVerification = "verified" | "generic-safe" | "needs-verification";

export type MediaIntent = {
  role: MediaRole;
  sourceIntent: MediaSourceIntent;
  subject: string;
  visualGoal: string;
  desiredAspect: string;
  preferredTags: string[];
  exclusions: string[];
  verification: MediaVerification;
  fallback: "none" | "neutral-placeholder";
};

export type MediaPlan = {
  industry: string;
  subIndustry?: string;
  businessType?: string;
  intents: MediaIntent[];
};

export type MediaPlanInput = {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  direction: ArtDirection;
  roles?: MediaRole[];
};

const PHOTO_LANGUAGE: Record<string, string[]> = {
  editorial: ["editorial", "natural light", "refined composition", "subtle asymmetry"],
  cinematic: ["cinematic", "directional light", "immersive", "atmospheric"],
  "quiet-luxury": ["quiet luxury", "soft daylight", "restrained", "architectural detail"],
  "warm-modern": ["warm modern", "natural daylight", "welcoming", "human scale"],
  "typography-led": ["minimal", "negative space", "graphic framing", "restrained detail"],
  "conversion-focused": ["bright", "clear", "approachable", "practical"],
  "gallery-led": ["visual storytelling", "varied crops", "texture", "detail"],
  "immersive-dark": ["moody", "low key", "dramatic contrast", "premium detail"],
  "framed-minimal": ["minimal", "clean lines", "negative space", "precise framing"],
  "soft-editorial": ["soft editorial", "diffuse daylight", "gentle tones", "tactile detail"],
  "clinical-refined": ["precise", "bright soft light", "clean geometry", "refined detail"],
  "human-narrative": ["documentary warmth", "candid detail", "natural light", "human scale"],
  "modern-heritage": ["timeless", "crafted detail", "classic proportion", "soft directional light"],
  "bold-contrast": ["high contrast", "strong light and shadow", "bold geometry", "striking crop"],
  "calm-monochrome": ["restrained", "tonal", "soft shadows", "quiet detail"],
  "precision-grid": ["precise", "modular geometry", "straight-on", "ordered composition"],
  "organic-premium": ["organic premium", "natural materials", "soft curves", "serene composition"],
  "statement-first": ["single subject", "strong negative space", "poster-like crop", "minimal visual noise"],
  "layered-depth": ["layered depth", "foreground and background", "dimensional", "selective focus"],
  "direct-modern": ["crisp", "contemporary", "bright", "direct composition"],
};

const ROLE_DEFAULTS: Record<MediaRole, { aspect: string; goal: string }> = {
  hero: { aspect: "16:9", goal: "establish the business context with one strong, credible visual" },
  services: { aspect: "16:9", goal: "support the offer with concrete business-relevant detail" },
  about: { aspect: "4:5", goal: "show atmosphere, environment or process without inventing people or credentials" },
  gallery: { aspect: "4:3", goal: "create a varied visual story using safe, business-relevant subjects" },
  proof: { aspect: "3:2", goal: "support verified evidence only; never imply unverified outcomes or endorsements" },
  context: { aspect: "3:2", goal: "provide useful contextual imagery without making business-specific claims" },
};

const DEFAULT_ROLES: MediaRole[] = ["hero", "services", "about"];

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function subjectFor(role: MediaRole, guidance: string[]) {
  if (!guidance.length) return role === "hero" ? "authentic business context" : "business-relevant detail";
  if (role === "hero") return guidance[0];
  if (role === "services") return guidance.slice(0, 3).join(", ");
  if (role === "about") return guidance.slice(-2).join(", ");
  return guidance.join(", ");
}

function exclusionList(brief: InterpretedBrief, knowledge: IndustryKnowledge) {
  return unique([
    ...knowledge.prohibitedAssumptions,
    ...brief.truth.prohibitedClaims,
    ...brief.truth.unknownFacts,
    ...((knowledge.visualVocabulary.avoid as string[] | undefined) ?? []),
    "fabricated people",
    "fabricated branding",
    "fabricated outcomes",
  ]);
}

export function planMedia(input: MediaPlanInput): MediaPlan {
  const { brief, knowledge, direction } = input;
  const roles = input.roles?.length ? input.roles : DEFAULT_ROLES;
  const guidance = unique(knowledge.imageryGuidance);
  const exclusions = exclusionList(brief, knowledge);
  const photoLanguage = PHOTO_LANGUAGE[direction.visualStyle] ?? ["authentic", "professional", "natural light"];

  const intents = roles.map<MediaIntent>((role) => {
    const defaults = ROLE_DEFAULTS[role];
    return {
      role,
      sourceIntent: "curated",
      subject: subjectFor(role, guidance),
      visualGoal: defaults.goal,
      desiredAspect: role === "hero" && direction.layout.heroArchitecture.toLowerCase().includes("split") ? "4:5" : defaults.aspect,
      preferredTags: unique([direction.visualStyle, ...direction.mood, ...photoLanguage, ...guidance]).slice(0, 12),
      exclusions,
      verification: "generic-safe",
      fallback: "neutral-placeholder",
    };
  });

  return {
    industry: brief.business.industry.value,
    subIndustry: brief.business.subIndustry?.value,
    businessType: brief.business.businessType?.value,
    intents,
  };
}

export function mediaIntent(plan: MediaPlan, role: MediaRole) {
  return plan.intents.find((intent) => intent.role === role);
}
