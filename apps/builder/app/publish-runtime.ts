import type { ComponentType } from "react";
import {
  createCryptoSnapshotHasher,
  createProductionPublishRuntime,
  createPublishingStore,
  createVersionIdFactory,
  defaultLiveUrl,
  publishSite,
  rollbackSite,
  type DomainActivator,
  type LiveUrlResolver,
  type PublishedVersionRecord,
  type PublishCache,
  type PublishDraft,
  type PublishResult,
  type PublishingQueryDriver,
  type PublishingSqlDriver,
} from "@micirql/publisher";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  type FunctionBindingResolver,
  type RendererRegistry,
} from "@micirql/renderer";
import { siteVersionSchema } from "@micirql/schema";
import {
  seedSectionCatalog,
  seedSectionRegistryEntries,
} from "@micirql/sections";
import { nativeFunctionCatalog } from "@micirql/functions";

export type PublishRuntime = {
  publish(
    draft: PublishDraft,
  ): Promise<PublishResult & { liveUrl?: string; previousVersionId?: string }>;
  rollback(args: {
    siteId: string;
    targetVersionId: string;
  }): Promise<PublishResult & { liveUrl?: string }>;
};

export type ProductionPublishBindings = {
  db: PublishingQueryDriver;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  domains?: DomainActivator;
  cache?: PublishCache;
  liveUrls?: LiveUrlResolver;
};

let runtime: PublishRuntime | undefined;

export function configurePublishRuntime(next: PublishRuntime) {
  runtime = next;
}

export function configureProductionPublishRuntime(
  bindings: ProductionPublishBindings,
) {
  const liveUrls = bindings.liveUrls ?? {
    forSite: defaultLiveUrl,
    async forSiteId(siteId: string) {
      const row = await bindings.db.one<{
        snapshot: Parameters<typeof defaultLiveUrl>[0];
      }>(
        `select snapshot from site_versions where site_id = $1 and status = 'published' order by version_number desc limit 1`,
        [siteId],
      );
      return row ? defaultLiveUrl(row.snapshot) : undefined;
    },
  };

  runtime = createProductionPublishRuntime({
    db: bindings.db,
    registry: bindings.registry,
    functions: bindings.functions,
    liveUrls,
    ...(bindings.domains ? { domains: bindings.domains } : {}),
    ...(bindings.cache ? { cache: bindings.cache } : {}),
  });
  return runtime;
}

export function getPublishRuntime(): PublishRuntime | undefined {
  runtime ??= createSupabaseRestPublishRuntime();
  return runtime;
}

function createSupabaseRestPublishRuntime(): PublishRuntime | undefined {
  const url = (
    process.env.MICIRQL_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/+$/, "");
  const secret =
    process.env.MICIRQL_SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return undefined;

  const hasher = createCryptoSnapshotHasher();
  const store = createPublishingStore(
    createSupabasePublishingDriver({ url, secret, hasher }),
  );
  const registry = createCertifiedPublishingRegistry();
  const functions = createFunctionBindingResolver({
    actionIds: nativeFunctionCatalog.map((definition) => definition.id),
    gatewayBasePath: "/api/functions",
  });
  const dependencies = {
    store,
    registry,
    functions,
    hasher,
    versionIds: createVersionIdFactory(),
  };

  return {
    async publish(draft) {
      const previous = await store.getPublishedVersion(draft.site.siteId);
      const result = await publishSite(dependencies, draft);
      if (!result.ok) return result;
      return {
        ...result,
        liveUrl: defaultLiveUrl(result.version.snapshot),
        ...(previous ? { previousVersionId: previous.versionId } : {}),
      };
    },
    async rollback(input) {
      const result = await rollbackSite(dependencies, input);
      if (!result.ok) return result;
      return {
        ...result,
        liveUrl: defaultLiveUrl(result.version.snapshot),
      };
    },
  };
}

function createCertifiedPublishingRegistry(): RendererRegistry {
  const entries = seedSectionRegistryEntries.filter(
    (entry) => entry.status === "production" && entry.protocol.passed,
  );
  const productionIds = new Set(
    entries.map((entry) => `${entry.id}@${entry.version}`),
  );
  const components: Record<
    string,
    ComponentType<Record<string, unknown>> | undefined
  > = Object.fromEntries(
    seedSectionCatalog
      .filter((entry) => productionIds.has(`${entry.id}@${entry.version}`))
      .map((entry) => [entry.id, PublishValidationComponent]),
  );
  return createStaticRendererRegistry({ entries, components });
}

function PublishValidationComponent() {
  return null;
}

function createSupabasePublishingDriver(input: {
  url: string;
  secret: string;
  hasher: ReturnType<typeof createCryptoSnapshotHasher>;
}): PublishingSqlDriver {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${input.url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: input.secret,
        accept: "application/json",
        "content-type": "application/json",
        ...(isLegacyJwt(input.secret)
          ? { authorization: `Bearer ${input.secret}` }
          : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const error = new Error(
        response.status === 401 || response.status === 403
          ? "The server Supabase credential is not authorized for the publishing RPC/table contract."
          : response.status === 404
            ? "The existing publishing RPC/table contract is not available to the builder runtime."
            : `Supabase publishing request failed (${response.status}).`,
      ) as Error & { status?: number; code?: string };
      error.status =
        response.status === 401 || response.status === 403
          ? response.status
          : response.status === 404
            ? 503
            : 502;
      error.code =
        response.status === 401 || response.status === 403
          ? "PUBLISH_RPC_AUTHORIZATION_REQUIRED"
          : response.status === 404
            ? "PUBLISH_RPC_NOT_CONFIGURED"
            : "PUBLISH_DATABASE_REQUEST_FAILED";
      throw error;
    }
    return (await response.json()) as T;
  };

  const getVersion = async (
    siteId: string,
    versionId?: string,
    status?: "published",
  ): Promise<PublishedVersionRecord | undefined> => {
    const query = new URLSearchParams({
      site_id: `eq.${siteId}`,
      ...(versionId ? { id: `eq.${versionId}` } : {}),
      ...(status ? { status: `eq.${status}` } : {}),
      select:
        "id,site_id,version_number,status,created_at,created_by,snapshot,snapshot_hash",
      order: "version_number.desc",
      limit: "1",
    });
    const rows = await request<RemoteVersion[]>(`site_versions?${query}`);
    const row = rows[0];
    if (!row) return undefined;
    return normalizeVersion(row, input.hasher);
  };

  return {
    getVersion: (siteId, versionId) => getVersion(siteId, versionId),
    getPublishedVersion: (siteId) => getVersion(siteId, undefined, "published"),
    async publishVersion(args) {
      const rows = await request<
        Array<{
          version_id: string;
          version_number: number;
          created_at: string;
        }>
      >("rpc/publish_site_version", {
        method: "POST",
        body: JSON.stringify({
          p_version_id: args.versionId,
          p_site_id: args.siteId,
          p_snapshot: args.snapshot,
          p_snapshot_hash: args.snapshotHash,
          p_created_by: args.createdBy,
        }),
      });
      const row = rows[0];
      if (!row) throw new Error("Publishing RPC returned no version.");
      return {
        versionId: row.version_id,
        siteId: args.siteId,
        versionNumber: Number(row.version_number),
        status: "published",
        createdAt: row.created_at,
        createdBy: args.createdBy,
        snapshot: structuredClone(args.snapshot),
        snapshotHash: args.snapshotHash,
      };
    },
    async rollbackVersion(args) {
      const target = await getVersion(args.siteId, args.targetVersionId);
      if (!target) throw new Error("Rollback target was not found.");
      const rows = await request<
        Array<{
          version_id: string;
          version_number: number;
          created_at: string;
        }>
      >("rpc/rollback_site_version", {
        method: "POST",
        body: JSON.stringify({
          p_site_id: args.siteId,
          p_target_version_id: args.targetVersionId,
        }),
      });
      const row = rows[0];
      if (!row) throw new Error("Rollback RPC returned no version.");
      return {
        ...target,
        versionId: row.version_id,
        versionNumber: Number(row.version_number),
        createdAt: row.created_at,
        status: "published",
      };
    },
  };
}

type RemoteVersion = {
  id: unknown;
  site_id: unknown;
  version_number: unknown;
  status: unknown;
  created_at: unknown;
  created_by: unknown;
  snapshot: unknown;
  snapshot_hash: unknown;
};

async function normalizeVersion(
  row: RemoteVersion,
  hasher: ReturnType<typeof createCryptoSnapshotHasher>,
): Promise<PublishedVersionRecord> {
  const parsed = siteVersionSchema.parse({
    versionId: row.id,
    siteId: row.site_id,
    versionNumber: Number(row.version_number),
    status: row.status,
    createdAt: row.created_at,
    createdBy: row.created_by,
    snapshot: row.snapshot,
  });
  const snapshotHash =
    typeof row.snapshot_hash === "string" && row.snapshot_hash
      ? row.snapshot_hash
      : await hasher.hash(parsed.snapshot);
  return { ...parsed, snapshotHash };
}

function isLegacyJwt(value: string): boolean {
  return value.split(".").length === 3;
}
