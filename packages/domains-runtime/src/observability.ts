import type { DomainHealth, DomainRecord } from "./types";

export type DomainFailureClass =
  | "ownership"
  | "delegation"
  | "ssl"
  | "provider"
  | "configuration"
  | "unknown";

export type DomainHealthEvent = {
  id: string;
  domainId: string;
  siteId: string;
  hostname: string;
  checkedAt: string;
  status: DomainRecord["status"];
  healthy: boolean;
  ownershipOk?: boolean;
  delegationOk?: boolean;
  sslOk?: boolean;
  failureClass?: DomainFailureClass;
  message?: string;
};

export type DomainIncidentSeverity = "warning" | "critical";
export type DomainIncidentStatus = "open" | "resolved";

export type DomainIncident = {
  id: string;
  domainId: string;
  siteId: string;
  hostname: string;
  failureClass: DomainFailureClass;
  severity: DomainIncidentSeverity;
  status: DomainIncidentStatus;
  consecutiveFailures: number;
  openedAt: string;
  updatedAt: string;
  resolvedAt?: string;
  message: string;
};

export type DomainObservabilityStore = {
  appendHealthEvent(event: DomainHealthEvent): Promise<void>;
  recentHealthEvents(domainId: string, limit: number): Promise<DomainHealthEvent[]>;
  getOpenIncident(domainId: string): Promise<DomainIncident | undefined>;
  saveIncident(incident: DomainIncident): Promise<void>;
};

export type DomainIncidentNotifier = {
  notifyOpened(incident: DomainIncident): Promise<void>;
  notifyEscalated(incident: DomainIncident): Promise<void>;
  notifyResolved(incident: DomainIncident): Promise<void>;
};

export type DomainObservabilityDependencies = {
  store: DomainObservabilityStore;
  notifier?: DomainIncidentNotifier;
  now?: () => Date;
  ids?: { create(prefix: string): string };
};

export async function recordDomainHealth(
  dependencies: DomainObservabilityDependencies,
  domain: DomainRecord,
  health: DomainHealth,
): Promise<DomainIncident | undefined> {
  const checkedAt = health.checkedAt;
  const failureClass = health.healthy ? undefined : classifyHealthFailure(health);
  const event: DomainHealthEvent = {
    id: createId(dependencies, "health"),
    domainId: domain.id,
    siteId: domain.siteId,
    hostname: domain.hostname,
    checkedAt,
    status: domain.status,
    healthy: health.healthy,
    ...(health.ownershipOk === undefined ? {} : { ownershipOk: health.ownershipOk }),
    ...(health.delegationOk === undefined ? {} : { delegationOk: health.delegationOk }),
    ...(health.sslOk === undefined ? {} : { sslOk: health.sslOk }),
    ...(failureClass === undefined ? {} : { failureClass }),
    ...(health.healthy ? {} : { message: domain.lastError ?? "Domain health check failed." }),
  };
  await dependencies.store.appendHealthEvent(event);

  const open = await dependencies.store.getOpenIncident(domain.id);
  if (health.healthy) {
    if (!open) return undefined;
    const resolved: DomainIncident = {
      ...open,
      status: "resolved",
      updatedAt: checkedAt,
      resolvedAt: checkedAt,
      message: "Domain health recovered.",
    };
    await dependencies.store.saveIncident(resolved);
    await safeNotify(() => dependencies.notifier?.notifyResolved(resolved));
    return resolved;
  }

  const recent = await dependencies.store.recentHealthEvents(domain.id, 6);
  const failures = consecutiveFailures(recent);
  const severity: DomainIncidentSeverity = failures >= 3 ? "critical" : "warning";
  const classified = failureClass ?? "unknown";

  if (!open) {
    if (failures < 2) return undefined;
    const incident: DomainIncident = {
      id: createId(dependencies, "incident"),
      domainId: domain.id,
      siteId: domain.siteId,
      hostname: domain.hostname,
      failureClass: classified,
      severity,
      status: "open",
      consecutiveFailures: failures,
      openedAt: checkedAt,
      updatedAt: checkedAt,
      message: incidentMessage(classified, failures),
    };
    await dependencies.store.saveIncident(incident);
    await safeNotify(() => dependencies.notifier?.notifyOpened(incident));
    return incident;
  }

  const escalated = open.severity !== "critical" && severity === "critical";
  const updated: DomainIncident = {
    ...open,
    failureClass: classified,
    severity,
    consecutiveFailures: failures,
    updatedAt: checkedAt,
    message: incidentMessage(classified, failures),
  };
  await dependencies.store.saveIncident(updated);
  if (escalated) await safeNotify(() => dependencies.notifier?.notifyEscalated(updated));
  return updated;
}

export function classifyHealthFailure(health: DomainHealth): DomainFailureClass {
  if (!health.ownershipOk) return "ownership";
  if (!health.delegationOk) return "delegation";
  if (!health.sslOk) return "ssl";
  return "unknown";
}

export function classifyDomainError(error: unknown): DomainFailureClass {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("ownership") || message.includes("txt")) return "ownership";
  if (message.includes("nameserver") || message.includes("delegation") || message.includes(" ns ")) return "delegation";
  if (message.includes("ssl") || message.includes("certificate") || message.includes("https")) return "ssl";
  if (message.includes("cloudflare") || message.includes("provider") || message.includes("api")) return "provider";
  if (message.includes("missing") || message.includes("invalid") || message.includes("conflict")) return "configuration";
  return "unknown";
}

function consecutiveFailures(events: DomainHealthEvent[]): number {
  let count = 0;
  for (const event of [...events].sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))) {
    if (event.healthy) break;
    count += 1;
  }
  return count;
}

function incidentMessage(failureClass: DomainFailureClass, failures: number): string {
  const label: Record<DomainFailureClass, string> = {
    ownership: "domain ownership verification",
    delegation: "nameserver delegation",
    ssl: "HTTPS certificate readiness",
    provider: "DNS provider communication",
    configuration: "domain configuration",
    unknown: "domain health",
  };
  return `${label[failureClass]} has failed ${failures} consecutive checks.`;
}

function createId(dependencies: DomainObservabilityDependencies, prefix: string): string {
  return dependencies.ids?.create(prefix) ?? `${prefix}_${crypto.randomUUID()}`;
}

async function safeNotify(callback: () => Promise<void> | undefined): Promise<void> {
  try {
    await callback();
  } catch {
    // Notification delivery must not alter domain health state or incident persistence.
  }
}
