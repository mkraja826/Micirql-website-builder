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

function chooseSection(type: string, direction: ArtDirection, brief: InterpretedBrief, candidateIndex: number) {
  const ranked = SECTION_CATALOG
    .filter((section) => section.type === type && matchesIndustry(section, brief))
    .map((section) => ({ section, score: scoreSection(section, type, direction, brief) }))
    .sort((a, b) => b.score - a.score || a.section.id.localeCompare(b.section.id));

  if (!ranked.length) return undefined;

  const bestScore = ranked[0].score;
  const best = ranked.filter((item) => item.score === bestScore);
  return best[candidateIndex % best.length]?.section.id ?? ranked[0].section.id;
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

  return directions.map((direction, index) => {
    const sectionTypes = knowledge.requiredSectionTypes;
    const selectedSections = Object.fromEntries(
      sectionTypes.flatMap((type) => {
        const selected = chooseSection(type, direction, brief, index);
        return selected ? [[type, selected]] : [];
      }),
    );
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
