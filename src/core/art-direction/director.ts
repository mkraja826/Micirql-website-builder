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
  { label: "Framed Minimal", style: "framed-minimal", hero: "framed statement hero", density: "low" as const, geometry: "architectural frame" },
  { label: "Soft Editorial", style: "soft-editorial", hero: "quiet editorial statement", density: "medium" as const, geometry: "soft asymmetry" },
  { label: "Clinical Refined", style: "clinical-refined", hero: "precision-led statement", density: "medium" as const, geometry: "measured modular grid" },
  { label: "Human Narrative", style: "human-narrative", hero: "story-first split composition", density: "medium" as const, geometry: "narrative stagger" },
  { label: "Modern Heritage", style: "modern-heritage", hero: "timeless framed hero", density: "low" as const, geometry: "classical proportion" },
  { label: "Bold Contrast", style: "bold-contrast", hero: "high-contrast statement hero", density: "medium" as const, geometry: "graphic blocks" },
  { label: "Calm Monochrome", style: "calm-monochrome", hero: "restrained monochrome hero", density: "low" as const, geometry: "quiet linear rhythm" },
  { label: "Precision Grid", style: "precision-grid", hero: "grid-led information hero", density: "high" as const, geometry: "strict modular grid" },
  { label: "Organic Premium", style: "organic-premium", hero: "soft premium split", density: "medium" as const, geometry: "rounded flowing composition" },
  { label: "Statement First", style: "statement-first", hero: "single dominant statement", density: "low" as const, geometry: "poster-like composition" },
  { label: "Layered Depth", style: "layered-depth", hero: "layered editorial hero", density: "medium" as const, geometry: "overlapping depth planes" },
  { label: "Direct Modern", style: "direct-modern", hero: "concise action-forward hero", density: "high" as const, geometry: "compact conversion grid" },
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
        personality: seed.style === "quiet-luxury" || seed.style === "modern-heritage" ? "refined and restrained" : seed.style === "typography-led" || seed.style === "statement-first" ? "expressive and distinctive" : seed.style === "clinical-refined" || seed.style === "precision-grid" ? "precise and disciplined" : "clear and premium",
        headingDirection: seed.style === "editorial" || seed.style === "soft-editorial" ? "editorial display typography with confident scale" : seed.style === "statement-first" ? "oversized statement typography with very short measure" : "strong hierarchy with distinctive headings",
        bodyDirection: "high-legibility body typography with comfortable measure",
      },
      color: {
        strategy: `derive an industry-appropriate palette supporting ${seed.style}; never default to generic SaaS purple`,
        contrastMode: seed.style === "immersive-dark" || seed.style === "bold-contrast" ? "dark" : seed.style === "cinematic" || seed.style === "layered-depth" ? "mixed" : "light",
        accentBehavior: "use accent sparingly for conversion and emphasis",
      },
      imagery: {
        strategy: imagery.length ? "use industry-specific authentic imagery" : "use authentic business-relevant imagery",
        subjects: imagery,
        treatment: seed.style === "cinematic" || seed.style === "immersive-dark" || seed.style === "gallery-led" || seed.style === "layered-depth" ? "large immersive crops" : "art-directed crops integrated with layout",
      },
      layout: {
        heroArchitecture: seed.hero,
        density: seed.density,
        rhythm: index % 3 === 0 ? "alternating spacious and informative sections" : index % 3 === 1 ? "progressive narrative from trust to conversion" : "statement-led opening followed by structured proof and action",
        geometry: seed.geometry,
      },
      motion: {
        intensity: seed.style === "cinematic" || seed.style === "gallery-led" || seed.style === "layered-depth" ? "moderate" : "subtle",
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
