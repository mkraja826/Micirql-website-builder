import type { Site } from "@micirql/schema";
import type { LiveSiteStore, PublishedSiteRecord } from "./index";

export type LiveQueryDriver = {
  one<T>(query: string, params: unknown[]): Promise<T | undefined>;
};

export function createSqlLiveSiteStore(db: LiveQueryDriver): LiveSiteStore {
  return {
    async resolveHostname(hostname) {
      const direct = await db.one<{ siteId: string }>(
        `select site_id as "siteId" from site_hostnames
          where lower(hostname) = lower($1)
            and status = 'active' and ssl_status = 'active'
          limit 1`,
        [hostname],
      );
      if (direct) return direct;

      const subdomain = hostname.endsWith(".micirql.com") ? hostname.slice(0, -".micirql.com".length) : undefined;
      if (!subdomain) return undefined;
      return db.one<{ siteId: string }>(
        `select id as "siteId" from sites where id::text = $1 and status = 'active' limit 1`,
        [subdomain],
      );
    },

    async getPublishedSite(siteId) {
      const row = await db.one<{ siteId: string; versionId: string; snapshot: Site }>(
        `select s.id::text as "siteId", v.id as "versionId", v.snapshot
           from sites s
           join site_versions v on v.id = s.published_version_id
          where s.id::text = $1 and s.status = 'active' and v.status = 'published'
          limit 1`,
        [siteId],
      );
      return row ? ({ siteId: row.siteId, versionId: row.versionId, snapshot: row.snapshot } satisfies PublishedSiteRecord) : undefined;
    },
  };
}
