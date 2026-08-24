import type { BackendImplementationContract } from "@micirql/schema";
import type { SupabaseCertificationProbeResult } from "./supabase-staging-executor";

export type SupabaseProjectApiKey = {
  type: string;
  apiKey: string;
};

export type SupabaseStorageProbeDependencies = {
  getApiKeys: (projectRef: string) => Promise<SupabaseProjectApiKey[]>;
  fetchImpl?: typeof fetch;
};

type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
};

export function createSupabaseStorageProbeRunner(deps: SupabaseStorageProbeDependencies) {
  const fetchImpl = deps.fetchImpl ?? fetch;

  return async function runSupabaseStorageProbe(
    projectRef: string,
    contract: BackendImplementationContract,
  ): Promise<Pick<SupabaseCertificationProbeResult, "storageOwnershipPassed" | "errors">> {
    const ownerScopedBuckets = contract.storageBuckets.filter((bucket) => bucket.ownerScoped);
    if (!ownerScopedBuckets.length) return { storageOwnershipPassed: true, errors: [] };

    const errors: string[] = [];
    const keys = await deps.getApiKeys(projectRef);
    const publishable = selectKey(keys, ["publishable", "anon"]);
    const secret = selectKey(keys, ["secret", "service_role"]);
    if (!publishable || !secret) {
      return {
        storageOwnershipPassed: false,
        errors: ["Storage ownership probe requires both publishable/anon and secret/service_role project API keys."],
      };
    }

    const projectUrl = `https://${projectRef}.supabase.co`;
    let userA: TestUser | undefined;
    let userB: TestUser | undefined;

    try {
      userA = await createTestUser(fetchImpl, projectUrl, publishable, secret, "a");
      userB = await createTestUser(fetchImpl, projectUrl, publishable, secret, "b");

      for (const bucket of ownerScopedBuckets) {
        const objectPath = `${userA.id}/micirql-storage-probe-${crypto.randomUUID()}.txt`;
        const payload = new TextEncoder().encode("MiCirql storage ownership certification probe");

        const upload = await storageRequest(fetchImpl, projectUrl, publishable, userA.accessToken, bucket.id, objectPath, {
          method: "POST",
          headers: { "content-type": "text/plain", "x-upsert": "false" },
          body: payload,
        });
        if (!upload.ok) {
          errors.push(`Storage probe upload failed for ${bucket.id}: ${upload.status}`);
          continue;
        }

        const ownRead = await storageRequest(fetchImpl, projectUrl, publishable, userA.accessToken, bucket.id, objectPath, { method: "GET" });
        if (!ownRead.ok) errors.push(`Owner could not read their own storage object in ${bucket.id}.`);

        const foreignRead = await storageRequest(fetchImpl, projectUrl, publishable, userB.accessToken, bucket.id, objectPath, { method: "GET" });
        if (foreignRead.ok) errors.push(`Foreign user could read another user's storage object in ${bucket.id}.`);

        const foreignDelete = await storageRequest(fetchImpl, projectUrl, publishable, userB.accessToken, bucket.id, objectPath, { method: "DELETE" });
        if (foreignDelete.ok) errors.push(`Foreign user could delete another user's storage object in ${bucket.id}.`);

        const ownDelete = await storageRequest(fetchImpl, projectUrl, publishable, userA.accessToken, bucket.id, objectPath, { method: "DELETE" });
        if (!ownDelete.ok) errors.push(`Owner could not delete their own storage object in ${bucket.id}.`);
      }
    } catch (error) {
      errors.push(`Storage ownership probe failed: ${errorMessage(error)}`);
    } finally {
      if (userA) await deleteTestUser(fetchImpl, projectUrl, secret, userA.id);
      if (userB) await deleteTestUser(fetchImpl, projectUrl, secret, userB.id);
    }

    return { storageOwnershipPassed: errors.length === 0, errors };
  };
}

async function createTestUser(
  fetchImpl: typeof fetch,
  projectUrl: string,
  publishableKey: string,
  secretKey: string,
  suffix: string,
): Promise<TestUser> {
  const email = `micirql-probe-${suffix}-${crypto.randomUUID()}@example.invalid`;
  const password = `MiCirql-${crypto.randomUUID()}-Aa1!`;
  const createResponse = await fetchImpl(`${projectUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(secretKey),
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const created = await jsonRecord(createResponse, "SUPABASE_STORAGE_PROBE_USER_CREATE_FAILED");
  const id = text(created.id);
  if (!id) throw new Error("SUPABASE_STORAGE_PROBE_USER_ID_MISSING");

  const tokenResponse = await fetchImpl(`${projectUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const token = await jsonRecord(tokenResponse, "SUPABASE_STORAGE_PROBE_LOGIN_FAILED");
  const accessToken = text(token.access_token);
  if (!accessToken) throw new Error("SUPABASE_STORAGE_PROBE_ACCESS_TOKEN_MISSING");
  return { id, email, password, accessToken };
}

async function deleteTestUser(fetchImpl: typeof fetch, projectUrl: string, secretKey: string, userId: string) {
  try {
    await fetchImpl(`${projectUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: adminHeaders(secretKey),
    });
  } catch {
    // Preview branches are disposable; cleanup errors must not mask certification evidence.
  }
}

function storageRequest(
  fetchImpl: typeof fetch,
  projectUrl: string,
  publishableKey: string,
  accessToken: string,
  bucket: string,
  path: string,
  init: RequestInit,
) {
  return fetchImpl(`${projectUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    ...init,
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}

function adminHeaders(secretKey: string) {
  return { apikey: secretKey, authorization: `Bearer ${secretKey}`, "content-type": "application/json" };
}

async function jsonRecord(response: Response, code: string): Promise<Record<string, unknown>> {
  const raw = await response.text();
  if (!response.ok) throw new Error(`${code}:${response.status}:${raw.slice(0, 300)}`);
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {
    // handled below
  }
  throw new Error(`${code}:INVALID_JSON`);
}

function selectKey(keys: SupabaseProjectApiKey[], preferredTypes: string[]) {
  for (const type of preferredTypes) {
    const match = keys.find((key) => key.type.toLowerCase() === type && key.apiKey.trim());
    if (match) return match.apiKey;
  }
  return undefined;
}
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
