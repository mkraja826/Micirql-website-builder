import type { ArtDirection, ArtDirectionInput } from "./schema";

const DIRECTIONS = [
  { label: "Editorial", style: "editorial", hero: "asymmetric editorial split", density: "medium" as const, geometry: "structured asymmetry" },
  { label: "Cinematic", style: "cinematic", hero: "immersive image-led hero", density: "low" as const, geometry: "full-bleed composition" },
  { label: "Quiet Luxury", style: "quiet-luxury", hero: "minimal statement hero", density: "low" as const, geometry: "generous whitespace" },
  { label: "Warm Modern", style: "warm-modern", hero: "human-centered split hero", density: "medium" as const, geometry: "soft structured layout" },
  { label: "Typography Led", style: "typography-led", hero: "oversized type hero", density: "medium" as const, geometry: "strong typographic grid" },
  { label: "Conversion Focused", style: "conversion-focused", hero: "clear value-plus-action split", density: "high" as const, geometry: "ordered conversion hierarchy" },
  { label: "Gallery Led", style: "gallery-led", hero: "visual collage hero", density: "medium" as const, geometry: "modular image composition" },
  { label: "Immersive Dark", style: "immersive-dark", hero: "dark cinematic hero", density: "low" as const, geometry: "high-contrast full-bleed" },
] as const;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function createArtDirections(input: ArtDirectionInput, count = 8): ArtDirection[] {
  const visualVocabulary = input.industryKnowledge.visualVocabulary ?? [];
  const imagery = input.industryKnowledge.imagery ?? [];
  const requiredSections = input.industryKnowledge.requiredSections ?? ["hero", "about", "services", "cta", "contact"];
  const conversionActions = input.industryKnowledge.conversionActions ?? [input.primaryGoal];
  const prohibited = input.industryKnowledge.avoid ?? [];

  return Array.from({ length: count }, (_, index) => {
    const seed = DIRECTIONS[index % DIRECTIONS.length];
    const mood = unique([seed.style, ...input.brandTraits.slice(0, 2), ...visualVocabulary.slice(index % Math.max(1, visualVocabulary.length), 2)]).slice(0, 5);

    return {
      id: `direction-${String(index + 1).padStart(2, "0")}`,
      label: seed.label,
      rationale: `${seed.label} direction for ${input.subIndustry ?? input.industry}, optimized for ${input.primaryGoal}.`,
      visualStyle: seed.style,
      mood,
      typography: {
        personality: seed.style === "quiet-luxury" ? "refined and restrained" : seed.style === "typography-led" ? "expressive and distinctive" : "clear and premium",
        headingDirection: seed.style === "editorial" ? "editorial display typography with confident scale" : "strong hierarchy with distinctive headings",
        bodyDirection: "high-legibility body typography with comfortable measure",
      },
      color: {
        strategy: `derive an industry-appropriate palette supporting ${seed.style}; never default to generic SaaS purple`,
        contrastMode: seed.style === "immersive-dark" ? "dark" : seed.style === "cinematic" ? "mixed" : "light",
        accentBehavior: "use accent sparingly for conversion and emphasis",
      },
      imagery: {
        strategy: imagery.length ? "use industry-specific authentic imagery" : "use authentic business-relevant imagery",
        subjects: imagery,
        treatment: seed.style === "cinematic" || seed.style === "immersive-dark" ? "large immersive crops" : "art-directed crops integrated with layout",
      },
      layout: {
        heroArchitecture: seed.hero,
        density: seed.density,
        rhythm: index % 2 === 0 ? "alternating spacious and informative sections" : "progressive narrative from trust to conversion",
        geometry: seed.geometry,
      },
      motion: {
        intensity: seed.style === "cinematic" || seed.style === "gallery-led" ? "moderate" : "subtle",
        guidance: "motion must support hierarchy and never become decorative noise",
      },
      sectionIntent: requiredSections.map((type) => ({
        type,
        purpose: type === "hero" ? `establish value and drive ${input.primaryGoal}` : `fulfil the ${type} role for this business`,
        preferredTraits: unique([seed.style, ...visualVocabulary]).slice(0, 4),
      })),
      conversionStrategy: conversionActions,
      avoid: unique([
        ...prohibited,
        "fabricated business facts",
        "generic component-library appearance",
        "repetitive card grids without purpose",
        "random section mixing",
      ]),
    };
  });
}
