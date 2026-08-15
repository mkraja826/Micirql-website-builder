import type { FunctionResult, RateLimiter } from "./types";
import type { BackendConfigStore, SiteHostnameRecord, SiteIntegrationRecord, SiteRecord, WorkspaceRecord } from "./backend-config";
import type { IdempotencyStore } from "./gateway";
import type { RecordStore, StoredFunctionRecord } from "./record-store";
import type { NotificationDestination } from "./notifications";

export type QueryDriver = {
  one<T>(query: string, params: unknown[]): Promise<T | undefined>;
  many<T>(query: string, params: unknown[]): Promise<T[]>;
  execute<T>(query: string, params: unknown[]): Promise<T>;
};

export function createSqlBackendConfigStore(db: QueryDriver): BackendConfigStore {
  return {
    getWorkspace(id) {
      return db.one<WorkspaceRecord>("select id, name, status from workspaces where id = $1", [id]);
    },
    getSite(id) {
      return db.one<SiteRecord>("select id, workspace_id as \"workspaceId\", name, status, published_version_id as \"publishedVersionId\" from sites where id = $1", [id]);
    },
    findHostname(hostname) {
      return db.one<SiteHostnameRecord>("select id, site_id as \"siteId\", hostname, mode, status, ssl_status as \"sslStatus\", primary from site_hostnames where hostname = $1", [hostname]);
    },
    listSiteIntegrations(siteId) {
      return db.many<SiteIntegrationRecord>("select id, workspace_id as \"workspaceId\", site_id as \"siteId\", provider, capability, status, config_ref as \"configRef\" from site_integrations where site_id = $1", [siteId]);
    },
  };
}

export function createSqlRecordStore(db: QueryDriver): RecordStore {
  return {
    async create(input) {
      const row = await db.one<StoredFunctionRecord>(
        `insert into site_function_records
          (workspace_id, site_id, action_id, action_version, idempotency_key, payload, contact_name, contact_email, contact_phone, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id, workspace_id as \"workspaceId\", site_id as \"siteId\", action_id as \"actionId\",
           action_version as \"actionVersion\", idempotency_key as \"idempotencyKey\", payload,
           contact_name as \"contactName\", contact_email as \"contactEmail\", contact_phone as \"contactPhone\",
           status, created_at as \"createdAt\"`,
        [input.workspaceId, input.siteId, input.actionId, input.actionVersion, input.idempotencyKey ?? null, input.payload,
          input.contactName ?? null, input.contactEmail ?? null, input.contactPhone ?? null, input.status],
      );
      if (!row) throw new Error("Record insert returned no row.");
      return row;
    },
  };
}

export type NotificationDestinationStore = {
  listForSite(siteId: string): Promise<NotificationDestination[]>;
};

export function createSqlNotificationDestinationStore(db: QueryDriver): NotificationDestinationStore {
  return {
    listForSite(siteId) {
      return db.many<NotificationDestination>(
        `select id, site_id as \"siteId\", channel, provider, address, config_ref as \"configRef\", enabled
         from notification_destinations where site_id = $1 and enabled = true`,
        [siteId],
      );
    },
  };
}

export type KeyValueStore = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
};

export function createKeyValueIdempotencyStore(store: KeyValueStore): IdempotencyStore {
  return {
    async get(key) {
      const raw = await store.get(`idem:${key}`);
      return raw ? (JSON.parse(raw) as FunctionResult) : undefined;
    },
    put(key, result, ttlSeconds) {
      return store.set(`idem:${key}`, JSON.stringify(result), ttlSeconds);
    },
  };
}

export function createDistributedRateLimiter(store: KeyValueStore): RateLimiter {
  return {
    async consume({ key, limit, windowSeconds }) {
      const count = await store.increment(`rate:${key}`, windowSeconds);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    },
  };
}
