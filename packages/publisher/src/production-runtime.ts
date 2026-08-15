import type { Site } from "@micirql/schema";
import type { RendererRegistry, FunctionBindingResolver } from "@micirql/renderer";
import { createCryptoSnapshotHasher, createPublishingStore, createVersionIdFactory, type PublishingSqlDriver } from "./adapters";
import { publishSite, rollbackSite } from "./publish";
import type { DomainActivator, PublishCache, PublishedVersionRecord } from "./types";

export type PublishingQueryDriver = {
  one<T>(query: string, params: unknown[]): Promise<T | undefined>;
  many<T>(query: string, params: unknown[]): Promise<T[]>;
};

export type LiveUrlResolver = {
  forSite(site: Site): Promise<string> | string;
  forSiteId(siteId: string): Promise<string | undefined> | string | undefined;
};

export type ProductionPublishRuntime = {
  publish(args: { site: Site; createdBy: string }): Promise<ReturnType<typeof publishSite> extends Promise<infer T> ? T & { liveUrl?: string } : never>;
  rollback(args: { siteId: string; targetVersionId: string }): Promise<ReturnType<typeof rollbackSite> extends Promise<infer T> ? T & { liveUrl?: string } : never>;
};

export function createSqlPublishingDriver(db: PublishingQueryDriver): PublishingSqlDriver {
  return {
    getVersion(siteId, versionId) {
      return db.one<PublishedVersionRecord>(
        `select id as "versionId", site_id as "siteId", version_number as "versionNumber", status,
                created_at as "createdAt", created_by as "createdBy", snapshot, snapshot_hash as "snapshotHash"
           from site_versions where site_id = $1 and id = $2`,
        [siteId, versionId],
      );
    },
    getPublishedVersion(siteId) {
      return db.one<PublishedVersionRecord>(
        `select id as "versionId", site_id as "siteId", version_number as "versionNumber", status,
                created_at as "createdAt", created_by as "createdBy", snapshot, snapshot_hash as "snapshotHash"
           from site_versions where site_id = $1 and status = 'published'
           order by version_number desc limit 1`,
        [siteId],
      );
    },
    async publishVersion(args) {
      const row = await db.one<{ versionId: string; versionNumber: number; createdAt: string }>(
        `select version_id as "versionId", version_number as "versionNumber", created_at as "createdAt"
           from publish_site_version($1,$2,$3,$4,$5)`,
        [args.versionId, args.siteId, args.snapshot, args.snapshotHash, args.createdBy],
      );
      if (!row) throw new Error("Publishing transaction returned no version.");
      return {
        versionId: row.versionId,
        siteId: args.siteId,
        versionNumber: row.versionNumber,
        status: "published",
        createdAt: row.createdAt,
        createdBy: args.createdBy,
        snapshot: structuredClone(args.snapshot),
        snapshotHash: args.snapshotHash,
      };
    },
    async rollbackVersion(args) {
      const target = await db.one<PublishedVersionRecord>(
        `select id as "versionId", site_id as "siteId", version_number as "versionNumber", status,
                created_at as "createdAt", created_by as "createdBy", snapshot, snapshot_hash as "snapshotHash"
           from site_versions where site_id = $1 and id = $2`,
        [args.siteId, args.targetVersionId],
      );
      if (!target) throw new Error("Rollback target was not found.");
      const row = await db.one<{ versionId: string; versionNumber: number; createdAt: string }>(
        `select version_id as "versionId", version_number as "versionNumber", created_at as "createdAt"
           from rollback_site_version($1,$2)`,
        [args.siteId, args.targetVersionId],
      );
      if (!row) throw new Error("Rollback transaction returned no version.");
      return { ...target, status: "published", versionId: row.versionId, versionNumber: row.versionNumber, createdAt: row.createdAt };
    },
  };
}

export function createProductionPublishRuntime(args: {
  db: PublishingQueryDriver;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  domains?: DomainActivator;
  cache?: PublishCache;
  liveUrls: LiveUrlResolver;
}): ProductionPublishRuntime {
  const dependencies = {
    store: createPublishingStore(createSqlPublishingDriver(args.db)),
    registry: args.registry,
    functions: args.functions,
    hasher: createCryptoSnapshotHasher(),
    versionIds: createVersionIdFactory(),
    ...(args.domains ? { domains: args.domains } : {}),
    ...(args.cache ? { cache: args.cache } : {}),
  };

  return {
    async publish(draft) {
      const result = await publishSite(dependencies, draft);
      if (!result.ok) return result;
      return { ...result, liveUrl: await args.liveUrls.forSite(result.version.snapshot) };
    },
    async rollback(input) {
      const result = await rollbackSite(dependencies, input);
      if (!result.ok) return result;
      const liveUrl = await args.liveUrls.forSiteId(input.siteId);
      return { ...result, ...(liveUrl ? { liveUrl } : {}) };
    },
  };
}

export function defaultLiveUrl(site: Site): string {
  const primary = site.domains.find((item) => item.primary && item.status === "active" && item.sslStatus === "active")
    ?? site.domains.find((item) => item.status === "active" && item.sslStatus === "active");
  return primary ? `https://${primary.hostname}` : `https://${site.siteId}.micirql.com`;
}
