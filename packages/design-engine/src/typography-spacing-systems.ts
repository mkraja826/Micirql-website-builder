export type TypographySystem = {
  id: string;
  name: string;
  display: string;
  body: string;
  ui: string;
  character: string[];
};

export type RhythmSystem = {
  id: string;
  name: string;
  density: "compact" | "comfortable" | "spacious";
  shape: "sharp" | "balanced" | "soft";
  surfaceTreatment: "flat" | "subtle-depth" | "deep";
  character: string[];
};

/**
 * System/native stacks keep generation fast and export-safe.
 * Hosted/custom fonts can be layered on later without changing the contract.
 */
export const TYPOGRAPHY_SYSTEMS: TypographySystem[] = [
  { id: "type-modern-grotesk", name: "Modern Grotesk", display: "Inter, ui-sans-serif, system-ui, sans-serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif", character: ["modern", "corporate", "saas", "clean"] },
  { id: "type-editorial-serif", name: "Editorial Serif", display: "Georgia, 'Times New Roman', serif", body: "Inter, ui-sans-serif, system-ui, sans-serif", ui: "Inter, ui-sans-serif, system-ui, sans-serif", character: ["editorial", "luxury", "authority", "story"] },
  { id: "type-humanist", name: "Humanist Professional", display: "'Trebuchet MS', ui-sans-serif, sans-serif", body: "Arial, ui-sans-serif, sans-serif", ui: "Arial, ui-sans-serif, sans-serif", character: ["friendly", "healthcare", "education", "service"] },
  { id: "type-geometric", name: "Geometric Display", display: "'Avenir Next', Avenir, 'Segoe UI', sans-serif", body: "'Segoe UI', Arial, sans-serif", ui: "'Segoe UI', Arial, sans-serif", character: ["technology", "creative", "bold", "product"] },
  { id: "type-classic-authority", name: "Classic Authority", display: "Garamond, Georgia, serif", body: "Arial, ui-sans-serif, sans-serif", ui: "Arial, ui-sans-serif, sans-serif", character: ["legal", "consulting", "heritage", "premium"] },
  { id: "type-neutral-ui", name: "Neutral UI", display: "system-ui, -apple-system, 'Segoe UI', sans-serif", body: "system-ui, -apple-system, 'Segoe UI', sans-serif", ui: "system-ui, -apple-system, 'Segoe UI', sans-serif", character: ["utility", "commerce", "platform", "minimal"] },
  { id: "type-condensed-impact", name: "Condensed Impact", display: "Impact, 'Arial Narrow', sans-serif", body: "Arial, ui-sans-serif, sans-serif", ui: "Arial, ui-sans-serif, sans-serif", character: ["campaign", "bold", "retail", "high-impact"] },
  { id: "type-soft-premium", name: "Soft Premium", display: "Palatino, 'Book Antiqua', Georgia, serif", body: "'Trebuchet MS', ui-sans-serif, sans-serif", ui: "'Trebuchet MS', ui-sans-serif, sans-serif", character: ["hospitality", "wellness", "luxury", "calm"] },
];

export const RHYTHM_SYSTEMS: RhythmSystem[] = [
  { id: "rhythm-compact-sharp", name: "Compact Precision", density: "compact", shape: "sharp", surfaceTreatment: "flat", character: ["technical", "dense", "editorial", "enterprise"] },
  { id: "rhythm-compact-balanced", name: "Compact Product", density: "compact", shape: "balanced", surfaceTreatment: "subtle-depth", character: ["saas", "commerce", "dashboard", "conversion"] },
  { id: "rhythm-comfortable-balanced", name: "Balanced Professional", density: "comfortable", shape: "balanced", surfaceTreatment: "subtle-depth", character: ["corporate", "professional", "general"] },
  { id: "rhythm-comfortable-soft", name: "Friendly Comfortable", density: "comfortable", shape: "soft", surfaceTreatment: "subtle-depth", character: ["healthcare", "education", "service", "friendly"] },
  { id: "rhythm-spacious-sharp", name: "Editorial Spacious", density: "spacious", shape: "sharp", surfaceTreatment: "flat", character: ["editorial", "architecture", "portfolio", "luxury"] },
  { id: "rhythm-spacious-balanced", name: "Premium Spacious", density: "spacious", shape: "balanced", surfaceTreatment: "subtle-depth", character: ["premium", "corporate", "minimal", "authority"] },
  { id: "rhythm-spacious-soft", name: "Soft Luxury", density: "spacious", shape: "soft", surfaceTreatment: "deep", character: ["hospitality", "wellness", "luxury", "brand"] },
];

export function typographySystemAt(index: number): TypographySystem {
  return TYPOGRAPHY_SYSTEMS[index % TYPOGRAPHY_SYSTEMS.length]!;
}

export function rhythmSystemAt(index: number): RhythmSystem {
  return RHYTHM_SYSTEMS[index % RHYTHM_SYSTEMS.length]!;
}
