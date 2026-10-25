import type { Domain } from "@micirql/schema";
import { dentalIndustryPack } from "./dental";
import { physiotherapyIndustryPack } from "./physiotherapy";
import {
  assessCrossIndustryDesignDistinctness,
  candidateDesignSignature,
  validateWithinIndustryDesignCatalog,
} from "./design-distinctness";
import type { IndustryPackProfile, IndustryPackSiteIdentity } from "./types";

const CERTIFIED_INDUSTRY_PACKS = [
  dentalIndustryPack,
  physiotherapyIndustryPack,
] as const;

export type RegisteredIndustryPack = (typeof CERTIFIED_INDUSTRY_PACKS)[number];

function assertRegistryIntegrity() {
  assertUnique(
    CERTIFIED_INDUSTRY_PACKS.map((pack) => pack.id),
    "pack ID",
  );
  assertUnique(
    CERTIFIED_INDUSTRY_PACKS.map((pack) => pack.catalogVersion),
    "catalog version",
  );
  assertUnique(
    CERTIFIED_INDUSTRY_PACKS.map((pack) => pack.designGrammar.id),
    "design grammar",
  );

  const candidateOwners = new Map<string, string>();
  for (const pack of CERTIFIED_INDUSTRY_PACKS) {
    const candidates = pack.listCandidates();
    const pageBlueprints = pack.listPageBlueprints();
    assertUnique(
      pageBlueprints.map((page) => page.path),
      `${pack.id} page path`,
    );
    const blueprintPaths = new Set(pageBlueprints.map((page) => page.path));
    const missingPageContracts = pack.requiredPagePaths.filter(
      (path) => !blueprintPaths.has(path),
    );
    if (missingPageContracts.length) {
      throw new Error(
        `${pack.id} is missing page anatomy for ${missingPageContracts.join(", ")}.`,
      );
    }
    if (candidates.length !== pack.reviewCount) {
      throw new Error(
        `${pack.id} declares ${pack.reviewCount} review candidates but exposes ${candidates.length}.`,
      );
    }
    for (const candidate of candidates) {
      if (
        candidate.catalogVersion !== pack.catalogVersion ||
        candidate.domain !== pack.domain ||
        candidate.subtype !== pack.subtype ||
        !candidate.id.startsWith(pack.candidateIdPrefix)
      ) {
        throw new Error(
          `${candidate.id} crosses the declared boundary of industry pack ${pack.id}.`,
        );
      }
      const existingOwner = candidateOwners.get(candidate.id);
      if (existingOwner) {
        throw new Error(
          `Candidate ${candidate.id} is owned by both ${existingOwner} and ${pack.id}.`,
        );
      }
      candidateOwners.set(candidate.id, pack.id);
    }
    const catalogValidation = validateWithinIndustryDesignCatalog(pack);
    if (!catalogValidation.pass) {
      throw new Error(
        `Industry pack candidate collision: ${catalogValidation.issues.map((issue) => issue.message).join(" ")}`,
      );
    }
  }

  for (
    let leftIndex = 0;
    leftIndex < CERTIFIED_INDUSTRY_PACKS.length;
    leftIndex += 1
  ) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < CERTIFIED_INDUSTRY_PACKS.length;
      rightIndex += 1
    ) {
      const left = CERTIFIED_INDUSTRY_PACKS[leftIndex]!;
      const right = CERTIFIED_INDUSTRY_PACKS[rightIndex]!;
      for (const leftCandidate of left.listCandidates()) {
        for (const rightCandidate of right.listCandidates()) {
          const assessment = assessCrossIndustryDesignDistinctness(
            candidateDesignSignature(left, leftCandidate),
            candidateDesignSignature(right, rightCandidate),
            left.designGrammar,
            right.designGrammar,
          );
          if (!assessment.pass) {
            throw new Error(
              `Industry pack design collision: ${assessment.issues.map((issue) => issue.message).join(" ")}`,
            );
          }
        }
      }
    }
  }
}

assertRegistryIntegrity();

export function listCertifiedIndustryPacks(): RegisteredIndustryPack[] {
  return [...CERTIFIED_INDUSTRY_PACKS];
}

export function resolveCertifiedIndustryPackById(
  packId: unknown,
): RegisteredIndustryPack | undefined {
  if (typeof packId !== "string" || !packId.trim()) return undefined;
  const normalizedId = packId.trim();
  return CERTIFIED_INDUSTRY_PACKS.find((pack) => pack.id === normalizedId);
}

export function resolveCertifiedIndustryPack(
  profile: IndustryPackProfile,
): RegisteredIndustryPack | undefined {
  return exactlyOne(
    CERTIFIED_INDUSTRY_PACKS.filter((pack) => pack.matchesProfile(profile)),
    "onboarding profile",
  );
}

export function resolveCertifiedIndustryPackForSite(
  site: IndustryPackSiteIdentity,
): RegisteredIndustryPack | undefined {
  return exactlyOne(
    CERTIFIED_INDUSTRY_PACKS.filter((pack) => pack.matchesSite(site)),
    `${site.domain}/${site.subtype ?? "unspecified"}`,
  );
}

export function resolveCertifiedIndustryPackByCatalogVersion(
  catalogVersion: unknown,
): RegisteredIndustryPack | undefined {
  if (typeof catalogVersion !== "string" || !catalogVersion.trim()) {
    return undefined;
  }
  return CERTIFIED_INDUSTRY_PACKS.find(
    (pack) => pack.catalogVersion === catalogVersion.trim(),
  );
}

export function resolveCertifiedIndustryPackByCandidateId(
  candidateId: unknown,
): RegisteredIndustryPack | undefined {
  if (typeof candidateId !== "string" || !candidateId.trim()) return undefined;
  const normalizedId = candidateId.trim();
  return exactlyOne(
    CERTIFIED_INDUSTRY_PACKS.filter((pack) =>
      pack.listCandidates().some((candidate) => candidate.id === normalizedId),
    ),
    `candidate ${normalizedId}`,
  );
}

/**
 * Preserves the current broad domain inference used by onboarding UI while
 * keeping certification separate. Resolving to a domain does not make an
 * unsupported subtype eligible for a certified pack.
 */
export function resolveProfileDomain(
  profile: IndustryPackProfile,
): Domain | undefined {
  if (profile.domain) return profile.domain;

  const certifiedPack = resolveCertifiedIndustryPack(profile);
  if (certifiedPack) return certifiedPack.domain;

  const text = [
    normalize(profile.industry),
    normalize(profile.subindustry),
    ...normalizeList(profile.services),
  ].join(" ");
  const classifiedPack = exactlyOne(
    CERTIFIED_INDUSTRY_PACKS.filter((pack) => pack.matchesClassification(text)),
    "profile classification",
  );
  if (classifiedPack) return classifiedPack.domain;

  if (/\b(real estate|property|realtor)\b/.test(text)) return "real-estate";
  if (/\b(restaurant|cafe|dining|food|hospitality|hotel)\b/.test(text))
    return "restaurant";
  if (/\b(construction|contractor|builder|renovation)\b/.test(text))
    return "construction";
  if (/\b(saas|software|technology|app)\b/.test(text)) return "saas";
  if (/\b(education|school|training|course)\b/.test(text)) return "education";
  if (/\b(portfolio|creative|artist|designer)\b/.test(text)) return "portfolio";
  if (/\b(professional|corporate|consult|accounting|legal)\b/.test(text))
    return "corporate";
  return undefined;
}

function exactlyOne<T>(matches: readonly T[], subject: string): T | undefined {
  if (matches.length > 1) {
    throw new Error(
      `Industry pack registry ambiguity: ${subject} matched ${matches.length} certified packs.`,
    );
  }
  return matches[0];
}

function assertUnique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) {
    throw new Error(`Industry pack registry contains a duplicate ${label}.`);
  }
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalize).filter(Boolean) : [];
}
