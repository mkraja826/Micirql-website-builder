import type { FunctionResult, RateLimiter } from "./types";
import type { BackendConfigStore, SiteHostnameRecord, SiteIntegrationRecord, SiteRecord, WorkspaceRecord } from "./backend-config";
import type { IdempotencyStore } from "./gateway";
import type { RecordStore, StoredFunctionRecord } from "./record-store";
import type { NotificationDelivery, NotificationDeliverySink, NotificationDestination, NotificationDirectory, NotificationEvent } from "./notifications";

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

export type SiteFunctionRecordListItem = StoredFunctionRecord & { updatedAt?: string };

export function createSqlRecordInbox(db: QueryDriver) {
  return {
    listForSite(siteId: string, options: { limit?: number; actionId?: string; status?: string } = {}) {
      const limit = Math.max(1, Math.min(options.limit ?? 50, 200));
      return db.many<SiteFunctionRecordListItem>(
        `select id, workspace_id as \"workspaceId\", site_id as \"siteId\", action_id as \"actionId\",
          action_version as \"actionVersion\", idempotency_key as \"idempotencyKey\", payload,
          contact_name as \"contactName\", contact_email as \"contactEmail\", contact_phone as \"contactPhone\",
          status, created_at as \"createdAt\", updated_at as \"updatedAt\"
         from site_function_records
         where site_id = $1
           and ($2::text is null or action_id = $2)
           and ($3::text is null or status = $3)
         order by created_at desc
         limit $4`,
        [siteId, options.actionId ?? null, options.status ?? null, limit],
      );
    },
    getForSite(siteId: string, recordId: string) {
      return db.one<SiteFunctionRecordListItem>(
        `select id, workspace_id as \"workspaceId\", site_id as \"siteId\", action_id as \"actionId\",
          action_version as \"actionVersion\", idempotency_key as \"idempotencyKey\", payload,
          contact_name as \"contactName\", contact_email as \"contactEmail\", contact_phone as \"contactPhone\",
          status, created_at as \"createdAt\", updated_at as \"updatedAt\"
         from site_function_records where site_id = $1 and id = $2`,
        [siteId, recordId],
      );
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
        `select id, channel, provider, config_ref as \"configRef\", action_ids as \"actionIds\", enabled
         from site_notification_destinations where site_id::text = $1 and enabled = true`,
        [siteId],
      );
    },
  };
}

export function createSqlNotificationDirectory(db: QueryDriver): NotificationDirectory {
  const store = createSqlNotificationDestinationStore(db);
  return {
    async destinationsFor(siteId, actionId) {
      const destinations = await store.listForSite(siteId);
      return destinations.filter((destination) => !destination.actionIds?.length || destination.actionIds.includes(actionId));
    },
  };
}

export function createSqlNotificationDeliverySink(db: QueryDriver): NotificationDeliverySink {
  return {
    async write(event: NotificationEvent, delivery: NotificationDelivery) {
      await db.execute(
        `insert into notification_delivery_log
          (workspace_id, site_id, destination_id, event_id, action_id, request_id, channel, provider,
           provider_message_id, status, occurred_at)
         values ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [event.workspaceId, event.siteId, delivery.destinationId || null, event.eventId, event.actionId, event.requestId,
          delivery.channel, delivery.provider, delivery.providerMessageId ?? null, delivery.status, event.occurredAt],
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
