import { preparePage, type FunctionBindingResolver, type PreparedPage, type RendererRegistry } from "@micirql/renderer";
import { siteSchema, type Site } from "@micirql/schema";

export type PublishedSiteRecord = {
  siteId: string;
  versionId: string;
  snapshot: Site;
};

export type LiveSiteStore = {
  resolveHostname(hostname: string): Promise<{ siteId: string } | undefined>;
  getPublishedSite(siteId: string): Promise<PublishedSiteRecord | undefined>;
};

export type LiveRuntimeDependencies = {
  store: LiveSiteStore;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  functionForms?: {
    handle(request: Request, actionId: string): Promise<Response>;
  };
  renderPage: (page: PreparedPage) => Promise<string> | string;
  cache?: {
    get(key: string): Promise<Response | undefined>;
    put(key: string, response: Response, ttlSeconds: number): Promise<void>;
  };
  cacheTtlSeconds?: number;
};

export async function handleLiveRequest(request: Request, dependencies: LiveRuntimeDependencies): Promise<Response> {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hostname = normalizeHostname(forwardedHost ?? request.headers.get("host") ?? url.hostname);
  if (!hostname) return textResponse("Invalid hostname", 400);

  const formActionId = functionActionFromPath(url.pathname);
  if (formActionId) {
    if (request.method.toUpperCase() !== "POST") return textResponse("Method not allowed", 405, { allow: "POST", "cache-control": "no-store" });
    if (!dependencies.functionForms) return textResponse("Website action endpoint is unavailable", 503, { "cache-control": "no-store" });
    return dependencies.functionForms.handle(request, formActionId);
  }

  const resolved = await dependencies.store.resolveHostname(hostname);
  if (!resolved) return htmlResponse(notFoundDocument("Website not found"), 404, { "x-robots-tag": "noindex" });

  const published = await dependencies.store.getPublishedSite(resolved.siteId);
  if (!published) return htmlResponse(notFoundDocument("Website not published"), 404, { "x-robots-tag": "noindex" });

  const parsed = siteSchema.safeParse(published.snapshot);
  if (!parsed.success) return htmlResponse(errorDocument("Published site is invalid"), 500, { "cache-control": "no-store" });
  const site = parsed.data;
  const origin = canonicalOrigin(site, hostname);

  if (url.pathname === "/robots.txt") return robotsResponse(site, origin);
  if (url.pathname === "/sitemap.xml") return sitemapResponse(site, origin);

  const path = normalizePath(url.pathname);
  const cacheKey = `${hostname}:${published.versionId}:${path}`;
  const cached = await dependencies.cache?.get(cacheKey);
  if (cached) return cached;

  const prepared = await preparePage({ site, path, origin, registry: dependencies.registry, functions: dependencies.functions, mode: "production" });
  if (!prepared.ok) {
    const is404 = prepared.issues.some((issue) => issue.code === "PAGE_NOT_FOUND");
    return htmlResponse(is404 ? notFoundDocument("Page not found") : errorDocument("Unable to render page"), is404 ? 404 : 500, {
      "x-robots-tag": "noindex",
      "cache-control": is404 ? "public, max-age=60" : "no-store",
    });
  }

  const content = await dependencies.renderPage(prepared.value);
  const document = pageDocument(prepared.value.seo, content);
  const response = htmlResponse(document, 200, {
    "cache-control": `public, max-age=0, s-maxage=${dependencies.cacheTtlSeconds ?? 300}, stale-while-revalidate=86400`,
    "cache-tag": `micirql-site:${site.siteId},micirql-version:${published.versionId}`,
    "x-micirql-site": site.siteId,
    "x-micirql-version": published.versionId,
  });
  await dependencies.cache?.put(cacheKey, response.clone(), dependencies.cacheTtlSeconds ?? 300);
  return response;
}

function functionActionFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/api\/functions\/([^/]+)\/?$/);
  if (!match?.[1]) return undefined;
  try {
    const decoded = decodeURIComponent(match[1]);
    return /^[a-z0-9][a-z0-9._-]{1,119}$/i.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function pageDocument(seo: { title: string; description: string; canonical: string; robots: string; structuredData: Record<string, unknown>[] }, body: string) {
  const structured = seo.structuredData.map((item) => `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(item))}</script>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(seo.title)}</title><meta name="description" content="${escapeAttr(seo.description)}"><meta name="robots" content="${escapeAttr(seo.robots)}"><link rel="canonical" href="${escapeAttr(seo.canonical)}">${structured}</head><body>${body}</body></html>`;
}

function robotsResponse(site: Site, origin: string) {
  const hasIndexable = site.pages.some((page) => page.seo.indexable);
  const body = `${hasIndexable ? "User-agent: *\nAllow: /" : "User-agent: *\nDisallow: /"}\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, s-maxage=3600" } });
}

function sitemapResponse(site: Site, origin: string) {
  const urls = site.pages.filter((page) => page.seo.indexable).map((page) => `<url><loc>${escapeXml(`${origin}${page.path}`)}</loc></url>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(body, { status: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, s-maxage=3600" } });
}

function canonicalOrigin(site: Site, requestHost: string) {
  const primary = site.domains.find((domain) => domain.primary && domain.status === "active" && domain.sslStatus === "active") ?? site.domains.find((domain) => domain.status === "active" && domain.sslStatus === "active");
  return `https://${primary?.hostname ?? requestHost}`;
}

function normalizeHostname(value: string) { return value.trim().toLowerCase().replace(/:\d+$/, "").replace(/^\.+|\.+$/g, ""); }
function normalizePath(value: string) { if (!value || value === "/") return "/"; const clean = `/${value.replace(/^\/+|\/+$/g, "")}`; return clean || "/"; }
function htmlResponse(body: string, status: number, headers: Record<string,string> = {}) { return new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } }); }
function textResponse(body: string, status: number, headers: Record<string,string> = {}) { return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...headers } }); }
function notFoundDocument(message: string) { return `<!doctype html><html><head><meta name="robots" content="noindex"><title>404</title></head><body><main><h1>404</h1><p>${escapeHtml(message)}</p></main></body></html>`; }
function errorDocument(message: string) { return `<!doctype html><html><head><meta name="robots" content="noindex"><title>Site unavailable</title></head><body><main><h1>Site unavailable</h1><p>${escapeHtml(message)}</p></main></body></html>`; }
function escapeHtml(value: string) { return value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]!)); }
function escapeAttr(value: string) { return escapeHtml(value).replace(/"/g, "&quot;"); }
function escapeXml(value: string) { return escapeAttr(value).replace(/'/g, "&apos;"); }
function escapeScriptJson(value: string) { return value.replace(/</g, "\\u003c"); }

export * from "./sql-store";
export * from "./cloudflare";
