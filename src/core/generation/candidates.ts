import { createArtDirections } from "../art-direction/director";
import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import { compileThemeTokens, themeTokensToCssVariables } from "../theme/compiler";
import type { IndustryKnowledge } from "../industry/knowledge";
import { SECTION_CATALOG } from "../../sections/catalog";
import { EXPANDED_SECTION_CATALOG } from "../../sections/expansion";
import type { CompleteSectionDefinition } from "../../sections/schema";

export type SiteCandidatePlan = {
  id: string;
  direction: ArtDirection;
  selectedSections: Record<string, string>;
  sectionOrder: string[];
  theme: ReturnType<typeof compileThemeTokens>;
  cssVariables: ReturnType<typeof themeTokensToCssVariables>;
};

type CompositionFamily = {
  id: string;
  narrativeOrder: string[];
  optionalSlots?: string[];
};

const ALL_SECTIONS = [...SECTION_CATALOG, ...EXPANDED_SECTION_CATALOG];
const MAJOR_VISUAL_TYPES = ["hero", "services", "about", "cta"];
const DIVERSITY_TYPES = ["hero", "services", "about", "cta", "navbar", "footer"];
const MIN_MAJOR_DISTANCE = 2;

const COMPOSITION_FAMILIES: CompositionFamily[] = [
  { id: "offer-led", narrativeOrder: ["hero", "services", "about", "cta", "contact"] },
  { id: "story-led", narrativeOrder: ["hero", "about", "services", "cta", "contact"] },
  { id: "conversion-led", narrativeOrder: ["hero", "services", "cta", "about", "contact"] },
  { id: "credibility-led", narrativeOrder: ["hero", "about", "cta", "services", "contact"] },
  { id: "journey-led", narrativeOrder: ["hero", "about", "process", "services", "cta", "contact"], optionalSlots: ["process"] },
  { id: "decision-led", narrativeOrder: ["hero", "services", "process", "cta", "about", "contact"], optionalSlots: ["process"] },
  { id: "editorial-led", narrativeOrder: ["hero", "about", "services", "process", "cta", "contact"], optionalSlots: ["process"] },
  { id: "action-led", narrativeOrder: ["hero", "cta", "services", "about", "contact"] },
  { id: "experience-led", narrativeOrder: ["hero", "gallery", "about", "services", "cta", "contact"], optionalSlots: ["gallery"] },
  { id: "assurance-led", narrativeOrder: ["hero", "services", "faq", "about", "cta", "contact"], optionalSlots: ["faq"] },
  { id: "story-proof-led", narrativeOrder: ["hero", "about", "gallery", "services", "faq", "cta", "contact"], optionalSlots: ["gallery", "faq"] },
  { id: "guided-depth", narrativeOrder: ["hero", "services", "process", "faq", "about", "cta", "contact"], optionalSlots: ["process", "faq"] },
];

function matchesIndustry(section: CompleteSectionDefinition, brief: InterpretedBrief) {
  const industry = brief.business.industry.value;
  const subIndustry = brief.business.subIndustry?.value;
  const industryMatch = section.industries.includes("*") || section.industries.includes(industry);
  const subIndustryMatch = section.subIndustries.includes("*") || (!!subIndustry && section.subIndustries.includes(subIndustry));
  return industryMatch && subIndustryMatch;
}

function scoreSection(section: CompleteSectionDefinition, type: string, direction: ArtDirection, brief: InterpretedBrief) {
  if (section.type !== type || !matchesIndustry(section, brief)) return -Infinity;
  let score = 0;
  if (section.artDirections.includes(direction.visualStyle)) score += 100;
  for (const mood of direction.mood) if (section.moods.includes(mood)) score += 8;
  if (direction.layout.density === "low" && section.density === "airy") score += 6;
  if (direction.layout.density === "medium" && section.density === "balanced") score += 6;
  if (direction.layout.density === "high" && section.density === "dense") score += 6;
  return score;
}

function rankedSections(type: string, direction: ArtDirection, brief: InterpretedBrief) {
  return ALL_SECTIONS
    .filter((section) => section.type === type && matchesIndustry(section, brief))
    .map((section) => ({ section, score: scoreSection(section, type, direction, brief) }))
    .sort((a, b) => b.score - a.score || a.section.id.localeCompare(b.section.id));
}

function chooseSection(type: string, direction: ArtDirection, brief: InterpretedBrief, candidateIndex: number) {
  const ranked = rankedSections(type, direction, brief);
  if (!ranked.length) return undefined;
  const bestScore = ranked[0].score;
  const best = ranked.filter((item) => item.score === bestScore);
  return best[candidateIndex % best.length]?.section.id ?? ranked[0].section.id;
}

function compositionSignature(sections: Record<string, string>) {
  return Object.entries(sections).sort(([a], [b]) => a.localeCompare(b)).map(([type, id]) => `${type}:${id}`).join("|");
}

function compositionDistance(a: Record<string, string>, b: Record<string, string>, types = DIVERSITY_TYPES) {
  return types.reduce((distance, type) => distance + (a[type] !== b[type] ? 1 : 0), 0);
}

function buildCompositionOptions(initial: Record<string, string>, direction: ArtDirection, brief: InterpretedBrief) {
  const varying = DIVERSITY_TYPES.map((type) => {
    const ranked = rankedSections(type, direction, brief).slice(0, 3);
    return ranked.length ? { type, ranked } : undefined;
  }).filter(Boolean) as Array<{ type: string; ranked: ReturnType<typeof rankedSections> }>;
  let options: Array<{ sections: Record<string, string>; score: number }> = [{ sections: { ...initial }, score: 0 }];
  for (const { type, ranked } of varying) {
    options = options.flatMap((option) => ranked.map((choice) => ({ sections: { ...option.sections, [type]: choice.section.id }, score: option.score + choice.score })));
  }
  return Array.from(new Map(options.map((option) => [compositionSignature(option.sections), option])).values());
}

function diversifyComposition(initial: Record<string, string>, direction: ArtDirection, brief: InterpretedBrief, previous: Record<string, string>[]) {
  if (!previous.length) return initial;
  const options = buildCompositionOptions(initial, direction, brief).map((option) => {
    const majorDistance = Math.min(...previous.map((sections) => compositionDistance(option.sections, sections, MAJOR_VISUAL_TYPES)));
    const totalDistance = Math.min(...previous.map((sections) => compositionDistance(option.sections, sections)));
    return { ...option, majorDistance, totalDistance };
  }).sort((a, b) => Number(b.majorDistance >= MIN_MAJOR_DISTANCE) - Number(a.majorDistance >= MIN_MAJOR_DISTANCE) || b.majorDistance - a.majorDistance || b.totalDistance - a.totalDistance || b.score - a.score || compositionSignature(a.sections).localeCompare(compositionSignature(b.sections)));
  return options[0]?.sections ?? initial;
}

function stableSeed(parts: Array<string | undefined>) {
  const value = parts.filter(Boolean).join("|");
  return [...value].reduce((seed, character) => ((seed * 31) + character.charCodeAt(0)) >>> 0, 0);
}

function chooseCompositionFamily(index: number, brief: InterpretedBrief, knowledge: IndustryKnowledge) {
  const seed = stableSeed([
    brief.business.industry.value,
    brief.business.subIndustry?.value,
    brief.business.businessType?.value,
    brief.positioning.primaryGoal.value,
    ...brief.positioning.secondaryGoals.value,
    ...knowledge.requiredSectionTypes,
  ]);
  return COMPOSITION_FAMILIES[(seed + index) % COMPOSITION_FAMILIES.length];
}

function createSectionOrder(
  index: number,
  selectedSections: Record<string, string>,
  knowledge: IndustryKnowledge,
  direction: ArtDirection,
  brief: InterpretedBrief,
) {
  const family = chooseCompositionFamily(index, brief, knowledge);
  const required = new Set(knowledge.requiredSectionTypes);
  const order = ["navbar"];

  for (const type of family.narrativeOrder) {
    const isRequired = required.has(type);
    const isOptionalSlot = family.optionalSlots?.includes(type) && knowledge.optionalSectionTypes.includes(type);
    if (!isRequired && !isOptionalSlot) continue;
    if (isOptionalSlot && !selectedSections[type]) {
      const selected = chooseSection(type, direction, brief, index);
      if (selected) selectedSections[type] = selected;
    }
    if (selectedSections[type] || isRequired) order.push(type);
  }

  for (const type of knowledge.requiredSectionTypes) {
    if (type === "navbar" || type === "footer") continue;
    if (!order.includes(type)) order.push(type);
  }

  if (required.has("footer")) order.push("footer");
  return Array.from(new Set(order));
}

export function generateCandidatePlans({ brief, knowledge, count = 8 }: { brief: InterpretedBrief; knowledge: IndustryKnowledge; count?: number; }): SiteCandidatePlan[] {
  const directions = createArtDirections({
    industry: brief.business.industry.value,
    subIndustry: brief.business.subIndustry?.value,
    businessType: brief.business.businessType?.value,
    primaryGoal: brief.positioning.primaryGoal.value,
    secondaryGoals: brief.positioning.secondaryGoals.value,
    brandTraits: knowledge.visualVocabulary.traits as string[],
    knownFacts: brief.truth.knownFacts,
    unknownFacts: brief.truth.unknownFacts,
    industryKnowledge: { visualVocabulary: knowledge.visualVocabulary.traits as string[], imagery: knowledge.imageryGuidance, requiredSections: knowledge.requiredSectionTypes, optionalSections: knowledge.optionalSectionTypes, conversionActions: knowledge.conversionActions, avoid: knowledge.visualVocabulary.avoid as string[] },
  }, count);
  const previousCompositions: Record<string, string>[] = [];
  return directions.map((direction, index) => {
    const initialSections = Object.fromEntries(knowledge.requiredSectionTypes.flatMap((type) => {
      const selected = chooseSection(type, direction, brief, index);
      return selected ? [[type, selected]] : [];
    }));
    const selectedSections = diversifyComposition(initialSections, direction, brief, previousCompositions);
    const sectionOrder = createSectionOrder(index, selectedSections, knowledge, direction, brief);
    previousCompositions.push(selectedSections);
    const theme = compileThemeTokens(brief, direction);
    return { id: `candidate-${String(index + 1).padStart(2, "0")}`, direction, selectedSections, sectionOrder, theme, cssVariables: themeTokensToCssVariables(theme) };
  });
}
