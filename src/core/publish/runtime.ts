import { REQUEST_CAPABILITY_IDS, type RequestCapabilityId } from "../capabilities/action-registry";

export type PublishedCapabilityState = {
  id: string;
  state: "active" | "disabled_preview" | "disabled_needs_configuration";
};

export type PublishedSiteRuntime = {
  dbSiteId: string;
  status: "published";
  publishedVersionId: string;
  renderedVersionId: string;
  capabilities: PublishedCapabilityState[];
};

export type PublishedRequestAction = {
  siteId: string;
  capabilityKey: RequestCapabilityId;
};

function isRequestCapabilityId(value: string): value is RequestCapabilityId {
  return REQUEST_CAPABILITY_IDS.includes(value as RequestCapabilityId);
}

/**
 * Build the only request-action identity that published rendering is allowed to
 * pass into generated request-form sections.
 *
 * This intentionally contains no actionId/actionVersion. The browser must
 * resolve the current verified binding through resolve_public_site_action.
 */
export function buildPublishedRequestAction(
  runtime: PublishedSiteRuntime | null | undefined,
  capabilityKey: string,
): PublishedRequestAction | undefined {
  if (!runtime) return undefined;
  if (!runtime.dbSiteId.trim()) return undefined;
  if (!runtime.publishedVersionId.trim()) return undefined;
  if (runtime.renderedVersionId !== runtime.publishedVersionId) return undefined;
  if (!isRequestCapabilityId(capabilityKey)) return undefined;

  const capability = runtime.capabilities.find((item) => item.id === capabilityKey);
  if (!capability || capability.state !== "active") return undefined;

  return {
    siteId: runtime.dbSiteId,
    capabilityKey,
  };
}
