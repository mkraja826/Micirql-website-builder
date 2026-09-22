export type OperationalOperation =
  | "publication.publish"
  | "publication.reconcile"
  | "published_site.render";

export type OperationalOutcome = "success" | "rejected" | "failure" | "uncertain" | "not_found";

export type OperationalFailureCode =
  | "auth_rejected"
  | "service_unavailable"
  | "invalid_request"
  | "site_not_found_or_forbidden"
  | "publication_rejected"
  | "publication_outcome_unknown"
  | "reconciliation_failed"
  | "published_revision_absent"
  | "published_site_not_found"
  | "published_site_load_failed";

export type OperationalEvent = {
  requestId: string;
  operation: OperationalOperation;
  outcome: OperationalOutcome;
  durationMs?: number;
  statusCode?: number;
  siteId?: string;
  versionId?: string;
  previousVersionId?: string | null;
  failureCode?: OperationalFailureCode;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cloudflareRayPattern = /^[0-9a-f]{16}(?:-[a-z]{3})?$/i;
const identifierPattern = /^[a-zA-Z0-9:_-]{1,128}$/;

export function getOperationalRequestId(headers: Pick<Headers, "get">): string {
  const suppliedId = headers.get("x-request-id")?.trim();
  if (suppliedId && uuidPattern.test(suppliedId)) return suppliedId.toLowerCase();

  const edgeRayId = headers.get("cf-ray")?.trim();
  if (edgeRayId && cloudflareRayPattern.test(edgeRayId)) return edgeRayId;

  return crypto.randomUUID();
}

function safeIdentifier(value: string | null | undefined): string | undefined {
  if (!value || !identifierPattern.test(value)) return undefined;
  return value;
}

export function emitOperationalEvent(event: OperationalEvent): void {
  const payload = {
    schema: "micirql.operational.v1",
    timestamp: new Date().toISOString(),
    requestId: event.requestId,
    operation: event.operation,
    outcome: event.outcome,
    ...(Number.isFinite(event.durationMs) ? { durationMs: Math.max(0, Math.round(event.durationMs!)) } : {}),
    ...(Number.isInteger(event.statusCode) ? { statusCode: event.statusCode } : {}),
    ...(safeIdentifier(event.siteId) ? { siteId: safeIdentifier(event.siteId) } : {}),
    ...(safeIdentifier(event.versionId) ? { versionId: safeIdentifier(event.versionId) } : {}),
    ...(event.previousVersionId === null
      ? { previousVersionId: null }
      : safeIdentifier(event.previousVersionId)
        ? { previousVersionId: safeIdentifier(event.previousVersionId) }
        : {}),
    ...(event.failureCode ? { failureCode: event.failureCode } : {}),
  };

  const line = JSON.stringify(payload);
  if (event.outcome === "failure" || event.outcome === "uncertain") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
