import type { BackendImplementationContract, FunctionalArchitecture, Site } from "@micirql/schema";

export type FunctionalInteractionCertification = {
  requiredInteractionIds: string[];
  certifiedInteractionIds: string[];
  builderPassed: boolean;
  livePassed: boolean;
};

export type FullStackPublishCertificationReceipt = {
  siteId: string;
  draftFingerprint: string;
  previewUrl: string;
  environment: "preview" | "staging";
  passed: boolean;
  certifiedAt: string;
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  interactionCertification?: FunctionalInteractionCertification;
  observedErrors?: string[];
};

export type FullStackPublishCertificationStore = {
  find(args: { siteId: string; draftFingerprint: string }): Promise<FullStackPublishCertificationReceipt | undefined>;
};

export type FullStackPublishGateResult = {
  required: boolean;
  enforced: boolean;
  allowed: boolean;
  draftFingerprint: string;
  requiredInteractionIds: string[];
  status: "not-required" | "not-enforced" | "missing" | "failed" | "certified";
  receipt?: FullStackPublishCertificationReceipt;
};

let store: FullStackPublishCertificationStore | undefined;

export function configureFullStackPublishCertificationStore(next: FullStackPublishCertificationStore) {
  store = next;
}

export function resetFullStackPublishCertificationStore() {
  store = undefined;
}

export function getFullStackPublishCertificationStore() {
  return store;
}

export async function evaluateFullStackPublishCertification(input: {
  site: Site;
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  enforce?: boolean;
  store?: FullStackPublishCertificationStore;
}): Promise<FullStackPublishGateResult> {
  const draftFingerprint = await fingerprintPublishInput(input.site, input.architecture, input.backend);
  const requiredInteractionIds = deriveRequiredFunctionalInteractions(input.site);
  const runtimeRequired = requiresRuntimeCertification(input.architecture, input.backend);
  const required = runtimeRequired || requiredInteractionIds.length > 0;
  const enforced = input.enforce
    ?? (requiredInteractionIds.length > 0 || process.env.MICIRQL_ENFORCE_FULL_STACK_PUBLISH_CERTIFICATION === "1");
  const base = { draftFingerprint, requiredInteractionIds };
  const certificationStore = input.store ?? store;

  if (!required) return { ...base, required: false, enforced, allowed: true, status: "not-required" };
  if (!enforced) return { ...base, required: true, enforced: false, allowed: true, status: "not-enforced" };
  if (!certificationStore) return { ...base, required: true, enforced: true, allowed: false, status: "missing" };

  const receipt = await certificationStore.find({ siteId: input.site.siteId, draftFingerprint });
  if (!receipt) return { ...base, required: true, enforced: true, allowed: false, status: "missing" };
  if (!receipt.passed) return { ...base, required: true, enforced: true, allowed: false, status: "failed", receipt };
  if (!/^https?:\/\//i.test(receipt.previewUrl)) return { ...base, required: true, enforced: true, allowed: false, status: "failed", receipt };
  if (!certifiesRequiredInteractions(receipt.interactionCertification, requiredInteractionIds)) {
    return { ...base, required: true, enforced: true, allowed: false, status: "failed", receipt };
  }

  return { ...base, required: true, enforced: true, allowed: true, status: "certified", receipt };
}

export function deriveRequiredFunctionalInteractions(site: Site): string[] {
  const required = new Set<string>();

  for (const page of site.pages) {
    for (const section of page.sections) {
      for (const binding of Object.values(section.bindings)) {
        const actionId = binding?.actionId?.trim();
        if (actionId) required.add(`action:${actionId}`);
      }

      const componentId = section.component.componentId.toLowerCase();
      if (componentId.includes("faq")) required.add("interaction:faq-accordion");
      if (componentId.includes("gallery")) required.add("interaction:gallery-lightbox");
    }
  }

  return [...required].sort();
}

export function requiresRuntimeCertification(
  architecture: FunctionalArchitecture,
  backend: BackendImplementationContract,
) {
  return architecture.backendRequired
    || architecture.requiresAuth
    || architecture.requiresPayments
    || architecture.requiresFileStorage
    || backend.tables.length > 0
    || backend.routes.some((route) => route.method !== "GET");
}

export async function fingerprintPublishInput(
  site: Site,
  architecture: FunctionalArchitecture,
  backend: BackendImplementationContract,
) {
  const canonical = stableStringify({ site, architecture, backend });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function certifiesRequiredInteractions(
  certification: FunctionalInteractionCertification | undefined,
  requiredInteractionIds: string[],
) {
  if (requiredInteractionIds.length === 0) return true;
  if (!certification?.builderPassed || !certification.livePassed) return false;
  const declaredRequired = new Set(certification.requiredInteractionIds);
  const certified = new Set(certification.certifiedInteractionIds);
  return requiredInteractionIds.every((id) => declaredRequired.has(id) && certified.has(id));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
