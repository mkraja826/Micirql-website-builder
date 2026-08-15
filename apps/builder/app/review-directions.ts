import type { Site } from "@micirql/schema";
import { FAMILY_CODES, SECTION_FAMILIES, sectionDesignId, type SectionFamily, type SectionVariant } from "@micirql/sections";
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
  hero: SectionVariant;
  body: SectionVariant[];
  reverseBody?: boolean;
};

const RECIPES: DirectionRecipe[] = [
  { name: "Executive Split", description: "Balanced authority with a strong split hero and structured service proof.", hero: 1, body: [1, 2, 1, 3] },
  { name: "Visual First", description: "Image-first opening with compact, conversion-focused supporting sections.", hero: 2, body: [2, 1, 3, 2] },
  { name: "Centered Confidence", description: "A calm centered statement followed by highly scannable business content.", hero: 3, body: [3, 1, 2, 3] },
  { name: "Editorial Authority", description: "Editorial hierarchy, asymmetric rhythm and stronger visual pacing.", hero: 4, body: [4, 2, 1, 4] },
  { name: "Immersive Brand", description: "A cinematic opening with restrained supporting sections underneath.", hero: 5, body: [1, 3, 2, 5] },
  { name: "Precision Grid", description: "Dense, systematic presentation for capability-heavy professional businesses.", hero: 1, body: [2, 2, 4, 2] },
  { name: "Modern Narrative", description: "A story-led sequence with alternating visual emphasis.", hero: 2, body: [3, 4, 1, 2], reverseBody: true },
  { name: "Quiet Premium", description: "Spacious centered composition with minimal visual noise.", hero: 3, body: [3, 3, 1, 4] },
  { name: "Bold Editorial", description: "Large hierarchy and rail-based content for a more distinctive identity.", hero: 4, body: [4, 4, 2, 5] },
  { name: "Cinematic Conversion", description: "Immersive first impression followed by direct conversion sections.", hero: 5, body: [2, 1, 3, 2] },
  { name: "Corporate Minimal", description: "Conservative structure with premium spacing and clear hierarchy.", hero: 1, body: [1, 3, 1, 3] },
  { name: "Portfolio Forward", description: "Visual emphasis suited to businesses that need to showcase work and capability.", hero: 2, body: [4, 2, 3, 4] },
  { name: "Trust First", description: "Centered authority with proof and contact content brought forward.", hero: 3, body: [2, 3, 2, 1], reverseBody: true },
  { name: "Studio Editorial", description: "Sharper editorial composition with asymmetric section treatments.", hero: 4, body: [5, 4, 3, 2] },
  { name: "Brand Immersion", description: "Strong branded opening with spacious, image-friendly supporting content.", hero: 5, body: [3, 5, 1, 3] },
  { name: "Conversion Split", description: "Split layouts keep calls to action visible throughout the page.", hero: 1, body: [2, 5, 2, 4] },
  { name: "Dynamic Showcase", description: "Visual-first hero and horizontally expressive content sections.", hero: 2, body: [4, 4, 5, 2] },
  { name: "Premium Calm", description: "Centered, spacious design with softer rhythm and fewer competing elements.", hero: 3, body: [5, 3, 3, 5] },
  { name: "Architectural", description: "Strong alignment, editorial numbering and deliberate section contrast.", hero: 4, body: [2, 4, 5, 4] },
  { name: "High Impact", description: "Cinematic brand presence paired with bold conversion bands.", hero: 5, body: [5, 2, 4, 5] },
];

export function buildReviewDirections(site: Site, profile: OnboardingProfile, count = 20): ReviewDirection[] {
  const industry = clean(profile.industry) || clean(profile.subindustry) || "your business";
  return RECIPES.slice(0, Math.min(count, RECIPES.length)).map((recipe, index) => {
    const composed = composeDirection(site, recipe);
    return {
      id: `business-direction-${String(index + 1).padStart(2, "0")}`,
      name: recipe.name,
      description: recipe.description,
      reasons: [`built for ${industry}`, "preserves your business content", "preserves logo-derived brand colors"],
      site: composed,
      themeFamily: composed.theme.family,
      variantSeed: index,
    };
  });
}

function composeDirection(site: Site, recipe: DirectionRecipe): Site {
  const next = structuredClone(site);
  for (const page of next.pages) {
    let bodyIndex = 0;
    page.sections.forEach((section) => {
      const family = sectionFamilyFromComponentId(section.component.componentId);
      if (!family) return;
      const variant = family === "hero" ? recipe.hero : recipe.body[bodyIndex++ % recipe.body.length]!;
      section.component.componentId = sectionDesignId(next.theme.family, family, variant);
    });

    if (recipe.reverseBody && page.sections.length > 3) {
      const first = page.sections[0];
      const last = page.sections[page.sections.length - 1];
      const middle = page.sections.slice(1, -1).reverse();
      page.sections = [first!, ...middle, last!];
    }
  }
  return next;
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
