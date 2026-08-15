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
    const next: DomainRecord = {
      ...domain,
      status: "ssl_pending",
      providerZoneId: zone.zoneId,
      expectedNameservers: zone.nameservers,
      lastCheckedAt: nowIso(dependencies),
    };
    await dependencies.store.saveDomain(next);
    return next;
  }

  const next: DomainRecord = {
    ...domain,
    status: "ownership_verifying",
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
    ? withoutLastError({ ...domain, status: "ownership_verified", lastCheckedAt: nowIso(dependencies) })
    : { ...domain, status: "ownership_verifying", lastCheckedAt: nowIso(dependencies), lastError: "Ownership TXT record not verified." };

  await dependencies.store.saveDomain(next);
  return next;
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
    const next: DomainRecord = {
      ...domain,
      providerZoneId: zone.zoneId,
      expectedNameservers: zone.nameservers,
      status: "delegation_pending",
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
    const next: DomainRecord = {
      ...domain,
      status: "delegation_pending",
      lastCheckedAt: nowIso(dependencies),
      lastError: "Authoritative nameservers do not yet match MiCirql DNS.",
    };
    await dependencies.store.saveDomain(next);
    return next;
  }

  await dependencies.provider.ensureOriginRecords({ zoneId: domain.providerZoneId, hostname: domain.hostname });
  const next = withoutLastError({
    ...domain,
    status: "ssl_pending" as const,
    lastCheckedAt: nowIso(dependencies),
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
  const base: DomainRecord = {
    ...domain,
    sslStatus: ssl,
    status: ssl === "active" ? "active" : ssl === "failed" ? "failed" : "ssl_pending",
    lastCheckedAt: nowIso(dependencies),
    ...(ssl === "failed" ? { lastError: "SSL provisioning failed." } : {}),
  };
  const next = ssl === "failed" ? base : withoutLastError(base);
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
  const health: DomainHealth = {
    ownershipOk,
    delegationOk,
    sslOk,
    healthy: ownershipOk && delegationOk && sslOk,
    checkedAt: nowIso(dependencies),
  };

  const base: DomainRecord = {
    ...domain,
    status: health.healthy ? "active" : domain.status === "active" ? "degraded" : domain.status,
    sslStatus: sslOk ? "active" : domain.sslStatus,
    lastCheckedAt: health.checkedAt,
    ...(health.healthy ? {} : { lastError: "Domain health check failed." }),
  };
  const next = health.healthy ? withoutLastError(base) : base;
  await dependencies.store.saveDomain(next);
  return health;
}

export async function disconnectDomain(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainRecord> {
  const domain = await mustGetDomain(dependencies, domainId);
  if (domain.primary) {
    throw new Error("Move the canonical domain before disconnecting the current primary domain.");
  }

  const disconnecting: DomainRecord = { ...domain, status: "disconnecting", lastCheckedAt: nowIso(dependencies) };
  await dependencies.store.saveDomain(disconnecting);

  if (domain.providerZoneId) await dependencies.provider.deleteZone({ zoneId: domain.providerZoneId });

  const { providerZoneId: _providerZoneId, expectedNameservers: _expectedNameservers, lastError: _lastError, ...rest } = disconnecting;
  const disconnected: DomainRecord = {
    ...rest,
    status: "disconnected",
    primary: false,
  };
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

function withoutLastError<T extends DomainRecord>(domain: T): DomainRecord {
  const { lastError: _lastError, ...rest } = domain;
  return rest;
}
