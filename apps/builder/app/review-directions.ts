import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
import { PALETTE_STRATEGIES, blueprintRuleFor, typographySystemAt, rhythmSystemAt } from "@micirql/design-engine";
import type { OnboardingProfile } from "./preset-ranking";

export type ReviewDirection = {
  id: string;
  name: string;
  description: string;
  reasons: string[];
  site: Site;
  themeFamily: string;
  variantSeed: number;
};

type DirectionRecipe = {
  name: string;
  description: string;
  palette: string;
  variants: Partial<Record<SectionFamily, SectionVariant>>;
  sequence?: SectionFamily[];
};

const RECIPES: DirectionRecipe[] = [
  { name: "Executive Authority", description: "Structured, calm and trust-led with clear conversion points.", palette: "light-corporate", variants: { navbar: 1, hero: 1, about: 2, services: 2, features: 1, process: 2, testimonials: 3, gallery: 1, team: 3, cta: 2, contact: 1, footer: 1 } },
  { name: "Visual First", description: "Image-forward opening and richer visual storytelling throughout the page.", palette: "editorial", variants: { navbar: 4, hero: 2, about: 1, services: 1, features: 3, process: 1, testimonials: 2, gallery: 2, team: 1, cta: 3, contact: 2, footer: 5 } },
  { name: "Centered Confidence", description: "Calm centered hierarchy with highly scannable supporting sections.", palette: "light-corporate", variants: { navbar: 3, hero: 3, about: 3, services: 3, features: 1, process: 3, testimonials: 1, gallery: 1, team: 1, cta: 3, contact: 3, footer: 2 } },
  { name: "Editorial Authority", description: "Asymmetric editorial rhythm for a more distinctive premium identity.", palette: "editorial", variants: { navbar: 5, hero: 4, about: 4, services: 4, features: 4, process: 4, testimonials: 2, gallery: 4, team: 4, cta: 4, contact: 2, footer: 5 } },
  { name: "Brand Immersion", description: "Strong brand presence using cinematic and full-color conversion moments.", palette: "brand-heavy", variants: { navbar: 5, hero: 5, about: 5, services: 5, features: 5, process: 5, testimonials: 5, gallery: 5, team: 5, cta: 5, contact: 5, footer: 3 } },
  { name: "Precision Grid", description: "Systematic content presentation for capability-heavy businesses.", palette: "light-corporate", variants: { navbar: 1, hero: 1, about: 2, services: 1, features: 3, process: 2, testimonials: 3, gallery: 1, team: 1, cta: 2, contact: 1, footer: 1 } },
  { name: "Modern Narrative", description: "Alternating story rhythm with visual and proof sections working together.", palette: "editorial", variants: { navbar: 4, hero: 2, about: 2, services: 4, features: 2, process: 4, testimonials: 2, gallery: 4, team: 3, cta: 4, contact: 2, footer: 3 }, sequence: ["navbar", "hero", "about", "services", "gallery", "features", "process", "testimonials", "team", "cta", "contact", "footer"] },
  { name: "Quiet Premium", description: "Spacious, restrained design with fewer competing visual elements.", palette: "editorial", variants: { navbar: 5, hero: 3, about: 3, services: 3, features: 2, process: 2, testimonials: 2, gallery: 4, team: 3, cta: 4, contact: 3, footer: 5 } },
  { name: "Bold Editorial", description: "Large hierarchy, branded blocks and expressive horizontal rhythm.", palette: "color-block", variants: { navbar: 4, hero: 4, about: 4, services: 5, features: 4, process: 5, testimonials: 5, gallery: 3, team: 4, cta: 5, contact: 4, footer: 5 } },
  { name: "Cinematic Conversion", description: "Immersive first impression followed by direct conversion-focused sections.", palette: "dark-premium", variants: { navbar: 5, hero: 5, about: 2, services: 1, features: 5, process: 2, testimonials: 5, gallery: 5, team: 5, cta: 5, contact: 5, footer: 3 } },
  { name: "Corporate Minimal", description: "Conservative structure, clear hierarchy and dependable professional rhythm.", palette: "light-corporate", variants: { navbar: 1, hero: 1, about: 1, services: 2, features: 2, process: 1, testimonials: 3, gallery: 1, team: 1, cta: 2, contact: 1, footer: 1 } },
  { name: "Portfolio Forward", description: "Project and imagery-led composition without sacrificing conversion clarity.", palette: "editorial", variants: { navbar: 4, hero: 2, about: 4, services: 4, features: 3, process: 4, testimonials: 2, gallery: 2, team: 4, cta: 4, contact: 2, footer: 5 }, sequence: ["navbar", "hero", "gallery", "about", "services", "features", "testimonials", "process", "team", "cta", "contact", "footer"] },
  { name: "Trust First", description: "Proof and expert credibility appear earlier for high-consideration decisions.", palette: "light-corporate", variants: { navbar: 2, hero: 3, about: 2, services: 2, features: 1, process: 2, testimonials: 3, gallery: 1, team: 2, cta: 2, contact: 4, footer: 4 }, sequence: ["navbar", "hero", "testimonials", "team", "services", "about", "features", "process", "gallery", "cta", "contact", "footer"] },
  { name: "Studio Editorial", description: "Design-led asymmetry and refined typography for visually ambitious brands.", palette: "editorial", variants: { navbar: 5, hero: 4, about: 4, services: 4, features: 4, process: 4, testimonials: 2, gallery: 4, team: 4, cta: 4, contact: 2, footer: 5 } },
  { name: "Dark Premium", description: "High-contrast brand shell with elevated content and luminous calls to action.", palette: "dark-premium", variants: { navbar: 5, hero: 5, about: 5, services: 5, features: 5, process: 5, testimonials: 5, gallery: 5, team: 5, cta: 5, contact: 5, footer: 3 } },
  { name: "Conversion Split", description: "Split layouts keep actions and decision-making content consistently visible.", palette: "brand-heavy", variants: { navbar: 2, hero: 1, about: 2, services: 2, features: 2, process: 2, testimonials: 3, gallery: 3, team: 3, cta: 2, contact: 2, footer: 3 } },
  { name: "Dynamic Showcase", description: "Visual-first sections and horizontal rails create a more energetic experience.", palette: "color-block", variants: { navbar: 4, hero: 2, about: 4, services: 4, features: 3, process: 3, testimonials: 4, gallery: 3, team: 4, cta: 5, contact: 4, footer: 5 } },
  { name: "Premium Calm", description: "Soft, spacious rhythm with refined content hierarchy and understated conversion.", palette: "editorial", variants: { navbar: 3, hero: 3, about: 3, services: 3, features: 2, process: 4, testimonials: 2, gallery: 4, team: 3, cta: 4, contact: 3, footer: 5 } },
  { name: "Architectural", description: "Strong alignment, numbered structure and deliberate section contrast.", palette: "color-block", variants: { navbar: 5, hero: 4, about: 4, services: 2, features: 4, process: 4, testimonials: 3, gallery: 2, team: 4, cta: 4, contact: 4, footer: 5 } },
  { name: "High Impact", description: "Strong branded surfaces and assertive conversion moments for maximum presence.", palette: "brand-heavy", variants: { navbar: 4, hero: 5, about: 5, services: 5, features: 5, process: 5, testimonials: 5, gallery: 2, team: 5, cta: 5, contact: 5, footer: 3 } },
];

export function buildReviewDirections(site: Site, profile: OnboardingProfile, count = 20): ReviewDirection[] {
  const industry = clean(profile.industry) || clean(profile.subindustry) || "your business";
  const archetypeId = resolveArchetype(profile);
  const rule = blueprintRuleFor(archetypeId);

  return RECIPES.slice(0, Math.min(count, RECIPES.length)).map((recipe, index) => {
    const typography = typographySystemAt(index);
    const rhythm = rhythmSystemAt(index + Math.floor(index / 5));
    const composed = composeDirection(site, recipe, typography, rhythm);
    const palette = PALETTE_STRATEGIES.find((candidate) => candidate.id === recipe.palette);
    return {
      id: `business-direction-${String(index + 1).padStart(2, "0")}`,
      name: recipe.name,
      description: recipe.description,
      reasons: [
        `built for ${industry}`,
        `${archetypeId.replace(/-/g, " ")} composition`,
        palette ? `${palette.name} color strategy` : "logo-derived color strategy",
        `${typography.name} typography`,
        `${rhythm.name} spacing and shape`,
        rule ? `${rule.conversionMode} conversion mode` : "business-specific conversion flow",
        "preserves your business content",
      ],
      site: composed,
      themeFamily: composed.theme.family,
      variantSeed: index,
    };
  });
}

function composeDirection(site: Site, recipe: DirectionRecipe, typography: ReturnType<typeof typographySystemAt>, rhythm: ReturnType<typeof rhythmSystemAt>): Site {
  const next = structuredClone(site);
  next.theme.brand.typography = {
    ...next.theme.brand.typography,
    display: typography.display,
    body: typography.body,
    ui: typography.ui,
  };
  next.theme.brand.density = rhythm.density;
  next.theme.brand.shape = rhythm.shape;
  if (rhythm.surfaceTreatment === "deep" && !next.theme.modifiers.includes("3d-depth")) {
    next.theme.modifiers = [...next.theme.modifiers.filter((modifier) => modifier !== "3d-depth"), "3d-depth"].slice(0, 3);
  } else if (rhythm.surfaceTreatment === "flat") {
    next.theme.modifiers = next.theme.modifiers.filter((modifier) => modifier !== "3d-depth");
  }

  for (const page of next.pages) {
    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (!family) continue;
      const variant = recipe.variants[family] ?? 1;
      section.component.componentId = sectionDesignId(next.theme.family, family, variant);
    }

    if (recipe.sequence?.length) {
      const order = new Map(recipe.sequence.map((family, index) => [family, index]));
      page.sections = [...page.sections].sort((a, b) => {
        const familyA = sectionFamilyFromComponentId(a.component.componentId);
        const familyB = sectionFamilyFromComponentId(b.component.componentId);
        return (familyA ? order.get(familyA) ?? 999 : 999) - (familyB ? order.get(familyB) ?? 999 : 999);
      });
    }
  }
  return next;
}

function resolveArchetype(profile: OnboardingProfile): string {
  const text = `${clean(profile.industry)} ${clean(profile.subindustry)}`;
  if (/dental|clinic|medical|health|physio|diagnostic/.test(text)) return "healthcare-clinic";
  if (/restaurant|cafe|hotel|resort|hospitality/.test(text)) return "hospitality";
  if (/real estate|property|builder|developer|broker/.test(text)) return "real-estate";
  if (/ecommerce|e-commerce|retail|store|shop|boutique/.test(text)) return "ecommerce";
  if (/saas|software|technology|tech|app|platform/.test(text)) return "saas-technology";
  if (/portfolio|creative|design|architect|photograph|studio/.test(text)) return "portfolio-creative";
  if (/education|training|academy|course|school|tutor/.test(text)) return "education-training";
  if (/manufactur|industrial|enterprise|corporate/.test(text)) return "corporate-company";
  if (/consult|legal|law|account|agency|professional|it service/.test(text)) return "professional-services";
  return "local-service";
}

function sectionFamilyFromComponentId(componentId: string): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find((family) => normalized === `${family}.placeholder` || normalized.startsWith(`${family}.`));
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) => upper.includes(`-${FAMILY_CODES[family]}-`));
}

function clean(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "";
}
