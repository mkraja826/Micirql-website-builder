import type { IndustryKnowledge } from "../industry/knowledge";
import type { InterpretedBrief } from "../brief/schema";
import type { SiteCandidatePlan } from "../generation/candidates";
import { SECTION_CATALOG } from "../../sections/catalog";
import { EXPANDED_SECTION_CATALOG } from "../../sections/expansion";
import type { CompleteSectionDefinition } from "../../sections/schema";
import type { CandidateScoreBreakdown, RankedCandidate } from "./schema";

const ALL_SECTIONS = [...SECTION_CATALOG, ...EXPANDED_SECTION_CATALOG];
const byId = new Map(ALL_SECTIONS.map((section) => [section.id, section]));

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value));
}

function selectedDefinitions(candidate: SiteCandidatePlan) {
  return Object.values(candidate.selectedSections)
    .map((id) => byId.get(id))
    .filter(Boolean) as CompleteSectionDefinition[];
}

function businessFit(candidate: SiteCandidatePlan, knowledge: IndustryKnowledge) {
  const required = knowledge.requiredSectionTypes;
  if (!required.length) return 25;
  const present = required.filter((type) => Boolean(candidate.selectedSections[type])).length;
  const requiredCoverage = (present / required.length) * 18;
  const industryCompatible = selectedDefinitions(candidate).filter((section) =>
    section.industries.includes("*") || section.industries.includes(knowledge.industry.slug),
  ).length;
  const defs = selectedDefinitions(candidate);
  const compatibility = defs.length ? (industryCompatible / defs.length) * 7 : 0;
  return clamp(requiredCoverage + compatibility, 25);
}

function artDirectionCoherence(candidate: SiteCandidatePlan) {
  const defs = selectedDefinitions(candidate);
  if (!defs.length) return 0;
  const exact = defs.filter((section) => section.artDirections.includes(candidate.direction.visualStyle)).length;
  const moodMatches = defs.reduce((sum, section) => sum + (candidate.direction.mood.some((mood) => section.moods.includes(mood)) ? 1 : 0), 0);
  return clamp((exact / defs.length) * 17 + (moodMatches / defs.length) * 8, 25);
}

function conversionReadiness(candidate: SiteCandidatePlan) {
  let score = 0;
  if (candidate.selectedSections.cta) score += 7;
  if (candidate.selectedSections.contact) score += 7;
  if (candidate.direction.conversionStrategy.length) score += 3;
  const defs = selectedDefinitions(candidate);
  if (defs.some((section) => section.conversionPurposes.includes("primary-cta"))) score += 3;
  return clamp(score, 20);
}

function informationArchitecture(candidate: SiteCandidatePlan) {
  const order = candidate.sectionOrder;
  if (!order.length) return 0;
  let score = 0;
  if (order[0] === "navbar") score += 2;
  if (order[1] === "hero") score += 4;
  if (order.at(-1) === "footer") score += 2;
  const contactIndex = order.indexOf("contact");
  const footerIndex = order.indexOf("footer");
  if (contactIndex > 1 && footerIndex > contactIndex) score += 3;
  const contentTypes = ["services", "about", "process"].filter((type) => order.includes(type));
  if (contentTypes.length >= 2) score += 2;
  if (new Set(order).size === order.length) score += 2;
  return clamp(score, 15);
}

function themeCoherence(candidate: SiteCandidatePlan) {
  let score = 0;
  if (candidate.theme.density === candidate.direction.layout.density) score += 5;
  const headingScale = candidate.theme.typography.headingScale;
  if (candidate.direction.layout.density === "low" && headingScale === "expressive") score += 4;
  else if (candidate.direction.layout.density === "high" && headingScale === "compact") score += 4;
  else if (candidate.direction.layout.density === "medium" && headingScale === "balanced") score += 4;
  else score += 2;
  if (candidate.direction.color.contrastMode === "dark" && candidate.theme.color.background.toLowerCase() === "#0b1110") score += 3;
  else if (candidate.direction.color.contrastMode !== "dark" && candidate.theme.color.background.toLowerCase() !== "#0b1110") score += 3;
  if (candidate.theme.spacing.sectionY >= 64 && candidate.theme.spacing.sectionY <= 132) score += 3;
  return clamp(score, 15);
}

export function scoreCandidate(candidate: SiteCandidatePlan, brief: InterpretedBrief, knowledge: IndustryKnowledge): CandidateScoreBreakdown {
  void brief;
  const breakdown = {
    businessFit: businessFit(candidate, knowledge),
    artDirectionCoherence: artDirectionCoherence(candidate),
    conversionReadiness: conversionReadiness(candidate),
    informationArchitecture: informationArchitecture(candidate),
    themeCoherence: themeCoherence(candidate),
    total: 0,
  };
  breakdown.total = Number((breakdown.businessFit + breakdown.artDirectionCoherence + breakdown.conversionReadiness + breakdown.informationArchitecture + breakdown.themeCoherence).toFixed(2));
  return breakdown;
}

function explain(candidate: SiteCandidatePlan, score: CandidateScoreBreakdown) {
  const strengths: string[] = [];
  const cautions: string[] = [];
  if (score.artDirectionCoherence >= 20) strengths.push("Strong section-to-art-direction coherence");
  if (score.conversionReadiness >= 17) strengths.push("Clear conversion path");
  if (score.informationArchitecture >= 13) strengths.push("Well-formed page narrative");
  if (score.themeCoherence >= 13) strengths.push("Theme supports the intended direction");
  if (candidate.selectedSections.process) strengths.push("Adds a useful care-journey explanation");
  if (score.artDirectionCoherence < 15) cautions.push("Some selected sections are generic to this art direction");
  if (score.themeCoherence < 10) cautions.push("Theme expression is weaker than the intended direction");
  if (!candidate.selectedSections.process) cautions.push("No optional process section in this candidate");
  return { strengths, cautions };
}

export function rankCandidates(candidates: SiteCandidatePlan[], brief: InterpretedBrief, knowledge: IndustryKnowledge): RankedCandidate<SiteCandidatePlan>[] {
  return candidates
    .map((candidate) => {
      const score = scoreCandidate(candidate, brief, knowledge);
      return { candidate, score, ...explain(candidate, score) };
    })
    .sort((a, b) => b.score.total - a.score.total || a.candidate.id.localeCompare(b.candidate.id))
    .map((item, index) => ({ rank: index + 1, ...item }));
}
