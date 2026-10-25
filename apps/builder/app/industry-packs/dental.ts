import {
  DENTAL_CATALOG_VERSION,
  DENTAL_REQUIRED_ACTIONS,
  DENTAL_REQUIRED_PAGE_PATHS,
  DENTAL_SUBTYPE,
  DESIGN_REVIEW_COUNT,
  isDentalSubtype,
  isExplicitDentalSubtype,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "../industry-design-preset-data";
import { getDomainPack } from "@micirql/domains";
import { SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import type { CertifiedIndustryPack, IndustryPackProfile } from "./types";

function normalized(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizedList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalized).filter(Boolean) : [];
}

function listDentalPageBlueprints() {
  return getDomainPack("clinic").defaultPages.map((page) => ({
    path: page.slug,
    label: page.label,
    required: page.required,
    purpose: page.purpose,
    sectionFamilies: page.sectionFamilies.filter(
      (family): family is SectionFamily =>
        SECTION_FAMILIES.includes(family as SectionFamily),
    ),
    seoIntent: page.seoIntent,
  }));
}

/**
 * Mirrors the established dental onboarding boundary exactly. A supplied
 * subtype is authoritative, so a dermatology (or future clinic) brief cannot
 * receive dental candidates merely because another field mentions dentistry.
 */
function matchesDentalProfile(profile: IndustryPackProfile): boolean {
  if (profile.domain && profile.domain !== "clinic") return false;

  const subtype = normalized(profile.subindustry);
  if (subtype) return isDentalSubtype(subtype);

  const classification = [
    normalized(profile.industry),
    normalizedList(profile.services).join(" "),
  ].join(" ");
  return isExplicitDentalSubtype(classification);
}

export const dentalIndustryPack = Object.freeze({
  id: "clinic-dental",
  label: "Dental clinic",
  certification: "certified",
  domain: "clinic",
  subtype: DENTAL_SUBTYPE,
  catalogVersion: DENTAL_CATALOG_VERSION,
  reviewCount: DESIGN_REVIEW_COUNT,
  candidateIdPrefix: "clinic-dental-",
  designGrammar: {
    id: "clinic-dental-clinical-confidence-v1",
    visualThesis:
      "Treatment clarity, restrained clinical proof and a direct appointment journey expressed through the certified Dental Top 20.",
    sharedLayer: "primitives-only",
    motifs: [
      "treatment-clarity-grid",
      "clinical-proof-lanes",
      "appointment-confidence-path",
    ],
    disallowedReuse: [
      "candidate-signature",
      "page-section-sequence",
      "hero-composition",
      "palette-only-variation",
    ],
    maximumCrossIndustrySimilarity: 0.64,
    maximumWithinIndustrySimilarity: 0.76,
  },
  requiredPagePaths: DENTAL_REQUIRED_PAGE_PATHS,
  requiredActions: DENTAL_REQUIRED_ACTIONS,
  listPageBlueprints: listDentalPageBlueprints,
  matchesProfile: matchesDentalProfile,
  matchesClassification: (value: unknown) =>
    typeof value === "string" && isDentalSubtype(value),
  matchesSite: (site) =>
    site.domain === "clinic" && isDentalSubtype(site.subtype),
  listCandidates: () => listIndustryDesignPresets("clinic", DENTAL_SUBTYPE),
} satisfies CertifiedIndustryPack<IndustryDesignPreset>);
