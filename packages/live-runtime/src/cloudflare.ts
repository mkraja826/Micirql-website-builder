import type { Site } from "@micirql/schema";

export type CloudflareCacheLike = {
  match(request: Request | string): Promise<Response | undefined>;
  put(request: Request | string, response: Response): Promise<void>;
  delete(request: Request | string): Promise<boolean>;
};

export function createCloudflareEdgeCache(cache: CloudflareCacheLike, args: { namespace?: string } = {}) {
  const namespace = args.namespace ?? "https://edge-cache.micirql.internal";
  return {
    async get(key: string) {
      return cache.match(new Request(`${namespace}/${encodeURIComponent(key)}`));
    },
    async put(key: string, response: Response, ttlSeconds: number) {
      const headers = new Headers(response.headers);
      headers.set("cache-control", `public, max-age=${ttlSeconds}`);
      await cache.put(new Request(`${namespace}/${encodeURIComponent(key)}`), new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }));
    },
  };
}

export type CloudflarePurgeClientOptions = {
  zoneId: string;
  apiToken: string;
  apiBaseUrl?: string;
};

export function createCloudflareCacheInvalidator(options: CloudflarePurgeClientOptions) {
  const apiBaseUrl = (options.apiBaseUrl ?? "https://api.cloudflare.com/client/v4").replace(/\/$/, "");
  return {
    async invalidateSite(siteId: string) {
      const response = await fetch(`${apiBaseUrl}/zones/${encodeURIComponent(options.zoneId)}/purge_cache`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.apiToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ tags: [`micirql-site:${siteId}`] }),
      });
      if (!response.ok) throw new Error(`Cloudflare cache purge failed (${response.status}).`);
    },
  };
}

export function cloudflareCacheTagHeaders(site: Site, versionId: string) {
  return {
    "cache-tag": `micirql-site:${site.siteId},micirql-version:${versionId}`,
  };
}

export function normalizeForwardedHostname(request: Request) {
  const forwarded = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwarded || request.headers.get("host") || new URL(request.url).hostname;
  return host.toLowerCase().replace(/:\d+$/, "");
}
