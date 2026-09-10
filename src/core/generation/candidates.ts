import { createArtDirections } from "../art-direction/director";
import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import { compileThemeTokens, themeTokensToCssVariables } from "../theme/compiler";
import type { IndustryKnowledge } from "../industry/knowledge";
import { SECTION_CATALOG } from "../../sections/catalog";
import type { CompleteSectionDefinition } from "../../sections/schema";

export type SiteCandidatePlan = {
  id: string;
  direction: ArtDirection;
  selectedSections: Record<string, string>;
  theme: ReturnType<typeof compileThemeTokens>;
  cssVariables: ReturnType<typeof themeTokensToCssVariables>;
};

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
  for (const mood of direction.mood) {
    if (section.moods.includes(mood)) score += 8;
  }
  if (direction.layout.density === "low" && section.density === "airy") score += 6;
  if (direction.layout.density === "medium" && section.density === "balanced") score += 6;
  if (direction.layout.density === "high" && section.density === "dense") score += 6;

  return score;
}

function rankedSections(type: string, direction: ArtDirection, brief: InterpretedBrief) {
  return SECTION_CATALOG
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
  return Object.entries(sections)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, id]) => `${type}:${id}`)
    .join("|");
}

function diversifyCollision(
  selectedSections: Record<string, string>,
  direction: ArtDirection,
  brief: InterpretedBrief,
  usedSignatures: Set<string>,
) {
  if (!usedSignatures.has(compositionSignature(selectedSections))) return selectedSections;

  const diversified = { ...selectedSections };
  const expressiveTypes = ["services", "about", "cta", "navbar", "footer", "hero"];

  for (const type of expressiveTypes) {
    const ranked = rankedSections(type, direction, brief);
    if (ranked.length < 2) continue;

    const current = diversified[type];
    const currentIndex = ranked.findIndex((item) => item.section.id === current);
    const next = ranked[(Math.max(currentIndex, 0) + 1) % ranked.length]?.section.id;
    if (!next || next === current) continue;

    diversified[type] = next;
    if (!usedSignatures.has(compositionSignature(diversified))) return diversified;
  }

  return diversified;
}

export function generateCandidatePlans({
  brief,
  knowledge,
  count = 8,
}: {
  brief: InterpretedBrief;
  knowledge: IndustryKnowledge;
  count?: number;
}): SiteCandidatePlan[] {
  const directions = createArtDirections({
    industry: brief.business.industry.value,
    subIndustry: brief.business.subIndustry?.value,
    businessType: brief.business.businessType?.value,
    primaryGoal: brief.positioning.primaryGoal.value,
    secondaryGoals: brief.positioning.secondaryGoals.value,
    brandTraits: knowledge.visualVocabulary.traits as string[],
    knownFacts: brief.truth.knownFacts,
    unknownFacts: brief.truth.unknownFacts,
    industryKnowledge: {
      visualVocabulary: knowledge.visualVocabulary.traits as string[],
      imagery: knowledge.imageryGuidance,
      requiredSections: knowledge.requiredSectionTypes,
      optionalSections: knowledge.optionalSectionTypes,
      conversionActions: knowledge.conversionActions,
      avoid: knowledge.visualVocabulary.avoid as string[],
    },
  }, count);

  const usedSignatures = new Set<string>();

  return directions.map((direction, index) => {
    const sectionTypes = knowledge.requiredSectionTypes;
    const initialSections = Object.fromEntries(
      sectionTypes.flatMap((type) => {
        const selected = chooseSection(type, direction, brief, index);
        return selected ? [[type, selected]] : [];
      }),
    );
    const selectedSections = diversifyCollision(initialSections, direction, brief, usedSignatures);
    usedSignatures.add(compositionSignature(selectedSections));

    const theme = compileThemeTokens(brief, direction);

    return {
      id: `candidate-${String(index + 1).padStart(2, "0")}`,
      direction,
      selectedSections,
      theme,
      cssVariables: themeTokensToCssVariables(theme),
    };
  });
}
