import type {
  BrandInput,
  BrandProvenance,
  CompositionGateIssue,
  CompositionGateReport,
  Domain,
  Site,
} from "@micirql/schema";
import type { CertifiedIndustryPack, IndustryPackCandidate } from "../types";

/**
 * Stable identity fields shared by every candidate runtime. Runtime callers do
 * not need to know a pack's theme, section, or content implementation in order
 * to resolve and safely apply one of its certified candidates.
 */
export type IndustryPackRuntimeCandidateIdentity = Pick<
  IndustryPackCandidate,
  "id" | "catalogVersion" | "domain" | "subtype"
>;

export type IndustryPackRuntimeApplyOptions = {
  /**
   * Selection may compose the structure first and bind certified media after
   * factual content hygiene. Interactive previews normally keep this enabled.
   */
  applyCertifiedMedia?: boolean;
};

export type IndustryPackSiteMutationResult = {
  site: Site;
  changed: boolean;
};

export type IndustryPackScaffoldBrief = {
  businessName: string;
  industry?: string | null;
  subindustry?: string | null;
  location?: string | null;
  services: string[];
  goals: string[];
  languages: string[];
  notes?: string | null;
};

export type IndustryPackRankingProfile = {
  domain?: Domain | null;
  industry?: string | null;
  subindustry?: string | null;
  location?: string | null;
  openingHours?: string | readonly string[] | null;
  goals?: string[] | null;
  style_tags?: string[] | null;
  styleTags?: string[] | null;
  required_capabilities?: string[] | null;
  requiredCapabilities?: string[] | null;
  languages?: readonly string[] | null;
  services?: string[] | null;
  notes?: string | null;
};

export type IndustryPackRankedCandidate<
  TCandidate extends IndustryPackCandidate = IndustryPackCandidate,
> = {
  candidate: TCandidate;
  score: number;
  reasons: string[];
  breakdown: Record<string, number>;
};

export type IndustryPackRuntimeFunctionPolicy = {
  readonly contentEnrichment: {
    readonly functionName: string;
    readonly certifiedModes: readonly string[];
    readonly fallbackIsCertifiable: boolean;
  };
  readonly certifiedMedia: {
    readonly mode: string;
    readonly provider?: string;
    readonly remoteFunctionRequired: boolean;
  };
};

/**
 * Industry-neutral execution boundary for a certified pack. Concrete packs
 * retain their richer candidate type while consumers can resolve and execute
 * candidates without importing industry-specific implementation modules.
 */
export type CertifiedIndustryPackRuntime<
  TCandidate extends IndustryPackCandidate = IndustryPackCandidate,
> = {
  readonly pack: CertifiedIndustryPack<TCandidate>;
  readonly functionPolicy: IndustryPackRuntimeFunctionPolicy;
  listCandidates(): TCandidate[];
  rankCandidates(
    profile: IndustryPackRankingProfile,
  ): IndustryPackRankedCandidate<TCandidate>[];
  resolveCandidate(candidateId: unknown): TCandidate | undefined;
  createStructuralScaffold(
    source: Site,
    brief: IndustryPackScaffoldBrief,
    brandInput?: BrandInput,
    brandProvenance?: BrandProvenance,
  ): Site;
  applyCandidate(
    site: Site,
    candidateId: unknown,
    options?: IndustryPackRuntimeApplyOptions,
  ): Site;
  applySelectedCandidate(site: Site, candidateId: unknown): Site;
  candidateStructureIssues(
    site: Site,
    candidateId: unknown,
  ): CompositionGateIssue[];
  validateDraft(
    site: Site,
    additionalIssues?: CompositionGateIssue[],
  ): CompositionGateReport;
  applyContentHygiene(site: Site): IndustryPackSiteMutationResult;
  contentIssues(site: Site): CompositionGateIssue[];
  repairContentFit(site: Site): IndustryPackSiteMutationResult;
  protectedStructureChanged(before: Site, after: Site): boolean;
  restoreProtectedStructure(baseline: Site, generated: Site): Site;
  isCertifiedComponent(componentId: string, version?: string): boolean;
  applyCertifiedMedia(site: Site, candidateId: unknown): Site;
  certifiedMediaIssues(site: Site): CompositionGateIssue[];
};

export type IndustryPackRuntimeImplementation<
  TCandidate extends IndustryPackCandidate,
> = {
  pack: CertifiedIndustryPack<TCandidate>;
  functionPolicy: IndustryPackRuntimeFunctionPolicy;
  rankCandidates(
    profile: IndustryPackRankingProfile,
  ): IndustryPackRankedCandidate<TCandidate>[];
  createStructuralScaffold(
    source: Site,
    brief: IndustryPackScaffoldBrief,
    brandInput?: BrandInput,
    brandProvenance?: BrandProvenance,
  ): Site;
  applyCandidate(
    site: Site,
    candidate: TCandidate,
    options: IndustryPackRuntimeApplyOptions,
  ): Site;
  applySelectedCandidate(site: Site, candidate: TCandidate): Site;
  candidateStructureIssues(
    site: Site,
    candidate: TCandidate,
  ): CompositionGateIssue[];
  validateDraft(
    site: Site,
    additionalIssues?: CompositionGateIssue[],
  ): CompositionGateReport;
  applyContentHygiene(site: Site): IndustryPackSiteMutationResult;
  contentIssues(site: Site): CompositionGateIssue[];
  repairContentFit(site: Site): IndustryPackSiteMutationResult;
  protectedStructureChanged(before: Site, after: Site): boolean;
  restoreProtectedStructure(baseline: Site, generated: Site): Site;
  isCertifiedComponent(componentId: string, version?: string): boolean;
  applyCertifiedMedia(site: Site, candidate: TCandidate): Site;
  certifiedMediaIssues(site: Site): CompositionGateIssue[];
};

/**
 * Builds a runtime that always executes the canonical candidate from the
 * certified catalog. A caller cannot smuggle altered theme/section data behind
 * a valid candidate ID, and a candidate owned by another pack fails closed.
 */
export function defineCertifiedIndustryPackRuntime<
  TCandidate extends IndustryPackCandidate,
>(
  implementation: IndustryPackRuntimeImplementation<TCandidate>,
): CertifiedIndustryPackRuntime<TCandidate> {
  const { pack } = implementation;

  function listCandidates(): TCandidate[] {
    return pack.listCandidates();
  }

  function resolveCandidate(candidateId: unknown): TCandidate | undefined {
    if (typeof candidateId !== "string" || !candidateId.trim()) {
      return undefined;
    }
    const normalizedId = candidateId.trim();
    return listCandidates().find((candidate) => candidate.id === normalizedId);
  }

  function requireCandidate(candidateId: unknown): TCandidate {
    const canonical = resolveCandidate(candidateId);
    if (!canonical) {
      throw new Error(
        `Candidate ${typeof candidateId === "string" ? candidateId : "unknown"} is not owned by certified industry pack ${pack.id}.`,
      );
    }
    return canonical;
  }

  function rankCandidates(
    profile: IndustryPackRankingProfile,
  ): IndustryPackRankedCandidate<TCandidate>[] {
    const ranked = implementation.rankCandidates(profile);
    const rankedIds = ranked.map((item) => item.candidate.id);
    const catalogIds = listCandidates().map((candidate) => candidate.id);
    const catalogIdSet = new Set(catalogIds);
    if (
      rankedIds.length !== pack.reviewCount ||
      new Set(rankedIds).size !== pack.reviewCount ||
      rankedIds.some((candidateId) => !catalogIdSet.has(candidateId))
    ) {
      throw new Error(
        `Runtime ${pack.id} ranking must return every certified candidate exactly once.`,
      );
    }
    return ranked.map((item) => ({
      ...item,
      candidate: requireCandidate(item.candidate.id),
      reasons: [...item.reasons],
      breakdown: { ...item.breakdown },
    }));
  }

  return Object.freeze({
    pack,
    functionPolicy: implementation.functionPolicy,
    listCandidates,
    rankCandidates,
    resolveCandidate,
    createStructuralScaffold: implementation.createStructuralScaffold,
    applyCandidate: (
      site: Site,
      candidateId: unknown,
      options: IndustryPackRuntimeApplyOptions = {},
    ) =>
      implementation.applyCandidate(
        site,
        requireCandidate(candidateId),
        options,
      ),
    applySelectedCandidate: (site: Site, candidateId: unknown) =>
      implementation.applySelectedCandidate(
        site,
        requireCandidate(candidateId),
      ),
    candidateStructureIssues: (site: Site, candidateId: unknown) =>
      implementation.candidateStructureIssues(
        site,
        requireCandidate(candidateId),
      ),
    validateDraft: (
      site: Site,
      additionalIssues: CompositionGateIssue[] = [],
    ) => implementation.validateDraft(site, additionalIssues),
    applyContentHygiene: implementation.applyContentHygiene,
    contentIssues: implementation.contentIssues,
    repairContentFit: implementation.repairContentFit,
    protectedStructureChanged: implementation.protectedStructureChanged,
    restoreProtectedStructure: implementation.restoreProtectedStructure,
    isCertifiedComponent: implementation.isCertifiedComponent,
    applyCertifiedMedia: (site: Site, candidateId: unknown) =>
      implementation.applyCertifiedMedia(site, requireCandidate(candidateId)),
    certifiedMediaIssues: (site: Site) =>
      implementation.certifiedMediaIssues(site),
  });
}
