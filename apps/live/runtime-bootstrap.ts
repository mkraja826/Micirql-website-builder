import type { LiveSiteStore, PublishedSiteRecord } from "@micirql/live-runtime";
import {
  createEmailNotificationAdapter,
  createFunctionGateway,
  createHtmlFunctionFormHandler,
  createNotificationAdapterRegistry,
  createNotificationHook,
  createResendEmailTransport,
  nativeFunctionCatalog,
  ownerEmailRecipient,
  recordStoreAdapterMap,
  type FunctionResult,
  type IdempotencyStore,
  type NotificationDelivery,
  type NotificationDestination,
  type NotificationDirectory,
  type NotificationEvent,
  type RateLimiter,
  type RecordStore,
  type ResolvedSiteContext,
} from "@micirql/functions";
import {
  createFunctionBindingResolver,
  renderPreparedPage,
  type PreparedPage,
  type RendererRegistry,
} from "@micirql/renderer";
import { prerender } from "react-dom/static";
import { configureLiveHostRuntime } from "./live-runtime";

let configured = false;

const emptyProductionRegistry: RendererRegistry = {
  async resolve() {
    return undefined;
  },
};

export function ensureLiveRuntimeConfigured() {
  if (configured) return;

  const supabaseUrl = process.env.MICIRQL_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.MICIRQL_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) return;

  const rpc = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Live Supabase RPC ${name} failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  };

  const store: LiveSiteStore = {
    async resolveHostname(hostname) {
      const rows = await rpc<Array<{ site_id: string }>>("resolve_live_site_hostname", {
        p_hostname: hostname,
      });
      const siteId = rows[0]?.site_id;
      return siteId ? { siteId } : undefined;
    },

    async getPublishedSite(siteId) {
      const rows = await rpc<
        Array<{ site_id: string; version_id: string; snapshot: PublishedSiteRecord["snapshot"] }>
      >("get_live_published_site", { p_site_id: siteId });
      const row = rows[0];
      if (!row) return undefined;
      return {
        siteId: row.site_id,
        versionId: row.version_id,
        snapshot: row.snapshot,
      } satisfies PublishedSiteRecord;
    },
  };

  const serverKey =
    process.env.MICIRQL_SUPABASE_SECRET_KEY
    ?? process.env.MICIRQL_SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  const functionForms = serverKey
    ? buildFunctionForms({ supabaseUrl, serverKey, resolvePublishedSite: store.resolveHostname })
    : undefined;

  configureLiveHostRuntime({
    store,
    registry: emptyProductionRegistry,
    functions: createFunctionBindingResolver({ actionIds: nativeFunctionCatalog.map((item) => item.id) }),
    ...(functionForms ? { functionForms } : {}),
    async renderPage(page: PreparedPage) {
      const { prelude } = await prerender(renderPreparedPage(page));
      return streamToString(prelude);
    },
    cacheTtlSeconds: 300,
  });

  configured = true;
}

function buildFunctionForms(args: {
  supabaseUrl: string;
  serverKey: string;
  resolvePublishedSite(hostname: string): Promise<{ siteId: string } | undefined>;
}) {
  const rest = createServerRestClient(args.supabaseUrl, args.serverKey);
  const recordStore: RecordStore = {
    async create(input) {
      const rows = await rest<Array<{
        id: string;
        workspace_id: string;
        site_id: string;
        action_id: string;
        action_version: string;
        idempotency_key: string | null;
        payload: Record<string, unknown>;
        contact_name: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        status: "received" | "queued";
        created_at: string;
      }>>("site_function_records?select=id,workspace_id,site_id,action_id,action_version,idempotency_key,payload,contact_name,contact_email,contact_phone,status,created_at", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          workspace_id: input.workspaceId,
          site_id: input.siteId,
          action_id: input.actionId,
          action_version: input.actionVersion,
          idempotency_key: input.idempotencyKey ?? null,
          payload: input.payload,
          contact_name: input.contactName ?? null,
          contact_email: input.contactEmail ?? null,
          contact_phone: input.contactPhone ?? null,
          status: input.status,
        }),
      });
      const row = rows[0];
      if (!row) throw new Error("Submission insert returned no row.");
      return {
        id: row.id,
        workspaceId: row.workspace_id,
        siteId: row.site_id,
        actionId: row.action_id,
        actionVersion: row.action_version,
        payload: row.payload,
        status: row.status,
        createdAt: row.created_at,
        ...(row.idempotency_key ? { idempotencyKey: row.idempotency_key } : {}),
        ...(row.contact_name ? { contactName: row.contact_name } : {}),
        ...(row.contact_email ? { contactEmail: row.contact_email } : {}),
        ...(row.contact_phone ? { contactPhone: row.contact_phone } : {}),
      };
    },
  };

  const rateLimiter = createRestRateLimiter(rest);
  const idempotencyStore = createRestIdempotencyStore(rest);
  const notificationDirectory = createRestNotificationDirectory(rest);
  const deliverySink = createRestDeliverySink(rest);
  const resendApiKey = process.env.RESEND_API_KEY ?? process.env.MICIRQL_RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM ?? process.env.MICIRQL_RESEND_FROM;
  const emailAdapter = resendApiKey && resendFrom
    ? createEmailNotificationAdapter({
        provider: "resend",
        transport: createResendEmailTransport({
          config: {
            async resolve() {
              return { apiKey: resendApiKey, from: resendFrom };
            },
          },
        }),
        async resolveRecipients(destination) {
          return ownerEmailRecipient(destination);
        },
      })
    : undefined;

  const notificationHook = createNotificationHook({
    directory: notificationDirectory,
    adapters: createNotificationAdapterRegistry(emailAdapter ? [emailAdapter] : []),
    deliverySink,
  });

  const gateway = createFunctionGateway({
    runtime: {
      definitions: nativeFunctionCatalog,
      adapters: recordStoreAdapterMap(recordStore),
      rateLimiter,
    },
    siteResolver: {
      async resolve(hostname) {
        const published = await args.resolvePublishedSite(hostname);
        if (!published) return undefined;
        const siteRows = await rest<Array<{ id: string; workspace_id: string; status: string }>>(
          `sites?id=eq.${encodeURIComponent(published.siteId)}&select=id,workspace_id,status&limit=1`,
        );
        const row = siteRows[0];
        if (!row || row.status !== "active") return undefined;
        return {
          siteId: row.id,
          workspaceId: row.workspace_id,
          hostname: normalizeHostname(hostname),
          status: "active",
        } satisfies ResolvedSiteContext;
      },
    },
    botCheck: {
      async verify() {
        return { allowed: true };
      },
    },
    idempotencyStore,
    notificationHooks: [notificationHook],
  });

  return createHtmlFunctionFormHandler({ gateway, ipHasher: hashIp });
}

function createRestRateLimiter(
  rest: <T>(path: string, init?: RequestInit) => Promise<T>,
): RateLimiter {
  return {
    async consume({ key, limit, windowSeconds }) {
      const rows = await rest<Array<{ allowed: boolean; remaining: number }>>("rpc/consume_site_function_rate_limit", {
        method: "POST",
        body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
      });
      return rows[0] ?? { allowed: false, remaining: 0 };
    },
  };
}

function createRestIdempotencyStore(
  rest: <T>(path: string, init?: RequestInit) => Promise<T>,
): IdempotencyStore {
  return {
    async get(key) {
      const now = new Date().toISOString();
      const rows = await rest<Array<{ result: FunctionResult }>>(
        `site_function_idempotency?idempotency_key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(now)}&select=result&limit=1`,
      );
      return rows[0]?.result;
    },
    async put(key, result, ttlSeconds) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
      await rest(`site_function_idempotency?on_conflict=idempotency_key`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          idempotency_key: key,
          result,
          expires_at: expiresAt,
          updated_at: now.toISOString(),
        }),
      });
    },
  };
}

function createRestNotificationDirectory(
  rest: <T>(path: string, init?: RequestInit) => Promise<T>,
): NotificationDirectory {
  return {
    async destinationsFor(siteId, actionId) {
      const rows = await rest<Array<{
        id: string;
        channel: NotificationDestination["channel"];
        provider: string;
        config_ref: string;
        action_ids: string[] | null;
        enabled: boolean;
      }>>(`site_notification_destinations?site_id=eq.${encodeURIComponent(siteId)}&enabled=eq.true&select=id,channel,provider,config_ref,action_ids,enabled`);

      const destinations: NotificationDestination[] = rows
        .filter((row) => !row.action_ids?.length || row.action_ids.includes(actionId))
        .map((row) => ({
          id: row.id,
          channel: row.channel,
          provider: row.provider,
          configRef: row.config_ref,
          enabled: row.enabled,
          ...(row.action_ids?.length ? { actionIds: row.action_ids } : {}),
        }));

      const preferences = await rest<Array<{ site_id: string; email_address: string | null; email_enabled: boolean }>>(
        `site_notification_preferences?site_id=eq.${encodeURIComponent(siteId)}&email_enabled=eq.true&select=site_id,email_address,email_enabled&limit=1`,
      );
      const preference = preferences[0];
      const recipient = preference?.email_address?.trim().toLowerCase();
      if (preference?.email_enabled && recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        destinations.push({
          id: `owner-email:${siteId}`,
          channel: "email",
          provider: "resend",
          configRef: "micirql-default-email",
          enabled: true,
          recipient,
        } as NotificationDestination & { recipient: string });
      }
      return destinations;
    },
  };
}

function createRestDeliverySink(
  rest: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  return {
    async write(event: NotificationEvent, delivery: NotificationDelivery) {
      await rest("notification_delivery_log", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          workspace_id: event.workspaceId,
          site_id: event.siteId,
          destination_id: uuidOrNull(delivery.destinationId),
          event_id: event.eventId,
          action_id: event.actionId,
          request_id: event.requestId,
          channel: delivery.channel,
          provider: delivery.provider,
          provider_message_id: delivery.providerMessageId ?? null,
          status: delivery.status,
          occurred_at: event.occurredAt,
        }),
      });
    },
  };
}

function createServerRestClient(baseUrl: string, serverKey: string) {
  const base = `${baseUrl.replace(/\/+$/, "")}/rest/v1`;
  return async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("apikey", serverKey);
    headers.set("authorization", `Bearer ${serverKey}`);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    const response = await fetch(`${base}/${path.replace(/^\/+/, "")}`, { ...init, headers, cache: "no-store" });
    if (!response.ok) throw new Error(`Live Supabase REST request failed (${response.status}).`);
    if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  };
}

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(ip.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
}

function uuidOrNull(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }

  output += decoder.decode();
  return output;
}
