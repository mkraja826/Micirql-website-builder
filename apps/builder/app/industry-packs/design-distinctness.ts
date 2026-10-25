import type { ThemeFamily } from "@micirql/schema";
import { SECTION_FAMILIES, type SectionFamily } from "@micirql/sections";
import type { IndustryDesignGrammar, IndustryPackCandidate } from "./types";

/**
 * Smallest catalog boundary needed by the distinctness engine. Certified
 * packs and deliberately unregistered draft catalogs can both be audited,
 * without pretending that a draft pack is production-certified.
 */
export type IndustryDesignCatalog = {
  id: string;
  designGrammar: IndustryDesignGrammar;
  listCandidates(): IndustryPackCandidate[];
};

export type IndustryDesignSignature = {
  packId: string;
  grammarId: string;
  candidateId: string;
  themeFamily: ThemeFamily;
  variants: Readonly<Record<SectionFamily, number>>;
  sectionOrder: readonly SectionFamily[];
  typographyStrategy: string;
  imageStrategy: string;
  motifs: readonly string[];
};

export type CrossIndustryDesignIssue = {
  code:
    | "INDUSTRY_DESIGN_GRAMMAR_REUSED"
    | "INDUSTRY_DESIGN_STRUCTURE_COPIED"
    | "INDUSTRY_DESIGN_TOO_SIMILAR";
  message: string;
};

export type CrossIndustryDesignAssessment = {
  pass: boolean;
  similarity: number;
  threshold: number;
  breakdown: {
    theme: number;
    variants: number;
    sectionOrder: number;
    typography: number;
    imagery: number;
    motifs: number;
  };
  issues: CrossIndustryDesignIssue[];
};

export type WithinIndustryDesignSignature = {
  packId: string;
  candidateId: string;
  visualIdentityId: string;
  heroComposition: string;
  variants: Readonly<Record<SectionFamily, number>>;
  sectionOrder: readonly SectionFamily[];
  openingRhythm: readonly SectionFamily[];
  conversionJourney: readonly SectionFamily[];
  surfaceLanguage: readonly string[];
  typographyStrategy: string;
  imageStrategy: string;
  signatureMotifs: readonly string[];
};

export type WithinIndustryDesignIssue = {
  code:
    | "CANDIDATE_VISUAL_IDENTITY_INVALID"
    | "CANDIDATE_VISUAL_IDENTITY_REUSED"
    | "CANDIDATE_DESIGN_STRUCTURE_COPIED"
    | "CANDIDATE_DESIGN_TOO_SIMILAR";
  message: string;
};

export type WithinIndustryDesignAssessment = {
  pass: boolean;
  similarity: number;
  threshold: number;
  breakdown: {
    hero: number;
    variants: number;
    sectionOrder: number;
    openingRhythm: number;
    conversionJourney: number;
    surfaceLanguage: number;
    typography: number;
    imagery: number;
    motifs: number;
  };
  issues: WithinIndustryDesignIssue[];
};

export type WithinIndustryCatalogValidation = {
  pass: boolean;
  assessments: WithinIndustryDesignAssessment[];
  issues: WithinIndustryDesignIssue[];
};

export function candidateDesignSignature(
  pack: IndustryDesignCatalog,
  candidate: IndustryPackCandidate,
): IndustryDesignSignature {
  return {
    packId: pack.id,
    grammarId: pack.designGrammar.id,
    candidateId: candidate.id,
    themeFamily: candidate.theme.family,
    variants: candidate.variants,
    sectionOrder: candidate.sectionOrder,
    typographyStrategy: candidate.typographyStrategy,
    imageStrategy: candidate.imageStrategy,
    motifs: pack.designGrammar.motifs,
  };
}

export function candidateWithinIndustryDesignSignature(
  pack: IndustryDesignCatalog,
  candidate: IndustryPackCandidate,
): WithinIndustryDesignSignature {
  return {
    packId: pack.id,
    candidateId: candidate.id,
    visualIdentityId: candidate.visualIdentity.id,
    heroComposition: candidate.visualIdentity.heroComposition,
    variants: candidate.variants,
    sectionOrder: candidate.sectionOrder,
    openingRhythm: candidate.visualIdentity.openingRhythm,
    conversionJourney: candidate.visualIdentity.conversionJourney,
    surfaceLanguage: candidate.visualIdentity.surfaceLanguage,
    typographyStrategy: candidate.typographyStrategy,
    imageStrategy: candidate.imageStrategy,
    signatureMotifs: candidate.visualIdentity.signatureMotifs,
  };
}

export function assessWithinIndustryDesignDistinctness(
  candidate: WithinIndustryDesignSignature,
  existing: WithinIndustryDesignSignature,
  grammar: IndustryDesignGrammar,
): WithinIndustryDesignAssessment {
  if (candidate.packId !== existing.packId) {
    throw new Error("Within-industry distinctness requires matching pack IDs.");
  }
  if (candidate.candidateId === existing.candidateId) {
    throw new Error(
      "Within-industry distinctness requires two different candidate IDs.",
    );
  }

  const breakdown = {
    hero: candidate.heroComposition === existing.heroComposition ? 1 : 0,
    variants: variantSimilarity(candidate.variants, existing.variants),
    sectionOrder: orderSimilarity(
      candidate.sectionOrder,
      existing.sectionOrder,
    ),
    openingRhythm: sequenceSimilarity(
      candidate.openingRhythm,
      existing.openingRhythm,
    ),
    conversionJourney: sequenceSimilarity(
      candidate.conversionJourney,
      existing.conversionJourney,
    ),
    surfaceLanguage: jaccard(
      candidate.surfaceLanguage,
      existing.surfaceLanguage,
    ),
    typography:
      candidate.typographyStrategy === existing.typographyStrategy ? 1 : 0,
    imagery: candidate.imageStrategy === existing.imageStrategy ? 1 : 0,
    motifs: jaccard(candidate.signatureMotifs, existing.signatureMotifs),
  };
  const similarity = round(
    breakdown.hero * 0.16 +
      breakdown.variants * 0.24 +
      breakdown.sectionOrder * 0.18 +
      breakdown.openingRhythm * 0.12 +
      breakdown.conversionJourney * 0.1 +
      breakdown.surfaceLanguage * 0.08 +
      breakdown.typography * 0.04 +
      breakdown.imagery * 0.03 +
      breakdown.motifs * 0.05,
  );
  const threshold = grammar.maximumWithinIndustrySimilarity;
  const issues: WithinIndustryDesignIssue[] = [];

  if (candidate.visualIdentityId === existing.visualIdentityId) {
    issues.push({
      code: "CANDIDATE_VISUAL_IDENTITY_REUSED",
      message: `${candidate.candidateId} reuses candidate visual identity ${candidate.visualIdentityId} from ${existing.candidateId}.`,
    });
  }
  if (
    breakdown.hero === 1 &&
    breakdown.variants === 1 &&
    breakdown.sectionOrder === 1 &&
    breakdown.openingRhythm === 1 &&
    breakdown.conversionJourney === 1
  ) {
    issues.push({
      code: "CANDIDATE_DESIGN_STRUCTURE_COPIED",
      message: `${candidate.candidateId} copies the hero, component variants and visitor journey of ${existing.candidateId}.`,
    });
  }
  if (similarity > threshold) {
    issues.push({
      code: "CANDIDATE_DESIGN_TOO_SIMILAR",
      message: `${candidate.candidateId} is ${similarity.toFixed(3)} similar to ${existing.candidateId}; within-industry maximum is ${threshold.toFixed(3)}.`,
    });
  }

  return {
    pass: issues.length === 0,
    similarity,
    threshold,
    breakdown,
    issues,
  };
}

export function validateWithinIndustryDesignCatalog(
  pack: IndustryDesignCatalog,
): WithinIndustryCatalogValidation {
  const candidates = pack.listCandidates();
  const issues: WithinIndustryDesignIssue[] = [];
  const assessments: WithinIndustryDesignAssessment[] = [];

  for (const candidate of candidates) {
    const identity = candidate.visualIdentity;
    if (
      !nonEmpty(identity.id) ||
      !nonEmpty(identity.visualThesis) ||
      !nonEmpty(identity.heroComposition) ||
      identity.openingRhythm.length === 0 ||
      identity.conversionJourney.length === 0 ||
      identity.surfaceLanguage.length === 0 ||
      identity.signatureMotifs.length === 0
    ) {
      issues.push({
        code: "CANDIDATE_VISUAL_IDENTITY_INVALID",
        message: `${candidate.id} must define a complete candidate visual identity.`,
      });
    }
  }

  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < candidates.length;
      rightIndex += 1
    ) {
      const assessment = assessWithinIndustryDesignDistinctness(
        candidateWithinIndustryDesignSignature(pack, candidates[leftIndex]!),
        candidateWithinIndustryDesignSignature(pack, candidates[rightIndex]!),
        pack.designGrammar,
      );
      assessments.push(assessment);
      issues.push(...assessment.issues);
    }
  }

  return {
    pass: issues.length === 0,
    assessments,
    issues,
  };
}

export function assessCrossIndustryDesignDistinctness(
  candidate: IndustryDesignSignature,
  existing: IndustryDesignSignature,
  candidateGrammar: IndustryDesignGrammar,
  existingGrammar: IndustryDesignGrammar,
): CrossIndustryDesignAssessment {
  if (candidate.packId === existing.packId) {
    throw new Error("Cross-industry distinctness requires different pack IDs.");
  }

  const breakdown = {
    theme: candidate.themeFamily === existing.themeFamily ? 1 : 0,
    variants: variantSimilarity(candidate.variants, existing.variants),
    sectionOrder: orderSimilarity(
      candidate.sectionOrder,
      existing.sectionOrder,
    ),
    typography:
      candidate.typographyStrategy === existing.typographyStrategy ? 1 : 0,
    imagery: candidate.imageStrategy === existing.imageStrategy ? 1 : 0,
    motifs: jaccard(candidate.motifs, existing.motifs),
  };
  const similarity = round(
    breakdown.theme * 0.12 +
      breakdown.variants * 0.28 +
      breakdown.sectionOrder * 0.28 +
      breakdown.typography * 0.08 +
      breakdown.imagery * 0.08 +
      breakdown.motifs * 0.16,
  );
  const threshold = Math.min(
    candidateGrammar.maximumCrossIndustrySimilarity,
    existingGrammar.maximumCrossIndustrySimilarity,
  );
  const issues: CrossIndustryDesignIssue[] = [];

  if (candidate.grammarId === existing.grammarId) {
    issues.push({
      code: "INDUSTRY_DESIGN_GRAMMAR_REUSED",
      message: `${candidate.packId} reuses design grammar ${candidate.grammarId} from ${existing.packId}.`,
    });
  }
  if (
    breakdown.theme === 1 &&
    breakdown.variants === 1 &&
    breakdown.sectionOrder === 1
  ) {
    issues.push({
      code: "INDUSTRY_DESIGN_STRUCTURE_COPIED",
      message: `${candidate.candidateId} copies the theme, component variants and section sequence of ${existing.candidateId}.`,
    });
  }
  if (similarity > threshold) {
    issues.push({
      code: "INDUSTRY_DESIGN_TOO_SIMILAR",
      message: `${candidate.candidateId} is ${similarity.toFixed(3)} similar to ${existing.candidateId}; cross-industry maximum is ${threshold.toFixed(3)}.`,
    });
  }

  return {
    pass: issues.length === 0,
    similarity,
    threshold,
    breakdown,
    issues,
  };
}

function variantSimilarity(
  left: IndustryDesignSignature["variants"],
  right: IndustryDesignSignature["variants"],
) {
  const matches = SECTION_FAMILIES.filter(
    (family) => left[family] === right[family],
  ).length;
  return matches / SECTION_FAMILIES.length;
}

function orderSimilarity(
  left: readonly SectionFamily[],
  right: readonly SectionFamily[],
) {
  const leftUnique = unique(left);
  const rightUnique = unique(right);
  const common = new Set(
    leftUnique.filter((family) => rightUnique.includes(family)),
  );
  const comparableLeft = leftUnique.filter((family) => common.has(family));
  const comparableRight = rightUnique.filter((family) => common.has(family));
  if (comparableLeft.length < 2) return 0;
  const possiblePairs =
    (comparableLeft.length * (comparableLeft.length - 1)) / 2;
  let matchingPairs = 0;
  for (let first = 0; first < comparableLeft.length; first += 1) {
    for (let second = first + 1; second < comparableLeft.length; second += 1) {
      const firstFamily = comparableLeft[first]!;
      const secondFamily = comparableLeft[second]!;
      if (
        comparableRight.indexOf(firstFamily) <
        comparableRight.indexOf(secondFamily)
      ) {
        matchingPairs += 1;
      }
    }
  }
  return matchingPairs / possiblePairs;
}

function sequenceSimilarity(
  left: readonly SectionFamily[],
  right: readonly SectionFamily[],
) {
  const overlap = jaccard(left, right);
  const relativeOrder = orderSimilarity(left, right);
  return (overlap + relativeOrder) / 2;
}

function jaccard(left: readonly string[], right: readonly string[]) {
  const leftSet = new Set(left.map(normalized).filter(Boolean));
  const rightSet = new Set(right.map(normalized).filter(Boolean));
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 0;
  const intersection = [...leftSet].filter((value) => rightSet.has(value));
  return intersection.length / union.size;
}

function unique(values: readonly SectionFamily[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function normalized(value: string) {
  return value.trim().toLowerCase();
}

function nonEmpty(value: string) {
  return Boolean(normalized(value));
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}
