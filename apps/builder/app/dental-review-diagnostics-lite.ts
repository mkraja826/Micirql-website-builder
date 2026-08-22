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
const DIAGNOSTIC_SAMPLE_LIMIT = 1;

export type DentalReviewLiteDiagnostics = {
  blueprintCount: number;
  allowlistCount: number;
  allowlistMatches: number;
  sampledBlueprintIds: string[];
  failingStage?: "dental-content" | "multipage" | "page-rhythm" | "typography" | "media-art-direction";
  score?: number;
  issues: string[];
};

export function diagnoseCertifiedDentalReviewDirectionsLite(
  site: Site,
  profile: OnboardingProfile,
): DentalReviewLiteDiagnostics {
  const renderedCertifiedIds = runtimeRenderedCertifiedDentalIds();
  const matching = DENTAL_LAYOUT_BLUEPRINTS.filter((blueprint) =>
    process.env.NODE_ENV !== "production" || renderedCertifiedIds.has(blueprint.id),
  );
  const sampled = matching.slice(0, DIAGNOSTIC_SAMPLE_LIMIT);

  const base = {
    blueprintCount: DENTAL_LAYOUT_BLUEPRINTS.length,
    allowlistCount: renderedCertifiedIds.size,
    allowlistMatches: matching.length,
    sampledBlueprintIds: sampled.map((blueprint) => blueprint.id),
  };

  if (!sampled.length) return { ...base, issues: ["NO_RUNTIME_CERTIFIED_BLUEPRINT_MATCH"] };

  for (const blueprint of sampled) {
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
      return {
        ...base,
        failingStage: "dental-content",
        score: dentalContentQuality.score,
        issues: unique(dentalContentErrors.map((issue) => issue.code)),
      };
    }

    const multipageQuality = evaluateDentalMultipageQuality(candidateSite, profile);
    if (!multipageQuality.ready || multipageQuality.score < MIN_DENTAL_MULTIPAGE_SCORE) {
      return {
        ...base,
        failingStage: "multipage",
        score: multipageQuality.score,
        issues: unique(multipageQuality.issues.filter((issue) => issue.severity === "error").map((issue) => issue.code)),
      };
    }

    let pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
    let pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) {
      const repair = repairPageRhythm(candidateSite, pageRhythmQuality.issues);
      if (repair.repaired) {
        candidateSite = normalizeWebsiteContent(repair.site);
        pageRhythmQuality = evaluatePageRhythmQuality(candidateSite);
        pageRhythmErrors = pageRhythmQuality.issues.filter((issue) => issue.severity === "error");
      }
    }
    if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) {
      return {
        ...base,
        failingStage: "page-rhythm",
        score: pageRhythmQuality.score,
        issues: unique(pageRhythmErrors.map((issue) => issue.code)),
      };
    }

    let pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
    let pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
    if (pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE || pageTypographyQuality.issues.some((issue) => issue.severity === "error")) {
      const repair = repairPageTypography(candidateSite, pageTypographyQuality.issues);
      if (repair.repaired) {
        candidateSite = repair.site;
        pageTypographyQuality = evaluatePageTypographyQuality(candidateSite);
        pageTypographyErrors = pageTypographyQuality.issues.filter((issue) => issue.severity === "error" && !issue.repairable);
      }
    }
    if (pageTypographyErrors.length || pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE) {
      return {
        ...base,
        failingStage: "typography",
        score: pageTypographyQuality.score,
        issues: unique(pageTypographyErrors.map((issue) => issue.code)),
      };
    }

    let mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
    let mediaErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
    if (mediaErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) {
      const repair = repairPageMediaArtDirection(candidateSite, mediaArtDirection);
      if (repair.repaired) {
        candidateSite = repair.site;
        mediaArtDirection = evaluatePageMediaArtDirection(candidateSite);
        mediaErrors = mediaArtDirection.issues.filter((issue) => issue.severity === "error");
      }
    }
    if (mediaErrors.length || mediaArtDirection.score < MIN_MEDIA_ART_DIRECTION_SCORE) {
      return {
        ...base,
        failingStage: "media-art-direction",
        score: mediaArtDirection.score,
        issues: unique(mediaErrors.map((issue) => issue.code)),
      };
    }
  }

  return { ...base, issues: ["SAMPLED_LAYOUT_PASSED_ALL_PRE_RANKING_GATES"] };
}

export function summarizeDentalReviewDiagnosticsLite(diagnostics: DentalReviewLiteDiagnostics): string {
  if (diagnostics.allowlistCount === 0) {
    return `Server certification has no runtime Dental allowlist. 0/${diagnostics.blueprintCount} blueprints were eligible.`;
  }
  if (diagnostics.allowlistMatches === 0) {
    return `Runtime Dental certification IDs do not match the ${diagnostics.blueprintCount} review blueprints. Allowlist contains ${diagnostics.allowlistCount} IDs.`;
  }
  if (diagnostics.failingStage) {
    const issueText = diagnostics.issues.length ? diagnostics.issues.join(", ") : "no issue code";
    return `Server certification produced 0 directions. ${diagnostics.allowlistMatches}/${diagnostics.blueprintCount} blueprints matched the runtime allowlist. Bounded diagnostic sample ${diagnostics.sampledBlueprintIds.join(", ")} failed at ${diagnostics.failingStage} with score ${diagnostics.score ?? "unknown"}. Issues: ${issueText}.`;
  }
  return `Server certification produced 0 directions. ${diagnostics.allowlistMatches}/${diagnostics.blueprintCount} blueprints matched the runtime allowlist. Bounded diagnostic sample passed every pre-ranking gate, so the remaining failure is after those gates.`;
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

function unique(values: string[]): string[] {
  return [...new Set(values)].slice(0, 8);
}
