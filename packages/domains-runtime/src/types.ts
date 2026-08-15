export type DomainLifecycleStatus =
  | "pending"
  | "ownership_verifying"
  | "ownership_verified"
  | "delegation_pending"
  | "delegated"
  | "zone_provisioned"
  | "ssl_pending"
  | "active"
  | "degraded"
  | "disconnecting"
  | "disconnected"
  | "failed";

export type DomainRecord = {
  id: string;
  workspaceId: string;
  siteId: string;
  hostname: string;
  mode: "micirql-subdomain" | "custom-domain" | "managed-dns";
  status: DomainLifecycleStatus;
  primary: boolean;
  ownershipToken?: string;
  providerZoneId?: string;
  expectedNameservers?: string[];
  sslStatus: "pending" | "active" | "failed";
  lastCheckedAt?: string;
  lastError?: string;
};

export type DomainProvider = {
  createZone(args: { hostname: string; siteId: string }): Promise<{ zoneId: string; nameservers: string[] }>;
  deleteZone(args: { zoneId: string }): Promise<void>;
  ensureOriginRecords(args: { zoneId: string; hostname: string }): Promise<void>;
  checkSsl(args: { hostname: string }): Promise<"pending" | "active" | "failed">;
};

export type OwnershipVerifier = {
  verifyTxt(args: { hostname: string; token: string }): Promise<boolean>;
};

export type DelegationVerifier = {
  nameserversFor(hostname: string): Promise<string[]>;
};

export type DomainStore = {
  getDomain(domainId: string): Promise<DomainRecord | undefined>;
  saveDomain(domain: DomainRecord): Promise<void>;
  listSiteDomains(siteId: string): Promise<DomainRecord[]>;
  setPrimary(siteId: string, domainId: string): Promise<void>;
};

export type DomainHealth = {
  ownershipOk: boolean;
  delegationOk: boolean;
  sslOk: boolean;
  healthy: boolean;
  checkedAt: string;
};

export type DomainEngineDependencies = {
  store: DomainStore;
  provider: DomainProvider;
  ownership: OwnershipVerifier;
  delegation: DelegationVerifier;
  now?: () => Date;
};
