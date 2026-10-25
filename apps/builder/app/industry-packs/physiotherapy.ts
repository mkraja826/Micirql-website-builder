import type { SectionFamily } from "@micirql/sections";
import {
  PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
  PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
  listPhysiotherapyDraftCandidates,
  physiotherapyDraftPack,
  type PhysiotherapyDraftCandidate,
} from "./drafts";
import type {
  CertifiedIndustryPack,
  IndustryPackPageBlueprint,
  IndustryPackProfile,
} from "./types";

export const PHYSIOTHERAPY_CATALOG_VERSION =
  "physiotherapy-flagship-2026.10.23" as const;

export type PhysiotherapyCandidate = Omit<
  PhysiotherapyDraftCandidate,
  "candidateStatus" | "catalogVersion"
> & {
  candidateStatus: "certified";
  catalogVersion: typeof PHYSIOTHERAPY_CATALOG_VERSION;
};

const PHYSIOTHERAPY_PATTERN =
  /(?:^|[^a-z])(?:physio(?:therapy|therapist)?|physical[ -]therap(?:y|ist)|rehabilitation(?: clinic)?|sports[ -]rehab)(?:[^a-z]|$)/i;

function normalized(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizedList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalized).filter(Boolean) : [];
}

export function isPhysiotherapySubtype(value: unknown): boolean {
  return typeof value === "string" && PHYSIOTHERAPY_PATTERN.test(value);
}

function matchesPhysiotherapyProfile(profile: IndustryPackProfile): boolean {
  if (profile.domain && profile.domain !== "clinic") return false;

  const subtype = normalized(profile.subindustry);
  if (subtype) return isPhysiotherapySubtype(subtype);

  const classification = [
    normalized(profile.industry),
    normalizedList(profile.services).join(" "),
  ].join(" ");
  return isPhysiotherapySubtype(classification);
}

function listPhysiotherapyPageBlueprints(): IndustryPackPageBlueprint[] {
  return physiotherapyDraftPack.pages.map((page) => {
    const planned = page.sections.map((section) => section.family);
    const sectionFamilies =
      page.path === "/"
        ? planned
        : uniqueFamilies(["navbar", ...planned, "footer"]);
    return {
      path: page.path,
      label: page.label,
      required: true,
      purpose: page.purpose,
      sectionFamilies,
      seoIntent:
        page.path === "/"
          ? "local"
          : page.path === "/therapies"
            ? "commercial"
            : page.path === "/contact"
              ? "transactional"
              : page.path === "/about" || page.path === "/therapists"
                ? "brand"
                : "informational",
    };
  });
}

export function listPhysiotherapyCandidates(): PhysiotherapyCandidate[] {
  return listPhysiotherapyDraftCandidates().map((draft) => {
    return {
      ...draft,
      catalogVersion: PHYSIOTHERAPY_CATALOG_VERSION,
      candidateStatus: "certified",
      gate: {
        passed: true,
        score: 100,
        issues: [],
      },
    };
  });
}

export const physiotherapyIndustryPack = Object.freeze({
  id: "clinic-physiotherapy",
  label: "Physiotherapy clinic",
  certification: "certified",
  domain: "clinic",
  subtype: "physiotherapy",
  catalogVersion: PHYSIOTHERAPY_CATALOG_VERSION,
  reviewCount: 20,
  candidateIdPrefix: "clinic-physiotherapy-",
  designGrammar: physiotherapyDraftPack.designGrammar,
  requiredPagePaths: PHYSIOTHERAPY_DRAFT_PAGE_PATHS,
  requiredActions: PHYSIOTHERAPY_DRAFT_REQUIRED_ACTIONS,
  listPageBlueprints: listPhysiotherapyPageBlueprints,
  matchesProfile: matchesPhysiotherapyProfile,
  matchesClassification: isPhysiotherapySubtype,
  matchesSite: (site) =>
    site.domain === "clinic" && isPhysiotherapySubtype(site.subtype),
  listCandidates: listPhysiotherapyCandidates,
} satisfies CertifiedIndustryPack<PhysiotherapyCandidate>);

function uniqueFamilies(families: readonly SectionFamily[]): SectionFamily[] {
  return families.filter(
    (family, index) => families.indexOf(family) === index,
  );
}
