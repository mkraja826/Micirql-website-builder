import type { PublishableDraft, PublishableDraftCapability } from "../publish/schema";

export type BackendBindingKind = "site_function" | "external_url";

export type VerifiedBackendBinding = {
  capabilityId: string;
  kind: BackendBindingKind;
  reference: string;
  version?: string;
  verification: {
    status: "verified";
    evidenceId: string;
    checkedBy: "system";
  };
};

export type CapabilityActivationResult = {
  draft: PublishableDraft;
  activated: string[];
  unchanged: string[];
};

const BACKEND_CAPABILITIES = new Set([
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
]);

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function assertBinding(binding: VerifiedBackendBinding) {
  if (!BACKEND_CAPABILITIES.has(binding.capabilityId)) {
    throw new Error(`Capability ${binding.capabilityId} is not eligible for backend activation.`);
  }
  if (binding.verification.status !== "verified" || binding.verification.checkedBy !== "system") {
    throw new Error(`Capability ${binding.capabilityId} lacks system verification.`);
  }
  if (!binding.verification.evidenceId.trim()) {
    throw new Error(`Capability ${binding.capabilityId} is missing verification evidence.`);
  }
  if (!binding.reference.trim()) {
    throw new Error(`Capability ${binding.capabilityId} is missing a backend binding reference.`);
  }
  if (binding.kind === "site_function") {
    if (!binding.version?.trim()) {
      throw new Error(`Capability ${binding.capabilityId} site function binding is missing a version.`);
    }
    if (!/^[a-z0-9][a-z0-9._:-]*$/i.test(binding.reference)) {
      throw new Error(`Capability ${binding.capabilityId} has an invalid site function reference.`);
    }
    return;
  }
  if (!isHttpsUrl(binding.reference)) {
    throw new Error(`Capability ${binding.capabilityId} external binding must use HTTPS.`);
  }
}

function hrefForBinding(binding: VerifiedBackendBinding) {
  return binding.kind === "external_url" ? binding.reference : undefined;
}

function activateCapability(
  capability: PublishableDraftCapability,
  binding: VerifiedBackendBinding | undefined,
): PublishableDraftCapability {
  if (capability.state === "active") return capability;
  if (!binding) return capability;

  assertBinding(binding);
  if (binding.capabilityId !== capability.id) {
    throw new Error(`Capability activation evidence does not match ${capability.id}.`);
  }

  return {
    ...capability,
    state: "active",
    href: hrefForBinding(binding),
    reason: binding.kind === "site_function"
      ? `${capability.label} is active through verified site function ${binding.reference}@${binding.version}.`
      : `${capability.label} is active through a verified external workflow.`,
  };
}

export function applyVerifiedCapabilityActivations(
  draft: PublishableDraft,
  bindings: VerifiedBackendBinding[],
): CapabilityActivationResult {
  if (draft.readiness !== "ready") {
    throw new Error("Backend capabilities cannot be activated on a blocked publishable draft.");
  }

  const byCapability = new Map<string, VerifiedBackendBinding>();
  for (const binding of bindings) {
    assertBinding(binding);
    if (byCapability.has(binding.capabilityId)) {
      throw new Error(`Duplicate verified binding for capability ${binding.capabilityId}.`);
    }
    byCapability.set(binding.capabilityId, binding);
  }

  const knownCapabilities = new Set(draft.capabilities.map((capability) => capability.id));
  for (const capabilityId of byCapability.keys()) {
    if (!knownCapabilities.has(capabilityId)) {
      throw new Error(`Verified binding targets capability ${capabilityId}, which is not present in the certified draft.`);
    }
  }

  const activated: string[] = [];
  const unchanged: string[] = [];
  const capabilities = draft.capabilities.map((capability) => {
    const before = capability.state;
    const next = activateCapability(capability, byCapability.get(capability.id));
    if (before !== "active" && next.state === "active") activated.push(capability.id);
    else unchanged.push(capability.id);
    return next;
  });

  return {
    draft: {
      ...draft,
      capabilities,
    },
    activated,
    unchanged,
  };
}
