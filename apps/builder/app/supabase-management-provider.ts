import type { BackendImplementationContract } from "@micirql/schema";
import type {
  SupabaseCertificationProbeResult,
  SupabaseSchemaSnapshot,
  SupabaseStagingAdapter,
} from "./supabase-staging-executor";
import { createSupabaseRlsProbeRunner } from "./supabase-rls-probe-runner";
import { createSupabaseStorageProbeRunner, type SupabaseProjectApiKey } from "./supabase-storage-probe-runner";

export type SupabaseManagementProviderOptions = {
  accessToken: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
  readyTimeoutMs?: number;
  probeRunner?: (projectRef: string, contract: BackendImplementationContract) => Promise<SupabaseCertificationProbeResult>;
};

export type SupabasePreviewBranch = {
  id?: string;
  name: string;
  projectRef: string;
  parentProjectRef?: string;
  status?: string;
};

export function createSupabaseManagementProvider(options: SupabaseManagementProviderOptions) {
  const client = new SupabaseManagementClient(options);
  const rlsProbeRunner = createSupabaseRlsProbeRunner((projectRef, sql, readOnly) => client.runQuery(projectRef, sql, readOnly));
  const storageProbeRunner = createSupabaseStorageProbeRunner({
    getApiKeys: (projectRef) => client.getApiKeys(projectRef),
    fetchImpl: options.fetchImpl,
  });

  const defaultProbeRunner = async (projectRef: string, contract: BackendImplementationContract): Promise<SupabaseCertificationProbeResult> => {
    const rls = await rlsProbeRunner(projectRef, contract);
    const storage = await storageProbeRunner(projectRef, contract);
    return {
      positiveRlsPassed: rls.positiveRlsPassed,
      negativeRlsPassed: rls.negativeRlsPassed,
      storageOwnershipPassed: storage.storageOwnershipPassed,
      paymentIdempotencyPassed: rls.paymentIdempotencyPassed,
      errors: [...(rls.errors ?? []), ...(storage.errors ?? [])],
    };
  };

  return {
    async createPreviewBranch(parentProjectRef: string, branchName: string): Promise<SupabasePreviewBranch> {
      const created = await client.request<Record<string, unknown>>(`/v1/projects/${encodeURIComponent(parentProjectRef)}/branches`, {
        method: "POST",
        body: JSON.stringify({ branch_name: branchName, persistent: false, with_data: false }),
      });
      const projectRef = text(created.project_ref);
      if (!projectRef) throw new Error("SUPABASE_BRANCH_PROJECT_REF_MISSING");
      const branch = {
        id: optionalText(created.id),
        name: text(created.name) || branchName,
        projectRef,
        parentProjectRef: optionalText(created.parent_project_ref),
        status: optionalText(created.status),
      } satisfies SupabasePreviewBranch;
      await client.waitForBranchReady(branch.projectRef);
      return branch;
    },

    async deletePreviewBranch(branchRef: string): Promise<void> {
      await client.request(`/v1/branches/${encodeURIComponent(branchRef)}?force=true`, { method: "DELETE" });
    },

    createStagingAdapter(): SupabaseStagingAdapter {
      return {
        applyMigration: async (projectRef, sql) => {
          await client.runQuery(projectRef, sql, false);
        },
        introspectSchema: async (projectRef) => client.introspectSchema(projectRef),
        runSecurityProbes: async (projectRef, contract) => {
          return (options.probeRunner ?? defaultProbeRunner)(projectRef, contract);
        },
      };
    },
  };
}

class SupabaseManagementClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly pollIntervalMs: number;
  private readonly readyTimeoutMs: number;

  constructor(private readonly options: SupabaseManagementProviderOptions) {
    if (!options.accessToken.trim()) throw new Error("SUPABASE_MANAGEMENT_TOKEN_REQUIRED");
    this.baseUrl = (options.apiBaseUrl ?? "https://api.supabase.com").replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.pollIntervalMs = Math.max(250, options.pollIntervalMs ?? 1500);
    this.readyTimeoutMs = Math.max(5_000, options.readyTimeoutMs ?? 120_000);
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.options.accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const bodyText = await response.text();
    const body = bodyText ? safeJson(bodyText) : undefined;
    if (!response.ok) {
      const detail = typeof body === "object" && body && "message" in body ? String((body as Record<string, unknown>).message) : bodyText;
      throw new Error(`SUPABASE_MANAGEMENT_REQUEST_FAILED:${response.status}:${detail || response.statusText}`);
    }
    return body as T;
  }

  async runQuery(projectRef: string, query: string, readOnly: boolean): Promise<unknown> {
    if (!query.trim()) throw new Error("SUPABASE_QUERY_REQUIRED");
    const suffix = readOnly ? "/read-only" : "";
    return this.request(`/v1/projects/${encodeURIComponent(projectRef)}/database/query${suffix}`, {
      method: "POST",
      body: JSON.stringify(readOnly ? { query } : { query, read_only: false }),
    });
  }

  async getApiKeys(projectRef: string): Promise<SupabaseProjectApiKey[]> {
    const value = await this.request<unknown>(`/v1/projects/${encodeURIComponent(projectRef)}/api-keys?reveal=true`);
    const keyRows = Array.isArray(value) ? value.filter(isRecord) : [];
    return keyRows.map((row) => ({
      type: text(row.type) || text(row.name),
      apiKey: text(row.api_key),
    })).filter((key) => key.type && key.apiKey);
  }

  async waitForBranchReady(projectRef: string) {
    const started = Date.now();
    while (Date.now() - started < this.readyTimeoutMs) {
      const config = await this.request<Record<string, unknown>>(`/v1/branches/${encodeURIComponent(projectRef)}`);
      const status = String(config.status ?? "").toUpperCase();
      if (["ACTIVE", "ACTIVE_HEALTHY", "READY", "RUNNING"].includes(status)) return;
      if (["FAILED", "ERROR", "INACTIVE"].includes(status)) throw new Error(`SUPABASE_BRANCH_NOT_READY:${status}`);
      await sleep(this.pollIntervalMs);
    }
    throw new Error("SUPABASE_BRANCH_READY_TIMEOUT");
  }

  async introspectSchema(projectRef: string): Promise<SupabaseSchemaSnapshot> {
    const tableRows = rows(await this.runQuery(projectRef, "select tablename from pg_catalog.pg_tables where schemaname = 'public' order by tablename", true));
    const policyRows = rows(await this.runQuery(projectRef, "select tablename, policyname from pg_catalog.pg_policies where schemaname = 'public' order by tablename, policyname", true));
    const bucketRows = rows(await this.runQuery(projectRef, "select id from storage.buckets order by id", true));
    return {
      tables: tableRows.map((row) => text(row.tablename)).filter(Boolean),
      policies: policyRows.map((row) => ({ table: text(row.tablename), name: text(row.policyname) })).filter((row) => row.table && row.name),
      buckets: bucketRows.map((row) => text(row.id)).filter(Boolean),
    };
  }
}

function rows(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value)) {
    for (const key of ["result", "data", "rows"]) {
      const candidate = value[key];
      if (Array.isArray(candidate)) return candidate.filter(isRecord);
    }
  }
  return [];
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function optionalText(value: unknown) { const valueText = text(value); return valueText || undefined; }
function safeJson(value: string) { try { return JSON.parse(value) as unknown; } catch { return value; } }
function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
