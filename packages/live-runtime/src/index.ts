import { preparePage, type FunctionBindingResolver, type PreparedPage, type RendererRegistry } from "@micirql/renderer";
import { siteSchema, type Site } from "@micirql/schema";
import { galleryLightboxRuntimeScript } from "@micirql/sections";
import { liveResponsiveCompositionRepair, type LiveResponsiveCompositionRepair } from "./responsive-composition-repair";

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
  const favicon = faviconFor(site);
  const socialImage = socialImageFor(site);
  const brandMeta = {
    siteName: site.name,
    ...(favicon ? { favicon } : {}),
    ...(socialImage ? { socialImage } : {}),
  };
  const firstScreenRepair = liveFirstScreenRepair(site, path);
  const typographyRepair = livePageTypographyRepair(site, path);
  const compositionRepair = liveResponsiveCompositionRepair(site, path);
  const document = pageDocument(prepared.value.seo, content, brandMeta, firstScreenRepair, typographyRepair, compositionRepair);
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

function faviconFor(site: Site) {
  if (site.theme.brand.faviconAssetId) return site.theme.brand.faviconAssetId;
  const presentation = site.theme.brand.logoPresentation;
  if (presentation?.shape === "square") return site.theme.brand.logoAssetId;
  return undefined;
}

function socialImageFor(site: Site) {
  if (site.theme.brand.socialImageAssetId) return site.theme.brand.socialImageAssetId;
  if (site.theme.brand.logoAssetId) return site.theme.brand.logoAssetId;
  return site.theme.brand.faviconAssetId;
}

export type LiveFirstScreenRepair = { css: string; enabled: boolean; mobile: string; tablet: string; desktop: string };

export function liveFirstScreenRepair(site: Site, path: string): LiveFirstScreenRepair {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const raw = hero?.props?.renderedFirstScreenRepairs;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { css: "", enabled: false, mobile: "", tablet: "", desktop: "" };
  const repairs = raw as Record<string, unknown>;
  const cssFor = (viewport: "mobile" | "tablet" | "desktop") => {
    const entry = repairs[viewport];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
    const css = (entry as Record<string, unknown>).css;
    return typeof css === "string" ? css.trim() : "";
  };
  const mobile = cssFor("mobile");
  const tablet = cssFor("tablet");
  const desktop = cssFor("desktop");
  const blocks = [
    mobile ? `@media (max-width:430px){${mobile}}` : "",
    tablet ? `@media (min-width:431px) and (max-width:1024px){${tablet}}` : "",
    desktop ? `@media (min-width:1025px){${desktop}}` : "",
  ].filter(Boolean);
  return { css: blocks.join("\n"), enabled: blocks.length > 0, mobile, tablet, desktop };
}

export type LivePageTypographyRepair = { css: string; enabled: boolean };

export function livePageTypographyRepair(site: Site, path: string): LivePageTypographyRepair {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const hero = page?.sections.find((section) => /-HERO-|^HERO\./i.test(section.component.componentId));
  const raw = hero?.props?.pageTypographyRepair;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { css: "", enabled: false };
  const css = (raw as Record<string, unknown>).css;
  const normalized = typeof css === "string" ? css.trim() : "";
  return { css: normalized, enabled: Boolean(normalized) };
}

function pageDocument(
  seo: { title: string; description: string; canonical: string; robots: string; structuredData: Record<string, unknown>[] },
  body: string,
  brand: { favicon?: string; socialImage?: string; siteName: string },
  firstScreenRepair: LiveFirstScreenRepair = { css: "", enabled: false, mobile: "", tablet: "", desktop: "" },
  typographyRepair: LivePageTypographyRepair = { css: "", enabled: false },
  compositionRepair: LiveResponsiveCompositionRepair = { css: "", enabled: false, mobile: "", tablet: "", desktop: "" },
) {
  const structured = seo.structuredData.map((item) => `<script type="application/ld+json">${escapeScriptJson(JSON.stringify(item))}</script>`).join("");
  const icon = brand.favicon ? `<link rel="icon" href="${escapeAttr(brand.favicon)}"><link rel="apple-touch-icon" href="${escapeAttr(brand.favicon)}">` : "";
  const socialImage = brand.socialImage ? `<meta property="og:image" content="${escapeAttr(brand.socialImage)}"><meta property="og:image:alt" content="${escapeAttr(`${brand.siteName} preview`)}"><meta name="twitter:image" content="${escapeAttr(brand.socialImage)}">` : "";
  const social = `<meta property="og:type" content="website"><meta property="og:site_name" content="${escapeAttr(brand.siteName)}"><meta property="og:title" content="${escapeAttr(seo.title)}"><meta property="og:description" content="${escapeAttr(seo.description)}"><meta property="og:url" content="${escapeAttr(seo.canonical)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeAttr(seo.title)}"><meta name="twitter:description" content="${escapeAttr(seo.description)}">${socialImage}`;
  const repairStyle = firstScreenRepair.enabled ? `<style data-mi-persisted-first-screen-repair>${firstScreenRepair.css}</style>` : "";
  const typographyStyle = typographyRepair.enabled ? `<style data-mi-persisted-page-typography-repair>${typographyRepair.css}</style>` : "";
  const compositionStyle = compositionRepair.enabled ? `<style data-mi-persisted-responsive-composition-repair>${compositionRepair.css}</style>` : "";
  const repairAttribute = firstScreenRepair.enabled ? ' data-mi-first-screen-repair="1"' : "";
  const typographyAttribute = typographyRepair.enabled ? ' data-mi-page-typography-repair="1"' : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(seo.title)}</title><meta name="description" content="${escapeAttr(seo.description)}"><meta name="robots" content="${escapeAttr(seo.robots)}"><link rel="canonical" href="${escapeAttr(seo.canonical)}">${icon}${social}${structured}${repairStyle}${typographyStyle}${compositionStyle}</head><body${repairAttribute}${typographyAttribute}>${body}${formFeedbackScript()}${galleryLightboxRuntimeScript()}</body></html>`;
}

function formFeedbackScript() {
  return `<script>(function(){try{var p=new URLSearchParams(location.search),ok=p.get('form'),err=p.get('formError'),el=document.querySelector('[data-mi-form-status]');if(!el||(!ok&&!err))return;var messages={received:'Request received. We will get back to you shortly.','check-details':'Please check the details and try again.','rate-limited':'Too many attempts. Please wait a little and try again.',unavailable:'This request form is temporarily unavailable. Please use another contact method.','try-again':'Something went wrong. Please try again.',verification:'We could not verify this request. Please try again.'};el.textContent=ok?messages.received:(messages[err]||messages['try-again']);el.setAttribute('data-state',ok?'success':'error');}catch(e){}})();</script>`;
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
export * from "./responsive-composition-repair";
