import { siteVersionSchema, type SiteVersion } from "@micirql/schema";
import { preparePage } from "./prepare";
import type { FunctionBindingResolver, PreparedPage, RendererRegistry } from "./types";

export type PublishedSiteRecord = {
  siteId: string;
  workspaceId: string;
  primaryHostname: string;
  hostnames: string[];
  publishedVersionId: string;
  status: "active" | "suspended";
};

export type PublishedSiteStore = {
  resolveHostname(hostname: string): Promise<PublishedSiteRecord | undefined>;
  getPublishedVersion(versionId: string): Promise<SiteVersion | undefined>;
};

export type PublishedSnapshotCache = {
  get(key: string): Promise<SiteVersion | undefined>;
  put(key: string, value: SiteVersion, ttlSeconds: number): Promise<void>;
};

export type CustomerSiteRequest = {
  hostname: string;
  path: string;
  protocol?: "http" | "https";
};

export type CustomerSiteRuntimeResult =
  | { kind: "render"; status: 200; page: PreparedPage; cacheControl: string }
  | { kind: "redirect"; status: 301 | 308; location: string }
  | { kind: "not-found"; status: 404 }
  | { kind: "unavailable"; status: 503 };

export function createCustomerSiteRuntime(args: {
  store: PublishedSiteStore;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  cache?: PublishedSnapshotCache;
  snapshotTtlSeconds?: number;
}) {
  return {
    async handle(request: CustomerSiteRequest): Promise<CustomerSiteRuntimeResult> {
      const hostname = normalizeHostname(request.hostname);
      const site = await args.store.resolveHostname(hostname);
      if (!site) return { kind: "not-found", status: 404 };
      if (site.status !== "active") return { kind: "unavailable", status: 503 };

      const primaryHostname = normalizeHostname(site.primaryHostname);
      const path = normalizePath(request.path);
      if (hostname !== primaryHostname || request.protocol === "http") {
        return {
          kind: "redirect",
          status: 308,
          location: `https://${primaryHostname}${path}`,
        };
      }

      const cacheKey = `published:${site.siteId}:${site.publishedVersionId}`;
      let version = await args.cache?.get(cacheKey);
      if (!version) {
        version = await args.store.getPublishedVersion(site.publishedVersionId);
        if (!version) return { kind: "unavailable", status: 503 };
        const parsed = siteVersionSchema.safeParse(version);
        if (!parsed.success || parsed.data.status !== "published" || parsed.data.siteId !== site.siteId) {
          return { kind: "unavailable", status: 503 };
        }
        version = parsed.data;
        await args.cache?.put(cacheKey, version, args.snapshotTtlSeconds ?? 300);
      }

      const origin = `https://${primaryHostname}`;
      const prepared = await preparePage({
        site: version.snapshot,
        path,
        origin,
        registry: args.registry,
        functions: args.functions,
        mode: "production",
      });

      if (!prepared.ok) {
        if (prepared.issues.every((issue) => issue.code === "PAGE_NOT_FOUND")) {
          return { kind: "not-found", status: 404 };
        }
        return { kind: "unavailable", status: 503 };
      }

      return {
        kind: "render",
        status: 200,
        page: prepared.value,
        cacheControl: "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      };
    },
  };
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/:\d+$/, "").replace(/^www\./, "").replace(/\/$/, "");
}

function normalizePath(value: string): string {
  const clean = value.split("?")[0]?.split("#")[0] ?? "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/";
}
