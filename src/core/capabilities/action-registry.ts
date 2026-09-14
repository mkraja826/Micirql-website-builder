import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerifiedBackendBinding } from "./activation";

export const REQUEST_CAPABILITY_IDS = [
  "appointment",
  "contact",
  "booking_enquiry",
  "reservation",
  "lead_capture",
  "property_enquiry",
  "demo_request",
  "admission_enquiry",
  "job_application",
  "employer_enquiry",
] as const;

export type RequestCapabilityId = (typeof REQUEST_CAPABILITY_IDS)[number];
export type SiteActionHandlerKind = "lead_request";
export type SiteActionStatus = "draft" | "active" | "retired";

export type SiteActionDefinition = {
  actionId: string;
  actionVersion: string;
  handlerKind: SiteActionHandlerKind;
  capabilityKeys: RequestCapabilityId[];
  status: SiteActionStatus;
  contract: {
    semantics: "request_only";
    guarantees: string[];
    doesNotGuarantee: string[];
    requires: string[];
  };
};

export type VerifiedSiteActionBinding = {
  siteId: string;
  capabilityKey: RequestCapabilityId;
  actionId: string;
  actionVersion: string;
  status: "disabled" | "active";
  verificationEvidenceId: string;
  verifiedBy: "system";
};

export type SiteActionSubmission = {
  siteId: string;
  actionId: string;
  actionVersion: string;
  requestId: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  fields?: Record<string, unknown>;
  consent: true;
  sourcePage?: string;
};

export type SiteActionReceipt = {
  accepted: true;
  requestId: string;
  submissionId: string;
  actionId: string;
  actionVersion: string;
  semantics: "request_only";
};

type RegistryRow = {
  action_id: string;
  action_version: string;
  handler_kind: SiteActionHandlerKind;
  capability_keys: RequestCapabilityId[];
  status: SiteActionStatus;
  contract: {
    semantics?: string;
    guarantees?: unknown;
    does_not_guarantee?: unknown;
    requires?: unknown;
  };
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : [];
}

function assertActiveDefinition(row: RegistryRow): SiteActionDefinition {
  if (row.status !== "active") throw new Error(`${row.action_id}@${row.action_version} is not active.`);
  if (row.handler_kind !== "lead_request") throw new Error(`Unsupported handler kind ${row.handler_kind}.`);
  if (row.contract?.semantics !== "request_only") {
    throw new Error(`${row.action_id}@${row.action_version} must declare request_only semantics.`);
  }
  const allowed = new Set<string>(REQUEST_CAPABILITY_IDS);
  if (!row.capability_keys.length || row.capability_keys.some((key) => !allowed.has(key))) {
    throw new Error(`${row.action_id}@${row.action_version} has invalid capability coverage.`);
  }

  return {
    actionId: row.action_id,
    actionVersion: row.action_version,
    handlerKind: row.handler_kind,
    capabilityKeys: row.capability_keys,
    status: row.status,
    contract: {
      semantics: "request_only",
      guarantees: stringArray(row.contract.guarantees),
      doesNotGuarantee: stringArray(row.contract.does_not_guarantee),
      requires: stringArray(row.contract.requires),
    },
  };
}

export async function loadActiveSiteAction(
  client: SupabaseClient,
  actionId: string,
  actionVersion: string,
): Promise<SiteActionDefinition> {
  const { data, error } = await client
    .from("site_action_registry")
    .select("action_id, action_version, handler_kind, capability_keys, status, contract")
    .eq("action_id", actionId)
    .eq("action_version", actionVersion)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(`Failed to load site action registry: ${error.message}`);
  if (!data) throw new Error(`No active registered site action ${actionId}@${actionVersion}.`);
  return assertActiveDefinition(data as RegistryRow);
}

export function backendBindingFromRegistry(
  definition: SiteActionDefinition,
  binding: VerifiedSiteActionBinding,
): VerifiedBackendBinding {
  if (binding.status !== "active" || binding.verifiedBy !== "system") {
    throw new Error(`Capability ${binding.capabilityKey} is not actively system-verified.`);
  }
  if (!binding.verificationEvidenceId.trim()) {
    throw new Error(`Capability ${binding.capabilityKey} lacks verification evidence.`);
  }
  if (binding.actionId !== definition.actionId || binding.actionVersion !== definition.actionVersion) {
    throw new Error(`Capability ${binding.capabilityKey} binding does not match the registered action.`);
  }
  if (!definition.capabilityKeys.includes(binding.capabilityKey)) {
    throw new Error(`Registered action does not support capability ${binding.capabilityKey}.`);
  }

  return {
    capabilityId: binding.capabilityKey,
    kind: "site_function",
    reference: definition.actionId,
    version: definition.actionVersion,
    verification: {
      status: "verified",
      evidenceId: binding.verificationEvidenceId,
      checkedBy: "system",
    },
  };
}

export async function submitRegisteredSiteAction(
  client: SupabaseClient,
  input: SiteActionSubmission,
): Promise<SiteActionReceipt> {
  if (!input.consent) throw new Error("Submission consent is required.");
  if (!input.name.trim()) throw new Error("Submission name is required.");
  if (!input.email?.trim() && !input.phone?.trim()) throw new Error("Submission requires email or phone.");
  if (input.requestId.trim().length < 8) throw new Error("Submission request ID is invalid.");

  const { data, error } = await client.rpc("submit_site_action", {
    p_site_id: input.siteId,
    p_action_id: input.actionId,
    p_action_version: input.actionVersion,
    p_request_id: input.requestId.trim(),
    p_name: input.name.trim(),
    p_email: input.email?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_message: input.message?.trim() || null,
    p_fields: input.fields ?? {},
    p_consent: true,
    p_source_page: input.sourcePage?.trim() || null,
  });

  if (error) throw new Error(`Site action submission failed: ${error.message}`);
  const receipt = data as Partial<SiteActionReceipt> | null;
  if (!receipt?.accepted || receipt.semantics !== "request_only" || !receipt.submissionId) {
    throw new Error("Site action submission returned an invalid receipt.");
  }
  return receipt as SiteActionReceipt;
}
