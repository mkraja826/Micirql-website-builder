import type { Site, SitePage, SiteSection } from "@micirql/schema";
import { demoAssetById } from "../../demo-assets";
import type { ExportablePublishedVersion } from "./published-version";
import { PublishApiError } from "./authorization";

const EXPORT_VERSION = "1.0.0";
const MAX_ASSET_BYTES = 12 * 1024 * 1024;
const MAX_EXPORT_ASSETS = 100;
const MAX_EXPORT_BYTES = 100 * 1024 * 1024;
const SENSITIVE_KEY =
  /^(?:secret|token|password|authorization|api[_-]?key|private[_-]?key|credential|config(?:uration)?[_-]?ref)$/i;
const SENSITIVE_QUERY_KEY =
  /^(?:token|signature|sig|key|api[_-]?key|credential|x-amz-signature)$/i;

export type ExportAssetReference = {
  id: string;
  assetId?: string;
  path: string;
  alt?: string;
  sourceUrl?: string;
  provenance: "site-schema-reference";
};

export type PortableSiteExport = {
  format: "micirql-portable-site";
  exportVersion: string;
  immutableVersion: {
    siteId: string;
    workspaceId: string;
    versionId: string;
    snapshotHash: string;
  };
  site: Site;
  manifest: {
    assets: ExportAssetReference[];
    brandProvenance: Site["generation"] extends infer T
      ? T extends { brandProvenance?: infer P }
        ? P | null
        : null
      : null;
    strippedIntegrationCount: number;
    generatedAt: string;
  };
};

export type StaticProjectFile = {
  path: string;
  bytes: Uint8Array;
};

type ResolvedAsset = ExportAssetReference & {
  localPath: string;
  bytes: Uint8Array;
  mediaType: string;
};

export function buildPortableExport(
  published: ExportablePublishedVersion,
  generatedAt = new Date().toISOString(),
): PortableSiteExport {
  const strippedIntegrationCount = published.snapshot.integrations.length;
  const site = sanitizeSnapshot(published.snapshot);
  return {
    format: "micirql-portable-site",
    exportVersion: EXPORT_VERSION,
    immutableVersion: {
      siteId: published.siteId,
      workspaceId: site.workspaceId,
      versionId: published.versionId,
      snapshotHash: published.snapshotHash,
    },
    site,
    manifest: {
      assets: collectAssetReferences(site),
      brandProvenance: site.generation?.brandProvenance ?? null,
      strippedIntegrationCount,
      generatedAt,
    },
  };
}

export async function buildStaticProject(input: {
  published: ExportablePublishedVersion;
  requestOrigin: string;
  publicFunctionsOrigin?: string;
  allowedAssetHosts?: string[];
  generatedAt?: string;
}): Promise<StaticProjectFile[]> {
  const portable = buildPortableExport(input.published, input.generatedAt);
  const actionOrigin = resolvePublicFunctionsOrigin(
    portable.site,
    input.publicFunctionsOrigin,
  );
  // Fetch from the immutable source snapshot so a short-lived signed asset URL can
  // be consumed without ever being written into either export manifest.
  const assets = await resolveAssets(
    collectAssetReferences(input.published.snapshot),
    {
      requestOrigin: input.requestOrigin,
      allowedAssetHosts: input.allowedAssetHosts ?? [],
    },
  );
  const assetMap = new Map<string, string>();
  for (const asset of assets) {
    assetMap.set(asset.id, asset.localPath);
    if (asset.assetId) assetMap.set(`asset:${asset.assetId}`, asset.localPath);
    if (asset.sourceUrl) {
      assetMap.set(`url:${asset.sourceUrl}`, asset.localPath);
      assetMap.set(`url:${redactUrl(asset.sourceUrl)}`, asset.localPath);
    }
  }

  const files: StaticProjectFile[] = [];
  for (const page of portable.site.pages) {
    files.push({
      path: htmlPathForPage(page),
      bytes: encode(
        renderStaticPage({
          site: portable.site,
          page,
          versionId: portable.immutableVersion.versionId,
          snapshotHash: portable.immutableVersion.snapshotHash,
          assetMap,
          ...(actionOrigin ? { actionOrigin } : {}),
        }),
      ),
    });
  }
  files.push(
    { path: "assets/site.css", bytes: encode(staticCss(portable.site)) },
    { path: "assets/site.js", bytes: encode(STATIC_JAVASCRIPT) },
    {
      path: "assets/manifest.json",
      bytes: encode(
        JSON.stringify(
          {
            ...portable.manifest,
            assets: assets.map(({ bytes: _bytes, ...asset }) => ({
              ...asset,
              sourceUrl: asset.sourceUrl
                ? redactUrl(asset.sourceUrl)
                : undefined,
            })),
          },
          null,
          2,
        ),
      ),
    },
    {
      path: "site.schema.json",
      bytes: encode(JSON.stringify(portable, null, 2)),
    },
    {
      path: "README.txt",
      bytes: encode(
        `MiCirql static export\nPublished version: ${portable.immutableVersion.versionId}\nSnapshot SHA-256: ${portable.immutableVersion.snapshotHash}\n`,
      ),
    },
    ...assets.map((asset) => ({ path: asset.localPath, bytes: asset.bytes })),
  );
  return files;
}

export function createStoredZip(files: StaticProjectFile[]): Uint8Array {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const paths = new Set<string>();
  const totalBytes = files.reduce(
    (total, file) => total + file.bytes.length,
    0,
  );
  if (totalBytes > MAX_EXPORT_BYTES) {
    throw new PublishApiError(
      413,
      "STATIC_EXPORT_TOO_LARGE",
      "The static export exceeds the 100 MB bundle limit.",
    );
  }
  let offset = 0;

  for (const file of files) {
    const path = safeArchivePath(file.path);
    if (paths.has(path)) {
      throw new PublishApiError(
        500,
        "DUPLICATE_EXPORT_PATH",
        `The static export contains duplicate path ${path}.`,
      );
    }
    paths.add(path);
    const name = encode(path);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length + file.bytes.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.bytes.length, true);
    localView.setUint32(22, file.bytes.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(file.bytes, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.bytes.length, true);
    centralView.setUint32(24, file.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce(
    (total, part) => total + part.length,
    0,
  );
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  return concatBytes([...localParts, ...centralParts, end]);
}

export function sanitizeSnapshot(snapshot: Site): Site {
  const clone = structuredClone(snapshot);
  clone.integrations = [];
  for (const page of clone.pages) {
    for (const section of page.sections) {
      section.props = sanitizeValue(section.props) as Record<string, unknown>;
    }
  }
  return clone;
}

export function collectAssetReferences(site: Site): ExportAssetReference[] {
  const references: ExportAssetReference[] = [];
  const seen = new Set<string>();
  const logoAssetId =
    site.theme.brand.logoAssetId ?? site.generation?.brandInput?.logoAssetId;
  if (logoAssetId) {
    const identity = `asset:${logoAssetId}`;
    references.push({
      id: identity,
      assetId: logoAssetId,
      path: "site.theme.brand.logoAssetId",
      alt: `${site.name} logo`,
      provenance: "site-schema-reference",
    });
    seen.add(identity);
  }
  walk(site, "site", references, seen);
  return references;
}

function walk(
  value: unknown,
  path: string,
  references: ExportAssetReference[],
  seen: Set<string>,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walk(item, `${path}[${index}]`, references, seen),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const assetId = text(record.assetId);
  const sourceUrl = text(record.src) ?? text(record.originalUrl);
  if (assetId || sourceUrl) {
    const identity = assetId ? `asset:${assetId}` : `url:${sourceUrl}`;
    if (!seen.has(identity)) {
      seen.add(identity);
      const alt = text(record.alt);
      references.push({
        id: identity,
        ...(assetId ? { assetId } : {}),
        path,
        ...(alt ? { alt } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        provenance: "site-schema-reference",
      });
    }
  }
  for (const [key, child] of Object.entries(record)) {
    if (
      typeof child === "string" &&
      /^(?:image|logo|src|originalUrl)$/i.test(key) &&
      looksLikeAssetUrl(child)
    ) {
      const identity = `url:${child}`;
      if (!seen.has(identity)) {
        seen.add(identity);
        references.push({
          id: identity,
          path: `${path}.${key}`,
          sourceUrl: child,
          provenance: "site-schema-reference",
        });
      }
    }
    walk(child, `${path}.${key}`, references, seen);
  }
}

async function resolveAssets(
  references: ExportAssetReference[],
  options: { requestOrigin: string; allowedAssetHosts: string[] },
): Promise<ResolvedAsset[]> {
  if (references.length > MAX_EXPORT_ASSETS) {
    throw new PublishApiError(
      413,
      "TOO_MANY_EXPORT_ASSETS",
      `Static export supports at most ${MAX_EXPORT_ASSETS} assets per published version.`,
    );
  }
  const resolved: ResolvedAsset[] = [];
  const origin = new URL(options.requestOrigin);
  const allowedHosts = new Set([
    origin.hostname.toLowerCase(),
    ...options.allowedAssetHosts
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  ]);

  for (const [index, reference] of references.entries()) {
    const demo = reference.assetId
      ? demoAssetById(reference.assetId)
      : undefined;
    const sourceUrl = reference.sourceUrl ?? demo?.originalUrl;
    if (!sourceUrl) {
      throw new PublishApiError(
        503,
        "ASSET_EXPORT_GATEWAY_NOT_CONFIGURED",
        `Asset ${reference.assetId ?? reference.id} cannot be exported until the production asset reader is configured.`,
      );
    }

    const fetched = await fetchAsset(sourceUrl, origin, allowedHosts);
    const extension = extensionFor(fetched.mediaType, sourceUrl);
    const label = `${safeFileStem(reference.assetId ?? "asset")}-${index + 1}`;
    resolved.push({
      ...reference,
      sourceUrl,
      localPath: `assets/media/${label}.${extension}`,
      bytes: fetched.bytes,
      mediaType: fetched.mediaType,
    });
  }
  return resolved;
}

async function fetchAsset(
  source: string,
  requestOrigin: URL,
  allowedHosts: Set<string>,
): Promise<{ bytes: Uint8Array; mediaType: string }> {
  if (source.startsWith("data:")) return decodeDataUrl(source);

  const url = new URL(source, requestOrigin);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && url.hostname === "localhost")
  ) {
    throw new PublishApiError(
      422,
      "UNSAFE_EXPORT_ASSET_URL",
      "Static export accepts HTTPS asset URLs only.",
    );
  }
  if (!allowedHosts.has(url.hostname.toLowerCase())) {
    throw new PublishApiError(
      503,
      "ASSET_EXPORT_HOST_NOT_AUTHORIZED",
      `Authorize ${url.hostname} in MICIRQL_ASSET_EXPORT_HOSTS before exporting this asset.`,
    );
  }
  const response = await fetch(url, { cache: "no-store", redirect: "error" });
  if (!response.ok) {
    throw new PublishApiError(
      502,
      "ASSET_EXPORT_FETCH_FAILED",
      `An export asset could not be read (${response.status}).`,
    );
  }
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_ASSET_BYTES) {
    throw new PublishApiError(
      413,
      "ASSET_EXPORT_TOO_LARGE",
      "An export asset exceeds the 12 MB file limit.",
    );
  }
  const mediaType = (
    response.headers.get("content-type") ?? "application/octet-stream"
  )
    .split(";")[0]!
    .trim();
  if (!mediaType.startsWith("image/")) {
    throw new PublishApiError(
      422,
      "INVALID_EXPORT_ASSET_TYPE",
      "Only image assets can be bundled in this export.",
    );
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > MAX_ASSET_BYTES) {
    throw new PublishApiError(
      413,
      "ASSET_EXPORT_TOO_LARGE",
      "An export asset exceeds the 12 MB file limit.",
    );
  }
  return { bytes, mediaType };
}

function decodeDataUrl(value: string): {
  bytes: Uint8Array;
  mediaType: string;
} {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/is);
  if (!match) {
    throw new PublishApiError(
      422,
      "INVALID_EXPORT_ASSET",
      "An embedded image asset is malformed.",
    );
  }
  const mediaType = match[1]!.toLowerCase();
  const payload = match[3] ?? "";
  if (payload.length > MAX_ASSET_BYTES * 1.5) {
    throw new PublishApiError(
      413,
      "ASSET_EXPORT_TOO_LARGE",
      "An export asset exceeds the 12 MB file limit.",
    );
  }
  const bytes = match[2]
    ? Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
    : encode(decodeURIComponent(payload));
  if (bytes.length > MAX_ASSET_BYTES) {
    throw new PublishApiError(
      413,
      "ASSET_EXPORT_TOO_LARGE",
      "An export asset exceeds the 12 MB file limit.",
    );
  }
  return { bytes, mediaType };
}

function resolvePublicFunctionsOrigin(
  site: Site,
  configured?: string,
): string | undefined {
  const hasBindings = site.pages.some((page) =>
    page.sections.some((section) => Object.keys(section.bindings).length > 0),
  );
  if (!hasBindings) return undefined;
  if (!configured) {
    throw new PublishApiError(
      503,
      "PUBLIC_FUNCTION_GATEWAY_NOT_CONFIGURED",
      "Set MICIRQL_PUBLIC_FUNCTIONS_ORIGIN to the registered public MiCirql form gateway before exporting a site with functional forms.",
    );
  }
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new PublishApiError(
      503,
      "PUBLIC_FUNCTION_GATEWAY_INVALID",
      "MICIRQL_PUBLIC_FUNCTIONS_ORIGIN is invalid.",
    );
  }
  if (
    url.protocol !== "https:" ||
    (url.hostname !== "micirql.com" && !url.hostname.endsWith(".micirql.com"))
  ) {
    throw new PublishApiError(
      503,
      "PUBLIC_FUNCTION_GATEWAY_INVALID",
      "MICIRQL_PUBLIC_FUNCTIONS_ORIGIN must be an HTTPS micirql.com endpoint.",
    );
  }
  return url.origin;
}

function renderStaticPage(input: {
  site: Site;
  page: SitePage;
  versionId: string;
  snapshotHash: string;
  assetMap: Map<string, string>;
  actionOrigin?: string;
}): string {
  const prefix = assetPrefix(input.page);
  const pageAssetMap = new Map(
    [...input.assetMap.entries()].map(([key, path]) => [
      key,
      `${prefix}${path}`,
    ]),
  );
  const sections = input.page.sections
    .filter((section) => !section.hidden)
    .map((section, index) =>
      renderSection(
        section,
        index,
        input.site,
        pageAssetMap,
        input.actionOrigin,
      ),
    )
    .join("\n");
  const canonical = input.page.seo.canonicalPath;
  return `<!doctype html>
<html lang="${escapeAttribute(input.site.seoBlueprint.languages[0] ?? "en")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(input.page.seo.title)}</title>
  <meta name="description" content="${escapeAttribute(input.page.seo.description)}">
  <meta name="robots" content="${input.page.seo.indexable ? "index,follow" : "noindex,nofollow"}">
  <meta name="micirql-version" content="${escapeAttribute(input.versionId)}">
  <meta name="micirql-snapshot-sha256" content="${escapeAttribute(input.snapshotHash)}">
  <link rel="canonical" href="${escapeAttribute(canonical)}">
  <link rel="stylesheet" href="${prefix}assets/site.css">
  <script src="${prefix}assets/site.js" defer></script>
</head>
<body data-mi-site="${escapeAttribute(input.site.siteId)}" data-mi-version="${escapeAttribute(input.versionId)}">
${sections}
</body>
</html>`;
}

function renderSection(
  section: SiteSection,
  index: number,
  site: Site,
  assetMap: Map<string, string>,
  actionOrigin?: string,
): string {
  const family = sectionFamily(section.component.componentId);
  const props = section.props;
  const title =
    value(props.title) ??
    value(props.heading) ??
    value(props.brand) ??
    site.name;
  const description = value(props.description) ?? value(props.body);
  const items = list(props.items);
  const image = imageFor(props.image, assetMap);
  const classes = `mi-section mi-section--${family} mi-section--variant-${sectionVariant(section.component.componentId)}`;

  if (family === "navbar") {
    const navItems = items.length
      ? items.map((item) => ({
          label: itemTitle(item),
          href: itemHref(item) ?? "/",
        }))
      : site.navigation;
    return `<header class="${classes}" id="section-${index + 1}"><div class="mi-container mi-navbar"><a class="mi-brand" href="/">${escapeHtml(title)}</a><button class="mi-menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu">Menu</button><nav id="site-menu" class="mi-nav" aria-label="Primary">${navItems.map((item) => `<a href="${safeHref(item.href)}">${escapeHtml(item.label)}</a>`).join("")}</nav>${renderAction(props.primaryAction)}</div></header>`;
  }
  if (family === "footer") {
    const links = list(props.footerLinks);
    return `<footer class="${classes}" id="section-${index + 1}"><div class="mi-container mi-footer"><div><strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div><nav aria-label="Footer">${links.map((item) => `<a href="${safeHref(itemHref(item) ?? "/")}">${escapeHtml(itemTitle(item))}</a>`).join("")}</nav></div></footer>`;
  }

  const heading = `<div class="mi-heading">${value(props.eyebrow) ? `<p class="mi-eyebrow">${escapeHtml(value(props.eyebrow)!)}</p>` : ""}<${family === "hero" ? "h1" : "h2"}>${escapeHtml(title)}</${family === "hero" ? "h1" : "h2"}>${description ? `<p>${escapeHtml(description)}</p>` : ""}${renderActions(props)}</div>`;
  const media = image
    ? `<figure class="mi-media"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(imageAlt(props.image))}"></figure>`
    : "";
  const cards = items.length
    ? `<div class="mi-grid">${items.map((item) => `<article class="mi-card">${imageFor(item.image, assetMap) ? `<img src="${escapeAttribute(imageFor(item.image, assetMap)!)}" alt="${escapeAttribute(itemTitle(item))}">` : ""}<h3>${escapeHtml(itemTitle(item))}</h3>${itemDescription(item) ? `<p>${escapeHtml(itemDescription(item)!)}</p>` : ""}</article>`).join("")}</div>`
    : "";
  const form =
    family === "contact" ? renderForm(section, site.siteId, actionOrigin) : "";
  return `<section class="${classes}" id="section-${index + 1}"><div class="mi-container">${family === "hero" ? `<div class="mi-split">${heading}${media}</div>` : `${heading}${media}${cards}${form}`}</div></section>`;
}

function renderForm(
  section: SiteSection,
  siteId: string,
  actionOrigin?: string,
): string {
  const binding = Object.values(section.bindings)[0];
  if (!binding || !actionOrigin) return "";
  const url = new URL(
    `/api/functions/${encodeURIComponent(binding.actionId)}`,
    actionOrigin,
  );
  url.searchParams.set("siteId", siteId);
  return `<form class="mi-form" method="post" action="${escapeAttribute(url.toString())}"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Message<textarea name="message" required></textarea></label><button type="submit">Send enquiry</button></form>`;
}

function renderActions(props: Record<string, unknown>): string {
  const primary = renderAction(props.primaryAction, "primary");
  const secondary = renderAction(props.secondaryAction, "secondary");
  return primary || secondary
    ? `<div class="mi-actions">${primary}${secondary}</div>`
    : "";
}

function renderAction(value: unknown, tone = "primary"): string {
  if (!value || typeof value !== "object") return "";
  const action = value as Record<string, unknown>;
  const label = text(action.label);
  const href = text(action.href);
  return label && href
    ? `<a class="mi-action mi-action--${tone}" href="${safeHref(href)}">${escapeHtml(label)}</a>`
    : "";
}

function imageFor(
  value: unknown,
  map: Map<string, string>,
): string | undefined {
  if (typeof value === "string") return map.get(`url:${value}`);
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const assetId = text(record.assetId);
  const source = text(record.src) ?? text(record.originalUrl);
  return (
    (assetId ? map.get(`asset:${assetId}`) : undefined) ??
    (source ? map.get(`url:${source}`) : undefined)
  );
}

function imageAlt(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  return text((value as Record<string, unknown>).alt) ?? "";
}

function sectionFamily(componentId: string): string {
  const normalized = componentId.toLowerCase();
  const legacy = [
    "navbar",
    "hero",
    "about",
    "services",
    "features",
    "process",
    "testimonials",
    "gallery",
    "team",
    "cta",
    "contact",
    "footer",
  ].find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const code = componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  return (
    (
      {
        NAV: "navbar",
        HERO: "hero",
        ABOUT: "about",
        SERV: "services",
        FEAT: "features",
        PROC: "process",
        TEST: "testimonials",
        GALL: "gallery",
        TEAM: "team",
        CTA: "cta",
        CONT: "contact",
        FOOT: "footer",
      } as Record<string, string>
    )[code ?? ""] ?? "content"
  );
}

function sectionVariant(componentId: string): number {
  const match = componentId.match(/-(00[1-5])$/);
  return match ? Number(match[1]) : 1;
}

function staticCss(site: Site): string {
  const colors = site.theme.brand.colors;
  return `:root{--primary:${cssColor(colors.primary, "#155e75")};--secondary:${cssColor(colors.secondary, "#0f172a")};--accent:${cssColor(colors.accent, "#14b8a6")};--bg:${cssColor(colors.background, "#ffffff")};--surface:${cssColor(colors.surface, "#f8fafc")};--text:${cssColor(colors.textPrimary, "#0f172a")};--muted:${cssColor(colors.textSecondary, "#475569")};--border:${cssColor(colors.border, "#cbd5e1")};--display:${cssFont(site.theme.brand.typography.display)};--body:${cssFont(site.theme.brand.typography.body)}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--body),system-ui,sans-serif;line-height:1.6}.mi-container{width:min(100% - 2rem,72rem);margin:auto}.mi-section{padding:clamp(3.5rem,8vw,7rem) 0}.mi-section:nth-child(even){background:var(--surface)}.mi-section--navbar{padding:0;border-bottom:1px solid var(--border);background:var(--bg);position:relative;z-index:10}.mi-navbar{min-height:4.5rem;display:flex;align-items:center;gap:1rem}.mi-brand{font:bold 1.1rem var(--display),sans-serif;color:var(--text);text-decoration:none;margin-right:auto}.mi-nav{display:flex;align-items:center;gap:1rem}.mi-nav a,.mi-footer a{color:var(--muted);min-height:44px;display:inline-flex;align-items:center}.mi-menu-toggle{display:none;min-height:44px;border:1px solid var(--border);background:var(--bg);border-radius:.7rem;padding:.5rem .9rem}.mi-heading{max-width:45rem}.mi-eyebrow{text-transform:uppercase;letter-spacing:.14em;font-weight:800;color:var(--primary)}h1,h2,h3{font-family:var(--display),sans-serif;line-height:1.05;text-wrap:balance}h1{font-size:clamp(2.5rem,8vw,5.3rem);margin:.25em 0}h2{font-size:clamp(2rem,5vw,3.4rem)}h3{font-size:1.25rem}.mi-split{display:grid;gap:2rem;align-items:center}.mi-grid{display:grid;gap:1rem;margin-top:2.5rem}.mi-card{padding:1.4rem;border:1px solid var(--border);border-radius:1rem;background:var(--bg)}.mi-card img,.mi-media img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:1rem}.mi-media{margin:2rem 0}.mi-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}.mi-action,.mi-form button{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:.75rem 1rem;border-radius:.75rem;font-weight:750;text-decoration:none}.mi-action--primary,.mi-form button{background:var(--primary);color:#fff;border:0}.mi-action--secondary{border:1px solid var(--border);color:var(--text)}.mi-form{display:grid;gap:1rem;max-width:38rem;margin-top:2rem}.mi-form label{display:grid;gap:.35rem;font-weight:650}.mi-form input,.mi-form textarea{width:100%;min-height:44px;border:1px solid var(--border);border-radius:.7rem;padding:.75rem;background:var(--bg);color:var(--text)}.mi-form textarea{min-height:8rem}.mi-footer{display:grid;gap:2rem}.mi-footer nav{display:flex;flex-wrap:wrap;gap:1rem}@media(min-width:48rem){.mi-split{grid-template-columns:1fr 1fr}.mi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.mi-footer{grid-template-columns:1fr auto}}@media(max-width:63.99rem){.mi-menu-toggle{display:inline-flex;align-items:center}.mi-nav{display:none;position:absolute;top:100%;left:1rem;right:1rem;flex-direction:column;align-items:stretch;padding:1rem;background:var(--bg);border:1px solid var(--border);border-radius:1rem;box-shadow:0 1rem 2rem rgb(15 23 42/.14)}.mi-nav[data-open="true"]{display:flex}.mi-nav a{padding:.25rem .5rem}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
}

const STATIC_JAVASCRIPT = `document.addEventListener("click",function(event){const button=event.target.closest(".mi-menu-toggle");if(!button)return;const menu=document.getElementById(button.getAttribute("aria-controls"));if(!menu)return;const open=button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));menu.dataset.open=String(open)});`;

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? redactUrl(value) : value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY.test(key))
      .map(([key, child]) => [key, sanitizeValue(child)]),
  );
}

function redactUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEY.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return value;
  }
}

function htmlPathForPage(page: SitePage): string {
  const path = page.path.replace(/^\/+|\/+$/g, "");
  return path ? `${safeArchivePath(path)}/index.html` : "index.html";
}

function assetPrefix(page: SitePage): string {
  const depth = page.path.split("/").filter(Boolean).length;
  return depth ? "../".repeat(depth) : "";
}

function safeArchivePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.split("/").some((part) => !/^[a-z0-9._~-]+$/i.test(part))
  ) {
    throw new PublishApiError(
      500,
      "INVALID_EXPORT_PATH",
      "The export contains an invalid file path.",
    );
  }
  return normalized;
}

function safeFileStem(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "asset"
  );
}

function safeHref(value: string): string {
  const href = value.trim();
  if (/^(?:https:\/\/|mailto:|tel:)/i.test(href)) return escapeAttribute(href);
  if (href.startsWith("/") && !href.startsWith("//"))
    return escapeAttribute(href);
  if (/^#[\w-]+$/.test(href)) return escapeAttribute(href);
  return "/";
}

function itemTitle(item: Record<string, unknown>): string {
  return value(item.title) ?? value(item.label) ?? value(item.name) ?? "Item";
}

function itemDescription(item: Record<string, unknown>): string | undefined {
  return value(item.description) ?? value(item.body);
}

function itemHref(item: Record<string, unknown>): string | undefined {
  return value(item.href) ?? value(item.url);
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function value(value: unknown): string | undefined {
  return text(value);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function looksLikeAssetUrl(value: string): boolean {
  return /^(?:data:image\/|https?:\/\/|\/)/i.test(value);
}

function cssColor(value: string, fallback: string): string {
  return /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%/-]+\)|[a-z]+)$/i.test(
    value.trim(),
  )
    ? value.trim()
    : fallback;
}

function cssFont(value: string): string {
  const cleaned = value.replace(/[^a-z0-9 ,.'"-]/gi, "").trim();
  return cleaned || "system-ui";
}

function extensionFor(mediaType: string, source: string): string {
  const byType: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  };
  if (byType[mediaType]) return byType[mediaType];
  const match = source.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() ?? "bin";
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value.replace(/[\u0000-\u001f\u007f]/g, ""));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
