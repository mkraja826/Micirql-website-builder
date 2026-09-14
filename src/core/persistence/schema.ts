import type { CertifiedMaterializedSite } from "../certification/schema";
import type { MaterializedSiteSnapshot } from "../materialization/schema";

export type DurableSiteStatus = "draft";

export type DurableSiteRecord = {
  dbSiteId: string;
  workspaceId: string;
  materializedSiteId: string;
  name: string;
  status: DurableSiteStatus;
  source: MaterializedSiteSnapshot["source"];
  revision: MaterializedSiteSnapshot["revision"];
  fingerprint: MaterializedSiteSnapshot["fingerprint"];
  snapshot: MaterializedSiteSnapshot;
  winner: CertifiedMaterializedSite["winner"];
  createdBy: string;
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
