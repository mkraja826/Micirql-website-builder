import type { MaterializedSiteSnapshot } from "../materialization/schema";

export type CandidateCertificationEvidence = {
  candidateId: string;
  rank: number;
  finalScore: number;
  hardFailures: string[];
  repairAccepted: boolean;
};

export type CertifiedWinner = {
  version: "1.0";
  candidateId: string;
  rank: 1;
  finalScore: number;
  certification: {
    hardFailureCount: 0;
    repairAccepted: true;
  };
};

export type CertifiedMaterializedSite = {
  version: "1.0";
  winner: CertifiedWinner;
  /** Exact immutable materialized snapshot fingerprint covered by this certification. */
  certifiedFingerprint: MaterializedSiteSnapshot["fingerprint"];
  site: MaterializedSiteSnapshot;
};
