import type { SupabaseClient } from "@supabase/supabase-js";
import {
  backendBindingFromRegistry,
  loadActiveSiteAction,
  type RequestCapabilityId,
  type VerifiedSiteActionBinding,
} from "./action-registry";
import type { VerifiedBackendBinding } from "./activation";

export type SiteActionBindingStatus = "active" | "disabled";

export type SetSiteActionBindingInput = {
  workspaceId: string;
  siteId: string;
  capabilityKey: RequestCapabilityId;
  actionId: string;
  actionVersion: string;
  status?: SiteActionBindingStatus;
};

type BindingRow = {
  site_id: string;
  capability_key: RequestCapabilityId;
  action_id: string;
  action_version: string;
  status: SiteActionBindingStatus;
  verification_evidence_id: string;
  verified_by: "system";
};

function normalizeBinding(row: BindingRow): VerifiedSiteActionBinding {
  if (row.verified_by !== "system") {
    throw new Error("Site action binding was not system verified.");
  }
  if (!row.verification_evidence_id?.trim()) {
    throw new Error("Site action binding is missing verification evidence.");
  }
  return {
    siteId: row.site_id,
    capabilityKey: row.capability_key,
    actionId: row.action_id,
    actionVersion: row.action_version,
    status: row.status,
    verificationEvidenceId: row.verification_evidence_id,
    verifiedBy: "system",
  };
}

export async function setSiteActionBinding(
  client: SupabaseClient,
  input: SetSiteActionBindingInput,
): Promise<VerifiedSiteActionBinding> {
  if (!input.workspaceId.trim() || !input.siteId.trim()) {
    throw new Error("Workspace and site IDs are required.");
  }

  const definition = await loadActiveSiteAction(client, input.actionId, input.actionVersion);
  if (!definition.capabilityKeys.includes(input.capabilityKey)) {
    throw new Error(`Registered action does not support capability ${input.capabilityKey}.`);
  }

  const { data, error } = await client.rpc("set_site_action_binding", {
    p_workspace_id: input.workspaceId,
    p_site_id: input.siteId,
    p_capability_key: input.capabilityKey,
    p_action_id: input.actionId,
    p_action_version: input.actionVersion,
    p_status: input.status ?? "active",
  });

  if (error) throw new Error(`Failed to set site action binding: ${error.message}`);
  if (!data) throw new Error("Site action binding RPC returned no binding.");

  return normalizeBinding(data as BindingRow);
}

export async function activateVerifiedSiteActionBinding(
  client: SupabaseClient,
  input: Omit<SetSiteActionBindingInput, "status">,
): Promise<VerifiedBackendBinding> {
  const definition = await loadActiveSiteAction(client, input.actionId, input.actionVersion);
  const binding = await setSiteActionBinding(client, { ...input, status: "active" });
  return backendBindingFromRegistry(definition, binding);
}

export async function disableSiteActionBinding(
  client: SupabaseClient,
  input: Omit<SetSiteActionBindingInput, "status">,
): Promise<VerifiedSiteActionBinding> {
  return setSiteActionBinding(client, { ...input, status: "disabled" });
}
