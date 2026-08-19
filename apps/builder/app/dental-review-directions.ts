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
import { evaluateDentalContentQuality } from "./dental-content-quality";
import { repairWebsiteInvariants } from "./invariant-repair";
import type { OnboardingProfile } from "./preset-ranking";
import type { ReviewDirection } from "./review-directions";

const REVIEW_LIMIT = 8;
const MIN_DENTAL_CONTENT_SCORE = 82;

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
  const briefSignals = profileSignals(profile);
  const candidates: ReviewDirection[] = [];

  for (let index = 0; index < DENTAL_LAYOUT_BLUEPRINTS.length; index += 1) {
    const blueprint = DENTAL_LAYOUT_BLUEPRINTS[index]!;
    const composed = applyWebsiteLayoutBlueprint(site, blueprint);
    const repaired = repairWebsiteInvariants(composed, "healthcare-clinic", industry, subindustry);
    const normalizedSite = normalizeWebsiteContent(repaired.site);
    const contentQuality = evaluateWebsiteContent(normalizedSite);
    const dentalContentQuality = evaluateDentalContentQuality(normalizedSite, profile);
    const dentalContentErrors = dentalContentQuality.issues.filter((issue) => issue.severity === "error");

    // Design Review is for finished directions, not polished generic scaffolds.
    // If the site's copy misses the requested dental specialty or lacks a clinic-specific CTA,
    // withhold every direction until generation/content recovery produces a valid draft.
    if (dentalContentErrors.length || dentalContentQuality.score < MIN_DENTAL_CONTENT_SCORE) continue;

    const industryFit = evaluateIndustryFit(normalizedSite, industry, subindustry);
    const baseScore = scoreDesign({
      site: normalizedSite,
      readinessScore: repaired.readiness.score,
      contentScore: Math.min(contentQuality.score, dentalContentQuality.score),
      archetypeFitScore: industryFit.score,
    });
    const fitBonus = blueprintFitBonus(
      blueprint.fit.subindustryIds,
      blueprint.fit.goals,
      blueprint.fit.priorities,
      blueprint.styleTags,
      subindustry,
      goals,
      briefSignals,
    );
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
        ...(subindustry && blueprint.fit.subindustryIds.includes(subindustry) ? [`strong ${subindustry.replace(/-/g, " ")} match`] : []),
        ...(fitBonus >= 18 ? ["high brief relevance"] : []),
        `dental content ${dentalContentQuality.score}/100`,
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
  const selected = selectDiverseDesigns(ranked, Math.min(REVIEW_LIMIT, count, ranked.length));

  const top = ranked[0];
  if (!top) return selected;
  return [top, ...selected.filter((candidate) => candidate.id !== top.id)].slice(0, Math.min(REVIEW_LIMIT, count));
}

function blueprintFitBonus(
  subindustries: string[],
  blueprintGoals: string[],
  priorities: string[],
  styleTags: string[],
  subindustry: string,
  goals: string[],
  signals: string[],
): number {
  let bonus = 0;
  if (subindustry && subindustries.includes(subindustry)) bonus += subindustries.length === 1 ? 18 : 12;
  else if (subindustry && subindustries.length && !subindustries.includes(subindustry)) bonus -= 10;

  const goalMatches = goals.filter((goal) => blueprintGoals.some((candidate) => looselyMatches(candidate, goal))).length;
  bonus += Math.min(6, goalMatches * 2);
  const priorityMatches = priorities.filter((priority) => signals.some((signal) => looselyMatches(priority, signal))).length;
  bonus += Math.min(6, priorityMatches * 2);
  const styleMatches = styleTags.filter((tag) => signals.some((signal) => looselyMatches(tag, signal))).length;
  bonus += Math.min(5, styleMatches);

  if (subindustry === "implant-dentistry" && priorities.some((item) => /implant|technology|doctor/.test(item))) bonus += 4;
  if (subindustry === "cosmetic-dentistry" && priorities.some((item) => /visual|outcome|confidence/.test(item))) bonus += 4;
  if (subindustry === "orthodontics" && priorities.some((item) => /journey|treatment|technology/.test(item))) bonus += 4;
  if (subindustry === "endodontics" && priorities.some((item) => /technology|doctor|trust/.test(item))) bonus += 4;
  return Math.max(-10, Math.min(30, bonus));
}

function profileGoals(profile: OnboardingProfile): string[] {
  return Array.isArray(profile.goals) ? profile.goals.map(clean).filter(Boolean) : [];
}

function profileSignals(profile: OnboardingProfile): string[] {
  return [
    ...(Array.isArray(profile.style_tags) ? profile.style_tags : []),
    ...(Array.isArray(profile.services) ? profile.services : []),
    ...(Array.isArray(profile.required_capabilities) ? profile.required_capabilities : []),
    profile.notes ?? "",
  ].map(clean).filter(Boolean);
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
