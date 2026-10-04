import type {
  BrandTokens,
  CompositionGateReport,
  CompositionIdentity,
  Domain,
  ImageStrategy,
  PaletteStrategy,
  ThemeConfig,
  ThemeFamily,
  ThemeModifier,
  TypographyStrategy,
  WebsiteArchetype,
} from "@micirql/schema";
import {
  DENTAL_COMPONENT_VERSION,
  SECTION_FAMILIES,
  isDentalCertifiedSection,
  sectionDesignId,
  type SectionFamily,
  type SectionVariant,
} from "@micirql/sections";

export const DESIGN_REVIEW_COUNT = 20;
export const DENTAL_CATALOG_VERSION = "dental-flagship-2026.10.03";
export const DENTAL_SUBTYPE = "dental" as const;
export const DENTAL_REQUIRED_PAGE_PATHS = ["/", "/services", "/doctors", "/about", "/contact"] as const;
export const DENTAL_REQUIRED_ACTIONS = ["lead.create", "appointment.request"] as const;

export type IndustryDesignPreset = {
  id: string;
  catalogVersion: string;
  recipeId: string;
  name: string;
  description: string;
  domain: "clinic";
  subtype: typeof DENTAL_SUBTYPE;
  archetype: Extract<WebsiteArchetype, "healthcare-clinic">;
  theme: ThemeConfig;
  variants: Record<SectionFamily, SectionVariant>;
  sectionOrder: SectionFamily[];
  paletteStrategy: PaletteStrategy;
  typographyStrategy: TypographyStrategy;
  imageStrategy: ImageStrategy;
  styleTags: string[];
  rankSeed: number;
  requiredPagePaths: readonly string[];
  requiredActions: readonly string[];
  gate: CompositionGateReport;
};

type CompositionRecipe = {
  id: string;
  name: string;
  description: string;
  family: ThemeFamily;
  modifiers: ThemeModifier[];
  paletteStrategy: PaletteStrategy;
  typographyStrategy: TypographyStrategy;
  density: BrandTokens["density"];
  shape: BrandTokens["shape"];
  motion: BrandTokens["motion"];
  imageStrategy: ImageStrategy;
  styleTags: string[];
  variant: Extract<SectionVariant, 1 | 2>;
  sectionOrder: SectionFamily[];
};

const baseColors = { success: "#168a4a", warning: "#9a5b00", error: "#b42318" };
const DENTAL_PALETTES: Record<PaletteStrategy, BrandTokens["colors"]> = {
  "light-corporate": { primary: "#0f766e", secondary: "#164e63", accent: "#14b8a6", background: "#fbfffe", surface: "#edf9f7", textPrimary: "#102a2a", textSecondary: "#476664", border: "#c8e0dc", ...baseColors },
  "brand-heavy": { primary: "#155e75", secondary: "#0c3340", accent: "#0d9488", background: "#f7fbfc", surface: "#e8f4f5", textPrimary: "#0b2830", textSecondary: "#49666d", border: "#c7dcdf", ...baseColors },
  editorial: { primary: "#315f5a", secondary: "#243b3a", accent: "#b26d48", background: "#fffdf8", surface: "#f4f0e7", textPrimary: "#272d2c", textSecondary: "#666f6d", border: "#ddd8cd", ...baseColors },
  "dark-premium": { primary: "#7dd3c7", secondary: "#d9f2ee", accent: "#d4a76a", background: "#081b20", surface: "#102c33", textPrimary: "#f4fbfa", textSecondary: "#b7ccca", border: "#315058", success: "#66d19e", warning: "#f0bf72", error: "#ff9389" },
  "color-block": { primary: "#075985", secondary: "#0f766e", accent: "#c35f42", background: "#f8fcff", surface: "#e8f4f7", textPrimary: "#112d38", textSecondary: "#536c75", border: "#c9dce3", ...baseColors },
  "soft-tint": { primary: "#237a73", secondary: "#466a79", accent: "#6f9f98", background: "#fbfefd", surface: "#eef7f5", textPrimary: "#1b3333", textSecondary: "#597070", border: "#d2e2df", ...baseColors },
};

const TYPOGRAPHY: Record<TypographyStrategy, BrandTokens["typography"]> = {
  "corporate-sans": { display: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  "humanist-sans": { display: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, sans-serif", body: "Avenir Next, Avenir, Segoe UI, ui-sans-serif, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  "editorial-serif": { display: "Iowan Old Style, Baskerville, Georgia, serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  "geometric-modern": { display: "Manrope, Avenir Next, ui-sans-serif, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  "luxury-serif": { display: "Bodoni 72, Didot, Iowan Old Style, Georgia, serif", body: "Avenir Next, Inter, ui-sans-serif, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  technical: { display: "IBM Plex Sans, Inter, ui-sans-serif, sans-serif", body: "IBM Plex Sans, Inter, ui-sans-serif, sans-serif", ui: "IBM Plex Mono, ui-monospace, monospace", mono: "IBM Plex Mono, ui-monospace, monospace" },
  "friendly-rounded": { display: "Nunito Sans, Avenir Next, ui-sans-serif, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
  "high-impact-display": { display: "Arial Black, Manrope, ui-sans-serif, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif" },
};

const FAMILY_MODIFIERS: Record<ThemeFamily, ThemeModifier[]> = {
  minimalist: ["light", "sharp", "motion-subtle"],
  corporate: ["light", "geometric", "motion-subtle"],
  luxury: ["photography-led", "motion-subtle", "rounded"],
  editorial: ["photography-led", "sharp", "texture-grain"],
  glass: ["gradient", "3d-depth", "motion-subtle"],
  maximalist: ["gradient", "motion-rich", "texture-grain"],
  organic: ["rounded", "liquid", "illustrative"],
  futuristic: ["dark", "neon-glow", "geometric"],
  playful: ["rounded", "illustrative", "motion-rich"],
  cinematic: ["dark", "photography-led", "motion-subtle"],
};

const descriptions: Record<string, string> = {
  precision: "A disciplined dental journey from treatment clarity to appointment action.",
  "calm-clarity": "A spacious and reassuring clinic narrative for patients who value a gentle experience.",
  "editorial-authority": "An expert-led dental story with treatment education and restrained clinical proof.",
  "quiet-luxury": "A refined clinic experience with generous space and discreet conversion cues.",
  "modern-assurance": "A polished dental system balancing modern technology, clarity and reassurance.",
  "human-connection": "A warm, people-first dental story focused on comfort and easy contact.",
  "future-ready": "A technology-forward clinic composition that avoids unsupported treatment claims.",
  "story-led": "A cinematic patient journey built from factual clinic details and approved dental media.",
  "bold-momentum": "A decisive modular dental layout for services and direct appointment conversion.",
  "local-character": "A welcoming neighbourhood dental composition grounded in place, people and access.",
  "structured-confidence": "A compact clinical grid foregrounding treatments, process and appointment readiness.",
  "clear-path": "A conversion-focused dental sequence with an explicit step-by-step visit journey.",
  "field-journal": "A documentary clinic profile that introduces the practice before treatment choices.",
  "premium-welcome": "An immersive clinic opening that moves from atmosphere to appointment action.",
  "contemporary-grid": "A modular dental system with layered surfaces and flexible treatment storytelling.",
  "warm-authority": "An approachable dental composition balancing expertise, empathy and clear next steps.",
  "evidence-first": "A rigorous dental layout prioritising verified practice facts and treatment information.",
  "immersive-narrative": "Large-scale approved dental media and paced storytelling for a memorable introduction.",
  "vibrant-practice": "An expressive clinic composition with energetic hierarchy and a grounded care journey.",
  "gentle-confidence": "A friendly dental composition for clear services, calm expectations and easy contact.",
};

const o = (...families: SectionFamily[]) => families;
const recipe = (
  id: string,
  name: string,
  family: ThemeFamily,
  variant: 1 | 2,
  paletteStrategy: PaletteStrategy,
  typographyStrategy: TypographyStrategy,
  density: BrandTokens["density"],
  imageStrategy: ImageStrategy,
  styleTags: string[],
  sectionOrder: SectionFamily[],
  motion: BrandTokens["motion"] = "subtle",
): CompositionRecipe => ({
  id,
  name,
  description: descriptions[id] ?? name,
  family,
  modifiers: [...FAMILY_MODIFIERS[family]],
  paletteStrategy,
  typographyStrategy,
  density,
  shape: ["minimalist", "corporate", "editorial", "futuristic"].includes(family) ? "sharp" : family === "organic" || family === "playful" || family === "glass" ? "soft" : "balanced",
  motion,
  imageStrategy,
  styleTags,
  variant,
  sectionOrder,
});

export const COMPOSITION_RECIPES: readonly CompositionRecipe[] = [
  recipe("precision", "Precision", "corporate", 1, "light-corporate", "corporate-sans", "compact", "restrained", ["professional","trust","clear"], o("navbar","hero","services","features","process","testimonials","team","gallery","about","cta","contact","footer")),
  recipe("calm-clarity", "Calm Clarity", "minimalist", 1, "soft-tint", "humanist-sans", "comfortable", "people-led", ["minimal","friendly","calm"], o("navbar","hero","about","services","process","features","team","testimonials","gallery","cta","contact","footer")),
  recipe("editorial-authority", "Editorial Authority", "editorial", 1, "editorial", "editorial-serif", "spacious", "editorial-crop", ["editorial","premium","authority"], o("navbar","hero","about","features","services","gallery","process","team","testimonials","cta","contact","footer")),
  recipe("quiet-luxury", "Quiet Luxury", "luxury", 1, "dark-premium", "luxury-serif", "spacious", "immersive", ["luxury","premium","exclusive"], o("navbar","hero","gallery","about","services","features","team","testimonials","process","cta","contact","footer")),
  recipe("modern-assurance", "Modern Assurance", "glass", 1, "soft-tint", "geometric-modern", "comfortable", "product-detail", ["modern","premium","technology"], o("navbar","hero","features","services","about","process","gallery","team","testimonials","contact","cta","footer"), "standard"),
  recipe("human-connection", "Human Connection", "organic", 1, "soft-tint", "friendly-rounded", "comfortable", "people-led", ["friendly","warm","human"], o("navbar","hero","about","team","services","process","testimonials","features","gallery","cta","contact","footer"), "standard"),
  recipe("future-ready", "Future Ready", "futuristic", 1, "brand-heavy", "technical", "comfortable", "product-detail", ["modern","technology","bold"], o("navbar","hero","features","process","services","gallery","about","team","testimonials","cta","contact","footer")),
  recipe("story-led", "Story Led", "cinematic", 1, "dark-premium", "high-impact-display", "spacious", "immersive", ["cinematic","bold","story"], o("navbar","hero","about","gallery","services","team","features","process","testimonials","contact","cta","footer")),
  recipe("bold-momentum", "Bold Momentum", "maximalist", 1, "color-block", "high-impact-display", "comfortable", "editorial-crop", ["bold","modern","energetic"], o("navbar","hero","services","gallery","features","about","process","team","testimonials","cta","contact","footer"), "standard"),
  recipe("local-character", "Local Character", "playful", 1, "color-block", "friendly-rounded", "comfortable", "documentary", ["local","friendly","trust"], o("navbar","hero","gallery","about","services","team","testimonials","process","features","contact","cta","footer"), "standard"),
  recipe("structured-confidence", "Structured Confidence", "corporate", 2, "brand-heavy", "corporate-sans", "comfortable", "documentary", ["professional","structured","conversion"], o("navbar","hero","services","process","features","testimonials","about","team","gallery","contact","cta","footer")),
  recipe("clear-path", "Clear Path", "minimalist", 2, "light-corporate", "geometric-modern", "compact", "restrained", ["minimal","clear","conversion"], o("navbar","hero","process","services","cta","features","about","team","testimonials","gallery","contact","footer")),
  recipe("field-journal", "Field Journal", "editorial", 2, "brand-heavy", "humanist-sans", "comfortable", "documentary", ["editorial","story","authentic"], o("navbar","hero","gallery","about","team","services","process","features","testimonials","cta","contact","footer"), "standard"),
  recipe("premium-welcome", "Premium Welcome", "luxury", 2, "editorial", "editorial-serif", "comfortable", "editorial-crop", ["premium","luxury","immersive"], o("navbar","hero","gallery","services","about","features","team","process","testimonials","contact","cta","footer"), "standard"),
  recipe("contemporary-grid", "Contemporary Grid", "glass", 2, "color-block", "corporate-sans", "compact", "documentary", ["modern","creative","grid"], o("navbar","hero","features","gallery","services","team","about","process","testimonials","cta","contact","footer")),
  recipe("warm-authority", "Warm Authority", "organic", 2, "editorial", "editorial-serif", "spacious", "editorial-crop", ["warm","premium","trust"], o("navbar","hero","about","testimonials","services","team","features","gallery","process","cta","contact","footer")),
  recipe("evidence-first", "Evidence First", "futuristic", 2, "light-corporate", "corporate-sans", "compact", "restrained", ["proof","professional","clear"], o("navbar","hero","features","services","process","about","team","gallery","testimonials","contact","cta","footer"), "none"),
  recipe("immersive-narrative", "Immersive Narrative", "cinematic", 2, "brand-heavy", "editorial-serif", "spacious", "people-led", ["cinematic","premium","immersive"], o("navbar","hero","gallery","features","about","team","services","testimonials","process","cta","contact","footer"), "rich"),
  recipe("vibrant-practice", "Vibrant Practice", "maximalist", 2, "brand-heavy", "geometric-modern", "spacious", "people-led", ["bold","human","distinctive"], o("navbar","hero","team","services","features","gallery","about","process","testimonials","contact","cta","footer"), "rich"),
  recipe("gentle-confidence", "Gentle Confidence", "playful", 2, "soft-tint", "humanist-sans", "spacious", "restrained", ["friendly","calm","accessible"], o("navbar","hero","process","about","services","team","features","testimonials","gallery","cta","contact","footer")),
] as const;

export function listIndustryDesignPresets(domain: Domain, subtype?: string | null): IndustryDesignPreset[] {
  if (domain !== "clinic" || !isDentalSubtype(subtype)) return [];
  const candidates = COMPOSITION_RECIPES.map((item, index) => ({
    id: "clinic-dental-" + item.id,
    catalogVersion: DENTAL_CATALOG_VERSION,
    recipeId: item.id,
    name: "Dental · " + item.name,
    description: item.description,
    domain: "clinic" as const,
    subtype: DENTAL_SUBTYPE,
    archetype: "healthcare-clinic" as const,
    theme: themeFor(item),
    variants: variantsFor(item.variant),
    sectionOrder: [...item.sectionOrder],
    paletteStrategy: item.paletteStrategy,
    typographyStrategy: item.typographyStrategy,
    imageStrategy: item.imageStrategy,
    styleTags: [...item.styleTags],
    rankSeed: index + 1,
    requiredPagePaths: DENTAL_REQUIRED_PAGE_PATHS,
    requiredActions: DENTAL_REQUIRED_ACTIONS,
    gate: { passed: true, score: 92, issues: [] },
  } satisfies IndustryDesignPreset));
  const issues = validateCompositionCandidates(candidates);
  if (issues.length) throw new Error("Invalid dental composition catalog: " + issues.join(" "));
  return candidates;
}

export const INDUSTRY_DESIGN_PRESETS = listIndustryDesignPresets("clinic");

export function compositionIdentityForPreset(candidate: IndustryDesignPreset): CompositionIdentity {
  return {
    id: candidate.id,
    catalogVersion: candidate.catalogVersion,
    archetype: candidate.archetype,
    domain: candidate.domain,
    subtype: candidate.subtype,
    recipeId: candidate.recipeId,
    sectionOrder: [...candidate.sectionOrder],
    components: SECTION_FAMILIES.map((family) => ({ family, componentId: sectionDesignId(candidate.theme.family, family, candidate.variants[family]), version: DENTAL_COMPONENT_VERSION })),
    designSystem: candidate.theme.family,
    modifiers: [...candidate.theme.modifiers],
    paletteStrategy: candidate.paletteStrategy,
    typographyStrategy: candidate.typographyStrategy,
    density: candidate.theme.brand.density,
    imageStrategy: candidate.imageStrategy,
    motionStrategy: candidate.theme.brand.motion,
  };
}

export function compositionSignature(value: IndustryDesignPreset | CompositionIdentity): string {
  const identity = "theme" in value ? compositionIdentityForPreset(value) : value;
  return JSON.stringify({ archetype: identity.archetype, domain: identity.domain, subtype: identity.subtype, sectionOrder: identity.sectionOrder, components: identity.components, designSystem: identity.designSystem, modifiers: identity.modifiers, paletteStrategy: identity.paletteStrategy, typographyStrategy: identity.typographyStrategy, density: identity.density, imageStrategy: identity.imageStrategy, motionStrategy: identity.motionStrategy });
}

export function validateCompositionCandidates(candidates: IndustryDesignPreset[]): string[] {
  const issues: string[] = [];
  if (candidates.length !== DESIGN_REVIEW_COUNT) issues.push("Expected " + DESIGN_REVIEW_COUNT + " candidates, received " + candidates.length + ".");
  if (candidates.some((candidate) => candidate.domain !== "clinic" || candidate.subtype !== DENTAL_SUBTYPE)) issues.push("A candidate crossed the certified clinic/dental boundary.");
  if (candidates.some((candidate) => candidate.catalogVersion !== DENTAL_CATALOG_VERSION)) issues.push("Every candidate must use the active dental catalog version.");
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) issues.push("Candidate IDs must be unique.");
  if (new Set(candidates.map(compositionSignature)).size !== candidates.length) issues.push("Composition signatures must be unique.");
  for (const candidate of candidates) {
    const identity = compositionIdentityForPreset(candidate);
    const order = candidate.sectionOrder;
    if (order[0] !== "navbar" || order.at(-1) !== "footer") issues.push(candidate.id + " must begin with navbar and end with footer.");
    for (const required of ["navbar", "hero", "services", "cta", "contact", "footer"] as const) if (!order.includes(required)) issues.push(candidate.id + " is missing required family " + required + ".");
    if (new Set(order).size !== SECTION_FAMILIES.length || order.length !== SECTION_FAMILIES.length) issues.push(candidate.id + " must order every approved section family exactly once.");
    const uncertified = identity.components.filter((component) => !isDentalCertifiedSection(component.componentId, component.version));
    if (uncertified.length) issues.push(candidate.id + " uses non-certified components: " + uncertified.map((item) => item.componentId).join(", ") + ".");
  }
  const depths = dentalComponentDepth(candidates);
  const minimums: Record<SectionFamily, number> = { navbar: 12, hero: 20, about: 10, services: 15, features: 15, process: 10, testimonials: 10, gallery: 10, team: 10, cta: 12, contact: 10, footer: 12 };
  for (const family of SECTION_FAMILIES) if (depths[family] < minimums[family]) issues.push(family + " library depth is " + depths[family] + "; at least " + minimums[family] + " certified components are required.");
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      const comparison = compareCompositionIdentities(compositionIdentityForPreset(candidates[left]!), compositionIdentityForPreset(candidates[right]!));
      if (!comparison.materiallyDifferent) issues.push(candidates[left]!.id + " and " + candidates[right]!.id + " are not materially different (" + comparison.differingDimensions + " dimensions).");
    }
  }
  return [...new Set(issues)];
}

export function validateCompositionSet(candidates: IndustryDesignPreset[], domain: Domain): string[] {
  return [...(domain === "clinic" ? [] : ["Only the clinic/dental pack is certified."]), ...validateCompositionCandidates(candidates)];
}

export function dentalComponentDepth(candidates = INDUSTRY_DESIGN_PRESETS): Record<SectionFamily, number> {
  return Object.fromEntries(SECTION_FAMILIES.map((family) => [family, new Set(candidates.map((candidate) => sectionDesignId(candidate.theme.family, family, candidate.variants[family]))).size])) as Record<SectionFamily, number>;
}

export function compareCompositionIdentities(left: CompositionIdentity, right: CompositionIdentity) {
  const orderDiffers = JSON.stringify(left.sectionOrder) !== JSON.stringify(right.sectionOrder);
  const rightComponents = new Map(right.components.map((item) => [item.family, item.componentId]));
  const componentDifferences = left.components.filter((item) => rightComponents.get(item.family) !== item.componentId).length;
  const visualValues = [
    left.designSystem !== right.designSystem,
    JSON.stringify(left.modifiers) !== JSON.stringify(right.modifiers),
    left.paletteStrategy !== right.paletteStrategy,
    left.typographyStrategy !== right.typographyStrategy,
    left.density !== right.density,
    left.imageStrategy !== right.imageStrategy,
    left.motionStrategy !== right.motionStrategy,
  ];
  const differingDimensions = Number(orderDiffers) + Number(componentDifferences > 0) + visualValues.filter(Boolean).length;
  const structuralDifference = orderDiffers || componentDifferences >= 2;
  const visualDifference = visualValues.some(Boolean);
  return { differingDimensions, componentDifferences, structuralDifference, visualDifference, materiallyDifferent: differingDimensions >= 4 && structuralDifference && visualDifference };
}

export function isDentalSubtype(value?: string | null): boolean {
  if (!value?.trim()) return true;
  return isExplicitDentalSubtype(value);
}

export function isExplicitDentalSubtype(value?: string | null): boolean {
  return Boolean(
    value?.trim() &&
      /(?:^|[^a-z])(dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
        value,
      ),
  );
}

function variantsFor(variant: Extract<SectionVariant, 1 | 2>): Record<SectionFamily, SectionVariant> {
  return Object.fromEntries(SECTION_FAMILIES.map((family) => [family, variant])) as Record<SectionFamily, SectionVariant>;
}

function themeFor(item: CompositionRecipe): ThemeConfig {
  return { family: item.family, modifiers: [...item.modifiers], brand: { colors: { ...DENTAL_PALETTES[item.paletteStrategy] }, typography: { ...TYPOGRAPHY[item.typographyStrategy] }, density: item.density, shape: item.shape, motion: item.motion } };
}
