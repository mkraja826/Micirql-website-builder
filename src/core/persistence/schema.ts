import type { CertifiedMaterializedSite } from "../certification/schema";
import type { MaterializedSiteSnapshot } from "../materialization/schema";

export type DurableSiteStatus = "draft" | "published";

export type DurableSiteRecord = {
  dbSiteId: string;
  workspaceId: string;
  materializedSiteId: string;
  name: string;
  status: DurableSiteStatus;
  publishedVersionId: string | null;
  versionId: string;
  source: MaterializedSiteSnapshot["source"];
  revision: MaterializedSiteSnapshot["revision"];
  fingerprint: MaterializedSiteSnapshot["fingerprint"];
  snapshot: MaterializedSiteSnapshot;
  winner: CertifiedMaterializedSite["winner"];
  createdBy: string;
};

export type PublishedDurableSiteRecord = DurableSiteRecord & {
  status: "published";
  publishedVersionId: string;
};

export type PersistCertifiedSiteInput = {
  workspaceId: string;
  name: string;
  actorId: string;
  certified: CertifiedMaterializedSite;
};

export type LoadDurableSiteInput = {
  workspaceId: string;
  materializedSiteId: string;
};

export type LoadPublishedSiteInput = {
  siteId: string;
};

export type SetPublishedSiteVersionInput = {
  siteId: string;
  versionId: string;
  actorId: string;
};

export type PublicationTransition = {
  siteId: string;
  publishedVersionId: string;
  previousPublishedVersionId: string | null;
};
