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
import { applyDentalFaqIntelligence } from "./dental-faq-intelligence";
import { applyDentalMultipageArchitecture } from "./dental-multipage-architecture";
import { applyDentalMultipageMediaSafety } from "./dental-multipage-media-safety";
import { evaluateDentalMultipageQuality } from "./dental-multipage-quality";
import { evaluatePageRhythmQuality } from "./page-rhythm-quality";
import { repairPageRhythm } from "./page-rhythm-repair";
import { evaluatePageTypographyQuality } from "./page-typography-quality";
import { repairPageTypography } from "./page-typography-repair";
import { evaluatePageMediaArtDirection } from "./page-media-art-direction-quality";
import { repairPageMediaArtDirection } from "./page-media-art-direction-repair";
import { repairWebsiteInvariants } from "./invariant-repair";
import type { OnboardingProfile } from "./preset-ranking";
import type { ReviewDirection } from "./review-directions";

const REVIEW_LIMIT = 8;
const MIN_DENTAL_CONTENT_SCORE = 82;
const MIN_DENTAL_MULTIPAGE_SCORE = 90;
const MIN_PAGE_RHYTHM_SCORE = 78;
const MIN_PAGE_TYPOGRAPHY_SCORE = 82;
const MIN_MEDIA_ART_DIRECTION_SCORE = 80;

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
  const renderedCertifiedIds = runtimeRenderedCertifiedDentalIds();

  if (process.env.NODE_ENV === "production" && renderedCertifiedIds.size === 0) return [];

  for (let index = 0; index < DENTAL_LAYOUT_BLUEPRINTS.length; index += 1) {
    const blueprint = DENTAL_LAYOUT_BLUEPRINTS[index]!;
    if (process.env.NODE_ENV === "production" && !renderedCertifiedIds.has(blueprint.id)) continue;

    const composed = applyWebsiteLayoutBlueprint(site, blueprint);
    const repaired = repairWebsiteInvariants(composed, "healthcare-clinic", industry, subindustry);
    const faqIntelligence = applyDentalFaqIntelligence(repaired.site, profile);
    const multipageArchitecture = applyDentalMultipageArchitecture(faqIntelligence.site, profile);
    const multipageMediaSafety = applyDentalMultipageMediaSafety(multipageArchitecture.site);
    const normalizedSite = normalizeWebsiteContent(multipageMediaSafety.site);
    const contentQuality = evaluateWebsiteContent(normalizedSite);
    const dentalContentQuality = evaluateDentalContentQuality(normalizedSite, profile);
    const dentalContentErrors = dentalContentQuality.issues.filter((issue) => issue.severity === "error");
    const multipageQuality = evaluateDentalMultipageQuality(normalizedSite, profile);

    if (dentalContentErrors.length || dentalContentQuality.score < MIN_DENTAL_CONTENT_SCORE) continue;
    if (!multipageQuality.ready || multipageQuality.score < MIN_DENTAL_MULTIPAGE_SCORE) continue;

    let candidateSite = normalizedSite;
    let pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
    let pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
    let pageRhythmRepairOperations: string[] = [];

    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) {
      const rhythmRepair = repairPageRhythm(candidateSite, pageRhythmQuality.issues);
      if (rhythmRepair.repaired) {
        candidateSite = normalizeWebsiteContent(rhythmRepair.site);
        pageRhythmRepairOperations = rhythmRepair.operations;
        pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
        pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
      }
    }

    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) continue;

    let pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
    let pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
    let pageTypographyRepairOperations: string[] = [];

    if (pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE || pageTypographyQuality.issues.some((issue) => issue.severity === "error")) {
      const typographyRepair = repairPageTypography(candidateSite, pageTypographyQuality.issues);
      if (typographyRepair.repaired) {
        candidateSite = typographyRepair.site;
        pageTypographyRepairOperations = typographyRepair.operations;
        pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
        pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
      }
    }

    if (pageTypographyErrors.length || pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE) continue;

    let mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
    let mediaArtDirectionErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
    let mediaArtDirectionRepairOperations: string[] = [];

    if (mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) {
      const artDirectionRepair = repairPageMediaArtDirection(candidateSite, mediaArtDirection);
      if (artDirectionRepair.repaired) {
        candidateSite = artDirectionRepair.site;
        mediaArtDirectionRepairOperations = artDirectionRepair.operations;
        mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
        mediaArtDirectionErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
      }
    }

    if (mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) continue;

    const industryFit = evaluateIndustryFit(candidateSite, industry, subindustry);
    const baseScore = scoreDesign({
      site: candidateSite,
      readinessScore: repaired.readiness.score,
      contentScore: Math.min(contentQuality.score, dentalContentQuality.score, multipageQuality.score, pageRhythmQuality.score, pageTypographyQuality.score, mediaArtDirection.score),
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
        "rendered-certified dental design system",
        blueprint.archetype.replace(/-/g, " "),
        `${blueprint.design.imageStyle} imagery`,
        `${blueprint.design.sectionRhythm} section rhythm`,
        ...(subindustry && blueprint.fit.subindustryIds.includes(subindustry) ? [`strong ${subindustry.replace(/-/g, " ")} match`] : []),
        ...(fitBonus >= 18 ? ["high brief relevance"] : []),
        ...(faqIntelligence.applied ? [`specialty FAQ decision support: ${faqIntelligence.specialty}`] : []),
        ...(multipageArchitecture.treatmentPages.length ? [`multi-page treatment architecture: ${multipageArchitecture.treatmentPages.length} treatment page${multipageArchitecture.treatmentPages.length === 1 ? "" : "s"}`] : []),
        ...(multipageMediaSafety.reusedQualifiedHero ? [`reused qualified hero media on ${multipageMediaSafety.reusedQualifiedHero} treatment page${multipageMediaSafety.reusedQualifiedHero === 1 ? "" : "s"}`] : []),
        ...(multipageMediaSafety.removedEmptyHeroSlots ? [`removed ${multipageMediaSafety.removedEmptyHeroSlots} empty treatment hero media slot${multipageMediaSafety.removedEmptyHeroSlots === 1 ? "" : "s"}`] : []),
        ...(pageRhythmRepairOperations.length ? [`auto-repaired page rhythm: ${pageRhythmRepairOperations.join(", ")}`] : []),
        ...(pageTypographyRepairOperations.length ? [`auto-repaired typography: ${pageTypographyRepairOperations.join(", ")}`] : []),
        ...(mediaArtDirectionRepairOperations.length ? [`auto-repaired media art direction: ${mediaArtDirectionRepairOperations.join(", ")}`] : []),
        `dental content ${dentalContentQuality.score}/100`,
        `multi-page architecture ${multipageQuality.score}/100`,
        `page rhythm ${pageRhythmQuality.score}/100`,
        `page typography ${pageTypographyQuality.score}/100`,
        `media art direction ${mediaArtDirection.score}/100`,
        `design quality ${designScore.total}/100`,
      ],
      site: candidateSite,
      themeFamily: candidateSite.theme.family,
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

export function runtimeRenderedCertifiedDentalIds(): Set<string> {
  const raw = process.env.MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS ?? "";
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
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
