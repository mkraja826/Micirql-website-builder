import type { Site } from "@micirql/schema";
import { DENTAL_LAYOUT_BLUEPRINTS, normalizeWebsiteContent } from "@micirql/design-engine";
import { applyWebsiteLayoutBlueprint } from "./apply-layout-blueprint";
import { repairExistingDentalContactPage } from "./dental-contact-page-repair";
import { evaluateDentalContentQuality } from "./dental-content-quality";
import { applyDentalFaqIntelligence } from "./dental-faq-intelligence";
import { applyDentalMultipageArchitecture } from "./dental-multipage-architecture";
import { applyDentalMultipageMediaSafety } from "./dental-multipage-media-safety";
import { evaluateDentalMultipageQuality } from "./dental-multipage-quality";
import { runtimeRenderedCertifiedDentalIds } from "./dental-review-directions";
import { repairWebsiteInvariants } from "./invariant-repair";
import { evaluatePageMediaArtDirection } from "./page-media-art-direction-quality";
import { repairPageMediaArtDirection } from "./page-media-art-direction-repair";
import { evaluatePageRhythmQuality } from "./page-rhythm-quality";
import { repairPageRhythm } from "./page-rhythm-repair";
import { evaluatePageTypographyQuality } from "./page-typography-quality";
import { repairPageTypography } from "./page-typography-repair";
import type { OnboardingProfile } from "./preset-ranking";

const MIN_DENTAL_CONTENT_SCORE = 82;
const MIN_DENTAL_MULTIPAGE_SCORE = 90;
const MIN_PAGE_RHYTHM_SCORE = 78;
const MIN_PAGE_TYPOGRAPHY_SCORE = 82;
const MIN_MEDIA_ART_DIRECTION_SCORE = 80;

export type DentalReviewRejectionStage =
  | "allowlist"
  | "dental-content"
  | "multipage"
  | "page-rhythm"
  | "typography"
  | "media-art-direction";

export type DentalReviewRejectionDiagnostics = {
  blueprintCount: number;
  allowlistCount: number;
  allowlistMatches: number;
  acceptedBeforeRanking: number;
  rejected: Record<DentalReviewRejectionStage, number>;
  commonIssues: Array<{ stage: DentalReviewRejectionStage; code: string; count: number }>;
};

export function diagnoseCertifiedDentalReviewDirections(
  site: Site,
  profile: OnboardingProfile,
): DentalReviewRejectionDiagnostics {
  const renderedCertifiedIds = runtimeRenderedCertifiedDentalIds();
  const rejected: Record<DentalReviewRejectionStage, number> = {
    allowlist: 0,
    "dental-content": 0,
    multipage: 0,
    "page-rhythm": 0,
    typography: 0,
    "media-art-direction": 0,
  };
  const issueCounts = new Map<string, number>();
  let allowlistMatches = 0;
  let acceptedBeforeRanking = 0;

  for (const blueprint of DENTAL_LAYOUT_BLUEPRINTS) {
    if (process.env.NODE_ENV === "production" && !renderedCertifiedIds.has(blueprint.id)) {
      rejected.allowlist += 1;
      recordIssue(issueCounts, "allowlist", "BLUEPRINT_NOT_RUNTIME_CERTIFIED");
      continue;
    }
    allowlistMatches += 1;

    const composed = applyWebsiteLayoutBlueprint(site, blueprint);
    const repaired = repairWebsiteInvariants(
      composed,
      "healthcare-clinic",
      clean(profile.industry) || "dental",
      normalizeDentalSubindustry(profile.subindustry),
    );
    const faqIntelligence = applyDentalFaqIntelligence(repaired.site, profile);
    const multipageArchitecture = applyDentalMultipageArchitecture(faqIntelligence.site, profile);
    const contactPageRepair = repairExistingDentalContactPage(multipageArchitecture.site);
    const multipageMediaSafety = applyDentalMultipageMediaSafety(contactPageRepair.site);
    let candidateSite = normalizeWebsiteContent(multipageMediaSafety.site);

    const dentalContentQuality = evaluateDentalContentQuality(candidateSite, profile);
    const dentalContentErrors = dentalContentQuality.issues.filter((issue) => issue.severity === "error");
    if (dentalContentErrors.length || dentalContentQuality.score < MIN_DENTAL_CONTENT_SCORE) {
      rejected["dental-content"] += 1;
      recordIssues(
        issueCounts,
        "dental-content",
        dentalContentErrors.map((issue) => issue.code),
        `SCORE_${dentalContentQuality.score}_BELOW_${MIN_DENTAL_CONTENT_SCORE}`,
      );
      continue;
    }

    const multipageQuality = evaluateDentalMultipageQuality(candidateSite, profile);
    if (!multipageQuality.ready || multipageQuality.score < MIN_DENTAL_MULTIPAGE_SCORE) {
      rejected.multipage += 1;
      recordIssues(
        issueCounts,
        "multipage",
        multipageQuality.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code),
        `SCORE_${multipageQuality.score}_BELOW_${MIN_DENTAL_MULTIPAGE_SCORE}`,
      );
      continue;
    }

    let pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
    let pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) {
      const rhythmRepair = repairPageRhythm(candidateSite, pageRhythmQuality.issues);
      if (rhythmRepair.repaired) {
        candidateSite = normalizeWebsiteContent(rhythmRepair.site);
        pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
        pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
      }
    }
    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) {
      rejected["page-rhythm"] += 1;
      recordIssues(
        issueCounts,
        "page-rhythm",
        pageRhythmErrors.map((issue) => issue.code),
        `SCORE_${pageRhythmQuality.score}_BELOW_${MIN_PAGE_RHYTHM_SCORE}`,
      );
      continue;
    }

    let pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
    let pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
    if (pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE || pageTypographyQuality.issues.some((issue) => issue.severity === "error")) {
      const typographyRepair = repairPageTypography(candidateSite, pageTypographyQuality.issues);
      if (typographyRepair.repaired) {
        candidateSite = typographyRepair.site;
        pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
        pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
      }
    }
    if (pageTypographyErrors.length || pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE) {
      rejected.typography += 1;
      recordIssues(
        issueCounts,
        "typography",
        pageTypographyErrors.map((issue) => issue.code),
        `SCORE_${pageTypographyQuality.score}_BELOW_${MIN_PAGE_TYPOGRAPHY_SCORE}`,
      );
      continue;
    }

    let mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
    let mediaArtDirectionErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
    if (mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) {
      const artDirectionRepair = repairPageMediaArtDirection(candidateSite, mediaArtDirection);
      if (artDirectionRepair.repaired) {
        candidateSite = artDirectionRepair.site;
        mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
        mediaArtDirectionErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
      }
    }
    if (mediaArtDirectionErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) {
      rejected["media-art-direction"] += 1;
      recordIssues(
        issueCounts,
        "media-art-direction",
        mediaArtDirectionErrors.map((issue) => issue.code),
        `SCORE_${mediaArtDirection.score}_BELOW_${MIN_MEDIA_ART_DIRECTION_SCORE}`,
      );
      continue;
    }

    acceptedBeforeRanking += 1;
  }

  const commonIssues = [...issueCounts.entries()]
    .map(([key, count]) => {
      const separator = key.indexOf(":");
      return {
        stage: key.slice(0, separator) as DentalReviewRejectionStage,
        code: key.slice(separator + 1),
        count,
      };
    })
    .sort((a, b) => b.count - a.count || a.stage.localeCompare(b.stage) || a.code.localeCompare(b.code))
    .slice(0, 8);

  return {
    blueprintCount: DENTAL_LAYOUT_BLUEPRINTS.length,
    allowlistCount: renderedCertifiedIds.size,
    allowlistMatches,
    acceptedBeforeRanking,
    rejected,
    commonIssues,
  };
}

export function summarizeDentalReviewDiagnostics(diagnostics: DentalReviewRejectionDiagnostics): string {
  if (diagnostics.allowlistCount === 0) {
    return `Server certification has no runtime Dental allowlist. 0/${diagnostics.blueprintCount} blueprints were eligible.`;
  }
  if (diagnostics.allowlistMatches === 0) {
    return `Runtime Dental certification IDs do not match the ${diagnostics.blueprintCount} review blueprints. Allowlist contains ${diagnostics.allowlistCount} IDs.`;
  }

  const stages = (Object.entries(diagnostics.rejected) as Array<[DentalReviewRejectionStage, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => `${stage} ${count}/${diagnostics.allowlistMatches}`)
    .join(", ");
  const issues = diagnostics.commonIssues
    .slice(0, 4)
    .map((issue) => `${issue.stage}:${issue.code}×${issue.count}`)
    .join(", ");

  return `Server certification produced 0 directions. Matched ${diagnostics.allowlistMatches}/${diagnostics.blueprintCount} certified blueprints; rejected by ${stages || "unknown stage"}.${issues ? ` Top issues: ${issues}.` : ""}`;
}

function recordIssues(
  counts: Map<string, number>,
  stage: DentalReviewRejectionStage,
  codes: string[],
  scoreFallback: string,
) {
  if (!codes.length) {
    recordIssue(counts, stage, scoreFallback);
    return;
  }
  for (const code of codes) recordIssue(counts, stage, code);
}

function recordIssue(counts: Map<string, number>, stage: DentalReviewRejectionStage, code: string) {
  const key = `${stage}:${code}`;
  counts.set(key, (counts.get(key) ?? 0) + 1);
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

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
