import type { SupabaseClient } from "@supabase/supabase-js";
import { REQUEST_CAPABILITY_IDS, type RequestCapabilityId } from "./action-registry";

export type PublicSiteAction = {
  siteId: string;
  capabilityKey: RequestCapabilityId;
  actionId: string;
  actionVersion: string;
};

type PublicSiteActionRow = {
  site_id: string;
  capability_key: string;
  action_id: string;
  action_version: string;
};

export async function resolvePublicSiteAction(
  client: SupabaseClient,
  siteId: string,
  capabilityKey: RequestCapabilityId,
): Promise<PublicSiteAction | null> {
  if (!siteId.trim()) return null;

  const { data, error } = await client.rpc("resolve_public_site_action", {
    p_site_id: siteId,
    p_capability_key: capabilityKey,
  });

  if (error) throw new Error(`Failed to resolve public site action: ${error.message}`);

  const row = Array.isArray(data) ? data[0] as PublicSiteActionRow | undefined : undefined;
  if (!row) return null;

  if (!REQUEST_CAPABILITY_IDS.includes(row.capability_key as RequestCapabilityId)) {
    throw new Error("Resolved public site action returned an unsupported capability.");
  }

  if (row.site_id !== siteId || row.capability_key !== capabilityKey || !row.action_id || !row.action_version) {
    throw new Error("Resolved public site action returned invalid identity metadata.");
  }

  return {
    siteId: row.site_id,
    capabilityKey: row.capability_key as RequestCapabilityId,
    actionId: row.action_id,
    actionVersion: row.action_version,
  };
}
