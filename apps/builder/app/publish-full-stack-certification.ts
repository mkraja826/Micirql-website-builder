import type { BackendImplementationContract, FunctionalArchitecture, Site } from "@micirql/schema";

export type FullStackPublishCertificationReceipt = {
  siteId: string;
  draftFingerprint: string;
  previewUrl: string;
  environment: "preview" | "staging";
  passed: boolean;
  certifiedAt: string;
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
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
  status: "not-required" | "not-enforced" | "missing" | "failed" | "certified";
  receipt?: FullStackPublishCertificationReceipt;
};

let store: FullStackPublishCertificationStore | undefined;

export function configureFullStackPublishCertificationStore(next: FullStackPublishCertificationStore) {
  store = next;
}

export function getFullStackPublishCertificationStore() {
  return store;
}

export async function evaluateFullStackPublishCertification(input: {
  site: Site;
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  enforce?: boolean;
}): Promise<FullStackPublishGateResult> {
  const draftFingerprint = await fingerprintPublishInput(input.site, input.architecture, input.backend);
  const required = requiresRuntimeCertification(input.architecture, input.backend);
  const enforced = input.enforce ?? process.env.MICIRQL_ENFORCE_FULL_STACK_PUBLISH_CERTIFICATION === "1";

  if (!required) return { required: false, enforced, allowed: true, draftFingerprint, status: "not-required" };
  if (!enforced) return { required: true, enforced: false, allowed: true, draftFingerprint, status: "not-enforced" };
  if (!store) return { required: true, enforced: true, allowed: false, draftFingerprint, status: "missing" };

  const receipt = await store.find({ siteId: input.site.siteId, draftFingerprint });
  if (!receipt) return { required: true, enforced: true, allowed: false, draftFingerprint, status: "missing" };
  if (!receipt.passed) return { required: true, enforced: true, allowed: false, draftFingerprint, status: "failed", receipt };
  if (!/^https?:\/\//i.test(receipt.previewUrl)) return { required: true, enforced: true, allowed: false, draftFingerprint, status: "failed", receipt };

  return { required: true, enforced: true, allowed: true, draftFingerprint, status: "certified", receipt };
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
