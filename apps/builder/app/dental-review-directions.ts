import type { Site } from "@micirql/schema";
import {
  DENTAL_LAYOUT_BLUEPRINTS,
  applyPreferenceBias,
  evaluateIndustryFit,
  evaluateWebsiteContent,
  normalizeWebsiteContent,
  scoreDesign,
  selectDiverseDesigns,
  type DesignPreferenceProfile,
} from "@micirql/design-engine";
import { applyWebsiteLayoutBlueprint } from "./apply-layout-blueprint";
import { repairWebsiteInvariants } from "./invariant-repair";
import type { OnboardingProfile } from "./preset-ranking";
import type { ReviewDirection } from "./review-directions";

const REVIEW_LIMIT = 8;

export function isDentalReviewProfile(profile: OnboardingProfile): boolean {
  return /dental|dentist|dentistry|orthodont|endodont|implant|cosmetic/.test(`${clean(profile.industry)} ${clean(profile.subindustry)}`);
}

export function buildCertifiedDentalReviewDirections(
  site: Site,
  profile: OnboardingProfile,
  count = REVIEW_LIMIT,
  preferenceProfile?: DesignPreferenceProfile,
): ReviewDirection[] {
  const industry = clean(profile.industry) || "dental";
  const subindustry = normalizeDentalSubindustry(profile.subindustry);
  const goals = profileGoals(profile);
  const candidates: ReviewDirection[] = [];

  for (let index = 0; index < DENTAL_LAYOUT_BLUEPRINTS.length; index += 1) {
    const blueprint = DENTAL_LAYOUT_BLUEPRINTS[index]!;
    const composed = applyWebsiteLayoutBlueprint(site, blueprint);
    const repaired = repairWebsiteInvariants(composed, "healthcare-clinic", industry, subindustry);
    const normalizedSite = normalizeWebsiteContent(repaired.site);
    const contentQuality = evaluateWebsiteContent(normalizedSite);
    const industryFit = evaluateIndustryFit(normalizedSite, industry, subindustry);
    const baseScore = scoreDesign({
      site: normalizedSite,
      readinessScore: repaired.readiness.score,
      contentScore: contentQuality.score,
      archetypeFitScore: industryFit.score,
    });
    const fitBonus = blueprintFitBonus(blueprint.fit.subindustryIds, blueprint.fit.goals, blueprint.fit.priorities, subindustry, goals);
    const biased = applyPreferenceBias(baseScore, preferenceProfile);
    const designScore = { ...biased, total: Math.min(100, biased.total + fitBonus) };

    candidates.push({
      id: `certified-${blueprint.id}`,
      name: blueprint.name,
      description: blueprint.description,
      reasons: [
        "certified dental design system",
        blueprint.archetype.replace(/-/g, " "),
        `${blueprint.design.imageStyle} imagery`,
        `${blueprint.design.sectionRhythm} section rhythm`,
        ...(subindustry && blueprint.fit.subindustryIds.includes(subindustry) ? [`matched to ${subindustry.replace(/-/g, " ")}`] : []),
        `design quality ${designScore.total}/100`,
      ],
      site: normalizedSite,
      themeFamily: normalizedSite.theme.family,
      variantSeed: index,
      readiness: repaired.readiness,
      contentQuality,
      designScore,
    });
  }

  const ranked = [...candidates].sort((a, b) => b.designScore.total - a.designScore.total);
  return selectDiverseDesigns(ranked, Math.min(REVIEW_LIMIT, count, ranked.length));
}

function blueprintFitBonus(
  subindustries: string[],
  blueprintGoals: string[],
  priorities: string[],
  subindustry: string,
  goals: string[],
): number {
  let bonus = 0;
  if (subindustry && subindustries.includes(subindustry)) bonus += 8;
  const goalMatches = goals.filter((goal) => blueprintGoals.some((candidate) => looselyMatches(candidate, goal))).length;
  bonus += Math.min(5, goalMatches * 2);
  if (subindustry === "implant-dentistry" && priorities.some((item) => /implant|technology|doctor/.test(item))) bonus += 3;
  if (subindustry === "cosmetic-dentistry" && priorities.some((item) => /visual|outcome|confidence/.test(item))) bonus += 3;
  return Math.min(12, bonus);
}

function profileGoals(profile: OnboardingProfile): string[] {
  const value = (profile as OnboardingProfile & { goals?: unknown }).goals;
  if (!Array.isArray(value)) return [];
  return value.map(clean).filter(Boolean);
}

function normalizeDentalSubindustry(value: unknown): string {
  const text = clean(value);
  if (/implant/.test(text)) return "implant-dentistry";
  if (/cosmetic|smile|veneer/.test(text)) return "cosmetic-dentistry";
  if (/ortho|aligner|braces/.test(text)) return "orthodontics";
  if (/endo|root canal/.test(text)) return "endodontics";
  if (/general|family/.test(text)) return "general-dentistry";
  return text;
}

function looselyMatches(a: string, b: string): boolean {
  const left = clean(a);
  const right = clean(b);
  return left.includes(right) || right.includes(left) || left.split(/\s+/).some((token) => token.length > 4 && right.includes(token));
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
