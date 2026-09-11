import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";
import { compileThemeTokens, themeTokensToCssVariables } from "../theme/compiler";
import { SECTION_CATALOG } from "../../sections/catalog";
import type { CompleteSectionDefinition, SectionType } from "../../sections/schema";

const REQUIRED_TYPES: SectionType[] = ["navbar", "hero", "services", "about", "cta", "contact", "footer"];

export type GenerationCandidate = {
  id: string;
  rank: number;
  score: number;
  artDirection: ArtDirection;
  selectedSections: Partial<Record<SectionType, string>>;
  theme: ReturnType<typeof compileThemeTokens>;
  cssVariables: ReturnType<typeof themeTokensToCssVariables>;
  scoreBreakdown: {
    sectionFit: number;
    industryFit: number;
    moodFit: number;
    conversionFit: number;
    diversity: number;
  };
};

function sectionScore(section: CompleteSectionDefinition, direction: ArtDirection, industry: string, subIndustry?: string) {
  const artDirectionFit = section.artDirections.includes(direction.visualStyle) ? 12 : 0;
  const industryFit = section.industries.includes("*") || section.industries.includes(industry) ? 5 : -20;
  const subIndustryFit = !subIndustry || section.subIndustries.includes("*") || section.subIndustries.includes(subIndustry) ? 3 : -8;
  const moodFit = section.moods.filter((mood) => direction.mood.includes(mood)).length * 2;
  const conversionFit = section.conversionPurposes.some((purpose) => direction.conversionStrategy.includes(purpose)) ? 2 : 0;
  const statusFit = section.status === "retired" ? -100 : 0;
  return artDirectionFit + industryFit + subIndustryFit + moodFit + conversionFit + statusFit;
}

function selectSection(type: SectionType, direction: ArtDirection, industry: string, subIndustry: string | undefined, seed: number) {
  const eligible = SECTION_CATALOG.filter((section) => section.type === type && section.status !== "retired")
    .map((section) => ({ section, score: sectionScore(section, direction, industry, subIndustry) }))
    .sort((a, b) => b.score - a.score || a.section.id.localeCompare(b.section.id));

  if (!eligible.length) return undefined;

  // Rotate among equally credible top options so 20 candidates are meaningfully different
  // without allowing random or incompatible section mixing.
  const best = eligible[0].score;
  const credible = eligible.filter((entry) => entry.score >= best - 5);
  return credible[seed % credible.length]?.section;
}

export function competeGenerationCandidates(brief: InterpretedBrief, directions: ArtDirection[], count = 20): GenerationCandidate[] {
  const industry = brief.business.industry.value;
  const subIndustry = brief.business.subIndustry?.value;

  const candidates = directions.slice(0, count).map((artDirection, index) => {
    const selected = REQUIRED_TYPES.map((type, typeIndex) => [
      type,
      selectSection(type, artDirection, industry, subIndustry, index + typeIndex),
    ] as const);

    const selectedSections = Object.fromEntries(
      selected.filter((entry): entry is readonly [SectionType, CompleteSectionDefinition] => Boolean(entry[1]))
        .map(([type, section]) => [type, section.id]),
    ) as Partial<Record<SectionType, string>>;

    const chosen = selected.map(([, section]) => section).filter(Boolean) as CompleteSectionDefinition[];
    const sectionFit = chosen.reduce((total, section) => total + (section.artDirections.includes(artDirection.visualStyle) ? 4 : 0), 0);
    const industryFit = chosen.reduce((total, section) => total + (section.industries.includes("*") || section.industries.includes(industry) ? 2 : -8), 0);
    const moodFit = chosen.reduce((total, section) => total + section.moods.filter((mood) => artDirection.mood.includes(mood)).length, 0);
    const conversionFit = chosen.reduce((total, section) => total + (section.conversionPurposes.some((purpose) => artDirection.conversionStrategy.includes(purpose)) ? 1 : 0), 0);
    const diversity = new Set(chosen.map((section) => section.id)).size === chosen.length ? 2 : 0;
    const score = sectionFit + industryFit + moodFit + conversionFit + diversity;
    const theme = compileThemeTokens(brief, artDirection);

    return {
      id: `candidate-${String(index + 1).padStart(2, "0")}`,
      rank: 0,
      score,
      artDirection,
      selectedSections,
      theme,
      cssVariables: themeTokensToCssVariables(theme),
      scoreBreakdown: { sectionFit, industryFit, moodFit, conversionFit, diversity },
    };
  });

  return candidates
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}
