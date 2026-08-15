import type {
  DomainEngineDependencies,
  DomainHealth,
  DomainRecord,
} from "./types";

export async function beginDomainConnection(
  dependencies: DomainEngineDependencies,
  domain: DomainRecord,
): Promise<DomainRecord> {
  if (domain.mode === "micirql-subdomain") {
    const zone = await dependencies.provider.createZone({ hostname: domain.hostname, siteId: domain.siteId });
    await dependencies.provider.ensureOriginRecords({ zoneId: zone.zoneId, hostname: domain.hostname });
    const next = {
      ...domain,
      status: "ssl_pending" as const,
      providerZoneId: zone.zoneId,
      expectedNameservers: zone.nameservers,
      lastCheckedAt: nowIso(dependencies),
    };
    await dependencies.store.saveDomain(next);
    return next;
  }

  const next = {
    ...domain,
    status: "ownership_verifying" as const,
    lastCheckedAt: nowIso(dependencies),
  };
  await dependencies.store.saveDomain(next);
  return next;
}

export async function verifyOwnership(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  if (!domain.ownershipToken) throw new Error("Domain ownership token is missing.");

  const verified = await dependencies.ownership.verifyTxt({
    hostname: domain.hostname,
    token: domain.ownershipToken,
  });

  const next: DomainRecord = verified
    ? { ...domain, status: "ownership_verified", lastCheckedAt: nowIso(dependencies), lastError: undefined }
    : { ...domain, status: "ownership_verifying", lastCheckedAt: nowIso(dependencies), lastError: "Ownership TXT record not verified." };

  await dependencies.store.saveDomain(stripUndefined(next));
  return stripUndefined(next);
}

export async function provisionManagedZone(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  if (domain.mode !== "managed-dns") throw new Error("Nameserver delegation is only used for managed-dns domains.");
  if (domain.status !== "ownership_verified" && domain.status !== "delegation_pending") {
    throw new Error("Domain ownership must be verified before provisioning DNS.");
  }

  if (!domain.providerZoneId) {
    const zone = await dependencies.provider.createZone({ hostname: domain.hostname, siteId: domain.siteId });
    const next = {
      ...domain,
      providerZoneId: zone.zoneId,
      expectedNameservers: zone.nameservers,
      status: "delegation_pending" as const,
      lastCheckedAt: nowIso(dependencies),
    };
    await dependencies.store.saveDomain(next);
    return next;
  }

  return domain;
}

export async function verifyDelegation(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  if (!domain.expectedNameservers?.length) throw new Error("Expected nameservers are missing.");
  if (!domain.providerZoneId) throw new Error("Provider zone is missing.");

  const actual = normalizeNameservers(await dependencies.delegation.nameserversFor(domain.hostname));
  const expected = normalizeNameservers(domain.expectedNameservers);
  const delegated = expected.every((nameserver) => actual.includes(nameserver));

  if (!delegated) {
    const next = stripUndefined({
      ...domain,
      status: "delegation_pending" as const,
      lastCheckedAt: nowIso(dependencies),
      lastError: "Authoritative nameservers do not yet match MiCirql DNS.",
    });
    await dependencies.store.saveDomain(next);
    return next;
  }

  await dependencies.provider.ensureOriginRecords({ zoneId: domain.providerZoneId, hostname: domain.hostname });
  const next = stripUndefined({
    ...domain,
    status: "ssl_pending" as const,
    lastCheckedAt: nowIso(dependencies),
    lastError: undefined,
  });
  await dependencies.store.saveDomain(next);
  return next;
}

export async function activateWhenReady(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  const ssl = await dependencies.provider.checkSsl({ hostname: domain.hostname });
  const next = stripUndefined({
    ...domain,
    sslStatus: ssl,
    status: ssl === "active" ? ("active" as const) : ssl === "failed" ? ("failed" as const) : ("ssl_pending" as const),
    lastCheckedAt: nowIso(dependencies),
    lastError: ssl === "failed" ? "SSL provisioning failed." : undefined,
  });
  await dependencies.store.saveDomain(next);
  return next;
}

export async function setPrimaryDomain(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<void> {
  const domain = await mustGetDomain(dependencies, domainId);
  if (domain.status !== "active" || domain.sslStatus !== "active") {
    throw new Error("Only an active HTTPS domain can become canonical.");
  }
  await dependencies.store.setPrimary(domain.siteId, domain.id);
}

export async function checkDomainHealth(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainHealth> {
  const domain = await mustGetDomain(dependencies, domainId);
  const ownershipOk = domain.mode === "micirql-subdomain" || !domain.ownershipToken
    ? true
    : await dependencies.ownership.verifyTxt({ hostname: domain.hostname, token: domain.ownershipToken });

  let delegationOk = true;
  if (domain.mode === "managed-dns" && domain.expectedNameservers?.length) {
    const actual = normalizeNameservers(await dependencies.delegation.nameserversFor(domain.hostname));
    const expected = normalizeNameservers(domain.expectedNameservers);
    delegationOk = expected.every((nameserver) => actual.includes(nameserver));
  }

  const sslOk = (await dependencies.provider.checkSsl({ hostname: domain.hostname })) === "active";
  const health = {
    ownershipOk,
    delegationOk,
    sslOk,
    healthy: ownershipOk && delegationOk && sslOk,
    checkedAt: nowIso(dependencies),
  };

  const next = stripUndefined({
    ...domain,
    status: health.healthy ? ("active" as const) : domain.status === "active" ? ("degraded" as const) : domain.status,
    sslStatus: sslOk ? ("active" as const) : domain.sslStatus,
    lastCheckedAt: health.checkedAt,
    lastError: health.healthy ? undefined : "Domain health check failed.",
  });
  await dependencies.store.saveDomain(next);
  return health;
}

export async function disconnectDomain(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  const siteDomains = await dependencies.store.listSiteDomains(domain.siteId);
  if (domain.primary && siteDomains.some((candidate) => candidate.id !== domain.id && candidate.status === "active")) {
    throw new Error("Move the canonical domain before disconnecting the current primary domain.");
  }

  const disconnecting = { ...domain, status: "disconnecting" as const, lastCheckedAt: nowIso(dependencies) };
  await dependencies.store.saveDomain(disconnecting);

  if (domain.providerZoneId) await dependencies.provider.deleteZone({ zoneId: domain.providerZoneId });

  const disconnected = stripUndefined({
    ...disconnecting,
    status: "disconnected" as const,
    primary: false,
    providerZoneId: undefined,
    expectedNameservers: undefined,
    lastError: undefined,
  });
  await dependencies.store.saveDomain(disconnected);
  return disconnected;
}

async function mustGetDomain(dependencies: DomainEngineDependencies, domainId: string): Promise<DomainRecord> {
  const domain = await dependencies.store.getDomain(domainId);
  if (!domain) throw new Error("Domain not found.");
  return domain;
}

function nowIso(dependencies: DomainEngineDependencies): string {
  return (dependencies.now?.() ?? new Date()).toISOString();
}

function normalizeNameservers(values: string[]): string[] {
  return values.map((value) => value.trim().toLowerCase().replace(/\.$/, "")).sort();
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
