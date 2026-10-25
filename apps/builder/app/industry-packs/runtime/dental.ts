import {
  applyCertifiedDentalMedia,
  applyIndustryPreset,
  certifiedDentalMediaIssues,
} from "../../apply-industry-preset";
import {
  applyDentalVisitorContentHygiene,
  dentalVisitorContentIssues,
} from "../../dental-content-hygiene";
import { createDentalStructuralScaffold } from "../../dental-scaffold";
import { rankDentalPresetCandidates } from "../../dental-preset-ranking";
import type { IndustryDesignPreset } from "../../industry-design-preset-data";
import {
  applySelectedDentalCandidate,
  protectedStructureChanged,
  repairSelectedDraftContentFit,
  restoreProtectedStructure,
  selectedCandidateStructureIssues,
  validateSelectedDraft,
} from "../../api/design-review/select/selection-pipeline";
import { isDentalCertifiedSection } from "@micirql/sections";
import { dentalIndustryPack } from "../dental";
import { defineCertifiedIndustryPackRuntime } from "./types";

/**
 * Compatibility adapter for the established dental pipeline. The legacy
 * DENTAL_* constants and public functions remain at their original module
 * paths; this adapter only supplies an industry-neutral execution boundary.
 */
export const dentalIndustryPackRuntime = defineCertifiedIndustryPackRuntime<IndustryDesignPreset>(
  {
    pack: dentalIndustryPack,
    functionPolicy: Object.freeze({
      contentEnrichment: Object.freeze({
        functionName: "enrich-site-content",
        certifiedModes: Object.freeze(["model", "partial", "curated"]),
        fallbackIsCertifiable: false,
      }),
      certifiedMedia: Object.freeze({
        mode: "licensed-selection",
        provider: "pexels",
        remoteFunctionRequired: false,
      }),
    }),
    rankCandidates: rankDentalPresetCandidates,
    createStructuralScaffold: createDentalStructuralScaffold,
    applyCandidate: (site, candidate, options) =>
      applyIndustryPreset(site, candidate, options),
    applySelectedCandidate: applySelectedDentalCandidate,
    candidateStructureIssues: selectedCandidateStructureIssues,
    validateDraft: validateSelectedDraft,
    applyContentHygiene: applyDentalVisitorContentHygiene,
    contentIssues: dentalVisitorContentIssues,
    repairContentFit: repairSelectedDraftContentFit,
    protectedStructureChanged,
    restoreProtectedStructure,
    isCertifiedComponent: isDentalCertifiedSection,
    applyCertifiedMedia: applyCertifiedDentalMedia,
    certifiedMediaIssues: certifiedDentalMediaIssues,
  },
);
