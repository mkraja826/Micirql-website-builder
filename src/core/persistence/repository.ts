import type {
  DurableSiteRecord,
  LoadDurableSiteInput,
  LoadPublishedSiteInput,
  PersistCertifiedSiteInput,
  PublicationTransition,
  PublishedDurableSiteRecord,
  SetPublishedSiteVersionInput,
} from "./schema";

export interface SitePersistenceRepository {
  saveCertifiedSite(input: PersistCertifiedSiteInput): Promise<DurableSiteRecord>;
  loadLatest(input: LoadDurableSiteInput): Promise<DurableSiteRecord | null>;
  loadPublished(input: LoadPublishedSiteInput): Promise<PublishedDurableSiteRecord | null>;
  setPublishedVersion(input: SetPublishedSiteVersionInput): Promise<PublicationTransition>;
}

export function assertPersistableCertifiedSite(input: PersistCertifiedSiteInput): void {
  const { certified } = input;
  const { site, winner } = certified;

  if (!input.workspaceId || !input.actorId || !input.name.trim()) {
    throw new Error("Durable site persistence requires workspace, actor, and site name.");
  }

  if (winner.rank !== 1 || winner.certification.hardFailureCount !== 0 || !winner.certification.repairAccepted) {
    throw new Error("Only a fully certified rank-1 winner can be persisted.");
  }

  if (
    site.status !== "draft" ||
    !Number.isSafeInteger(site.revision) ||
    site.revision < 1 ||
    site.version !== "1.0"
  ) {
    throw new Error("Unsupported materialized site state for durable persistence.");
  }

  if (winner.candidateId !== site.source.candidateId) {
    throw new Error("Certified winner does not match materialized site provenance.");
  }

  if (!certified.certifiedFingerprint || certified.certifiedFingerprint !== site.fingerprint) {
    throw new Error("Certification does not cover this exact materialized site snapshot.");
  }
}
