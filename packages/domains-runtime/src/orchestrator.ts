import {
  activateWhenReady,
  beginDomainConnection,
  checkDomainHealth,
  provisionManagedZone,
  verifyDelegation,
  verifyOwnership,
} from "./engine";
import type { DomainEngineDependencies, DomainRecord } from "./types";

export type DomainOrchestratorResult = {
  domain: DomainRecord;
  advanced: boolean;
  retryAfterSeconds?: number;
};

export async function reconcileDomain(
  dependencies: DomainEngineDependencies,
  domainId: string,
): Promise<DomainOrchestratorResult> {
  const domain = await dependencies.store.getDomain(domainId);
  if (!domain) throw new Error("Domain not found.");

  switch (domain.status) {
    case "pending": {
      const next = await beginDomainConnection(dependencies, domain);
      return withRetry(next, next.status !== domain.status, retryFor(next));
    }
    case "ownership_verifying": {
      const next = await verifyOwnership(dependencies, domain.id);
      if (next.status === "ownership_verified" && next.mode === "managed-dns") {
        const provisioned = await provisionManagedZone(dependencies, next.id);
        return withRetry(provisioned, true, retryFor(provisioned));
      }
      return withRetry(next, next.status !== domain.status, retryFor(next));
    }
    case "ownership_verified": {
      if (domain.mode === "managed-dns") {
        const next = await provisionManagedZone(dependencies, domain.id);
        return withRetry(next, next.status !== domain.status, retryFor(next));
      }
      return { domain, advanced: false };
    }
    case "delegation_pending": {
      const next = await verifyDelegation(dependencies, domain.id);
      return withRetry(next, next.status !== domain.status, retryFor(next));
    }
    case "delegated":
    case "zone_provisioned":
    case "ssl_pending": {
      const next = await activateWhenReady(dependencies, domain.id);
      return withRetry(next, next.status !== domain.status, retryFor(next));
    }
    case "active":
    case "degraded": {
      const health = await checkDomainHealth(dependencies, domain.id);
      const refreshed = await dependencies.store.getDomain(domain.id);
      if (!refreshed) throw new Error("Domain disappeared during reconciliation.");
      return withRetry(refreshed, refreshed.status !== domain.status, health.healthy ? 3600 : 300);
    }
    case "failed":
      return withRetry(domain, false, 900);
    case "disconnecting":
    case "disconnected":
      return { domain, advanced: false };
  }
}

export async function reconcileSiteDomains(
  dependencies: DomainEngineDependencies,
  siteId: string,
): Promise<DomainOrchestratorResult[]> {
  const domains = await dependencies.store.listSiteDomains(siteId);
  const results: DomainOrchestratorResult[] = [];
  for (const domain of domains) {
    results.push(await reconcileDomain(dependencies, domain.id));
  }
  return results;
}

function withRetry(domain: DomainRecord, advanced: boolean, retryAfterSeconds?: number): DomainOrchestratorResult {
  return retryAfterSeconds === undefined
    ? { domain, advanced }
    : { domain, advanced, retryAfterSeconds };
}

function retryFor(domain: DomainRecord): number | undefined {
  switch (domain.status) {
    case "ownership_verifying":
      return 120;
    case "delegation_pending":
      return 180;
    case "ssl_pending":
      return 120;
    case "degraded":
      return 300;
    case "active":
      return 3600;
    case "failed":
      return 900;
    default:
      return undefined;
  }
}
