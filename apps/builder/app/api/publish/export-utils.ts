import type { Site, SitePage, SiteSection } from "@micirql/schema";
import type { AssetRecord } from "@micirql/assets";
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
  source?: AssetRecord["source"];
  license?: AssetRecord["license"];
  sourceReference?: string;
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
    const registered = demoAssetById(logoAssetId);
    references.push({
      id: identity,
      assetId: logoAssetId,
      path: "site.theme.brand.logoAssetId",
      alt: `${site.name} logo`,
      ...(registered ? registeredProvenance(registered) : {}),
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
      const registered = assetId ? demoAssetById(assetId) : undefined;
      references.push({
        id: identity,
        ...(assetId ? { assetId } : {}),
        path,
        ...(alt ? { alt } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(registered ? registeredProvenance(registered) : {}),
        provenance: "site-schema-reference",
      });
      if (sourceUrl) seen.add(`url:${sourceUrl}`);
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

function registeredProvenance(asset: AssetRecord) {
  return {
    source: asset.source,
    license: asset.license,
    ...(asset.sourceReference
      ? { sourceReference: asset.sourceReference }
      : {}),
  };
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

    const assetAllowedHosts = new Set(allowedHosts);
    if (demo?.originalUrl === sourceUrl) {
      assetAllowedHosts.add(new URL(sourceUrl, origin).hostname.toLowerCase());
    }
    const fetched = await fetchAsset(sourceUrl, origin, assetAllowedHosts);
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
<body data-mi-site="${escapeAttribute(input.site.siteId)}" data-mi-version="${escapeAttribute(input.versionId)}" data-mi-theme="${escapeAttribute(input.site.theme.family)}" data-mi-density="${escapeAttribute(input.site.theme.brand.density)}" data-mi-shape="${escapeAttribute(input.site.theme.brand.shape)}" data-mi-motion="${escapeAttribute(input.site.theme.brand.motion)}">
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
  const variant = sectionVariant(section.component.componentId);
  const theme = site.theme.family;
  const classes = `mi-section mi-section--${family} mi-section--variant-${variant} mi-section-theme mi-section-theme--${theme} mi-section-variant--${variant}`;
  const identityAttributes = `data-section-family="${family}" data-section-theme="${theme}" data-section-variant="${variant}"`;

  if (family === "navbar") {
    const navItems = items.length
      ? items.map((item) => ({
          label: itemTitle(item),
          href: itemHref(item) ?? "/",
        }))
      : site.navigation;
    return `<header class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-navbar"><a class="mi-brand" href="/">${escapeHtml(title)}</a><button class="mi-menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu">Menu</button><nav id="site-menu" class="mi-nav" aria-label="Primary">${navItems.map((item) => `<a href="${safeHref(item.href)}">${escapeHtml(item.label)}</a>`).join("")}</nav>${renderAction(props.primaryAction)}</div></header>`;
  }
  if (family === "footer") {
    const links = list(props.footerLinks);
    return `<footer class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-footer mi-section__composition"><div><strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div><nav aria-label="Footer">${links.map((item) => `<a href="${safeHref(itemHref(item) ?? "/")}">${escapeHtml(itemTitle(item))}</a>`).join("")}</nav></div></footer>`;
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
  return `<section class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-section__composition${family === "hero" ? " mi-split" : ""}">${heading}${media}${cards}${form}</div></section>`;
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
  const tokens = staticThemeTokens(site);
  return `:root{
  --mi-color-primary:${cssColor(colors.primary, "#155e75")};
  --mi-color-primary-contrast:${contrastForCss(colors.primary)};
  --mi-color-secondary:${cssColor(colors.secondary, "#0f172a")};
  --mi-color-secondary-contrast:${contrastForCss(colors.secondary)};
  --mi-color-accent:${cssColor(colors.accent, "#14b8a6")};
  --mi-color-surface:${cssColor(colors.background, "#ffffff")};
  --mi-color-surface-elevated:${cssColor(colors.surface, "#f8fafc")};
  --mi-color-text:${cssColor(colors.textPrimary, "#0f172a")};
  --mi-color-text-muted:${cssColor(colors.textSecondary, "#475569")};
  --mi-color-border:${cssColor(colors.border, "#cbd5e1")};
  --mi-color-success:${cssColor(colors.success, "#15803d")};
  --mi-color-warning:${cssColor(colors.warning, "#a16207")};
  --mi-color-danger:${cssColor(colors.error, "#b91c1c")};
  --mi-font-display:${cssFont(site.theme.brand.typography.display)};
  --mi-font-body:${cssFont(site.theme.brand.typography.body)};
  --mi-font-ui:${cssFont(site.theme.brand.typography.ui)};
  --mi-radius-control:${tokens.radiusControl};
  --mi-radius-card:${tokens.radiusCard};
  --mi-image-radius:${tokens.imageRadius};
  --mi-shadow-control:${tokens.shadowControl};
  --mi-shadow-card:${tokens.shadowCard};
  --mi-border-width:${tokens.borderWidth};
  --mi-section-space:${tokens.sectionSpace};
  --mi-control-weight:${tokens.controlWeight};
  --mi-display-tracking:${tokens.displayTracking};
  --mi-body-leading:${tokens.bodyLeading};
  --mi-motion-fast:${tokens.motionFast};
  --mi-motion-standard:${tokens.motionStandard};
  --mi-motion-distance:${tokens.motionDistance};
  --mi-backdrop-blur:${tokens.blur};
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;overflow-x:hidden;background:var(--mi-color-surface);color:var(--mi-color-text);font-family:var(--mi-font-body),system-ui,sans-serif;font-size:1rem;line-height:var(--mi-body-leading)}
a{color:inherit}
img{max-width:100%}
.mi-container{width:min(100% - 2rem,72rem);margin-inline:auto}
.mi-section{position:relative;isolation:isolate;padding:var(--mi-section-space) 0;overflow:clip}
.mi-section:nth-child(even):not(.mi-section--navbar){background:var(--mi-color-surface-elevated)}
.mi-section--navbar{padding:0;border-bottom:var(--mi-border-width) solid var(--mi-color-border);background:var(--mi-color-surface);position:relative;z-index:10}
.mi-navbar{min-height:4.75rem;display:flex;align-items:center;gap:1rem}
.mi-brand{margin-right:auto;color:var(--mi-color-text);font:700 1.1rem/1.1 var(--mi-font-display),sans-serif;text-decoration:none}
.mi-nav{display:flex;align-items:center;gap:1rem}
.mi-nav a,.mi-footer a{min-width:44px;min-height:44px;display:inline-flex;align-items:center;color:var(--mi-color-text-muted);text-decoration-thickness:.08em;text-underline-offset:.25em}
.mi-menu-toggle{display:none;min-width:44px;min-height:44px;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-control);background:var(--mi-color-surface);color:var(--mi-color-text);font:var(--mi-control-weight) .9rem/1 var(--mi-font-ui),sans-serif;padding:.6rem .9rem}
.mi-section__composition{position:relative}
.mi-heading{max-width:45rem}
.mi-heading>p{max-width:65ch;color:var(--mi-color-text-muted)}
.mi-eyebrow{width:max-content;max-width:100%;margin:0;text-transform:uppercase;letter-spacing:.14em;font:800 .78rem/1.2 var(--mi-font-ui),sans-serif;color:var(--mi-color-primary)}
h1,h2,h3{max-width:100%;font-family:var(--mi-font-display),sans-serif;line-height:1.02;letter-spacing:var(--mi-display-tracking);overflow-wrap:break-word;text-wrap:balance}
h1{font-size:clamp(2.7rem,8vw,5.6rem);margin:.25em 0}
h2{font-size:clamp(2rem,5vw,3.6rem);margin:.25em 0 .45em}
h3{font-size:1.25rem;margin:.2em 0 .55em}
.mi-split{display:grid;gap:clamp(1.5rem,5vw,4rem);align-items:center}
.mi-grid{display:grid;gap:1rem;margin-top:2.5rem}
.mi-card{min-width:0;padding:1.4rem;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-card);background:var(--mi-color-surface);box-shadow:var(--mi-shadow-card)}
.mi-card p{color:var(--mi-color-text-muted)}
.mi-card img,.mi-media img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mi-image-radius)}
.mi-media{margin:2rem 0;border-radius:var(--mi-image-radius);overflow:hidden;box-shadow:var(--mi-shadow-card)}
.mi-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
.mi-action,.mi-form button{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:.75rem 1rem;border-radius:var(--mi-radius-control);font:var(--mi-control-weight) .92rem/1 var(--mi-font-ui),sans-serif;text-decoration:none;transition:transform var(--mi-motion-fast) ease,box-shadow var(--mi-motion-fast) ease,background-color var(--mi-motion-fast) ease}
.mi-action:hover,.mi-form button:hover{transform:translateY(calc(var(--mi-motion-distance) * -.18));box-shadow:var(--mi-shadow-control)}
.mi-action--primary,.mi-form button{border:0;background:var(--mi-color-primary);color:var(--mi-color-primary-contrast)}
.mi-action--secondary{border:var(--mi-border-width) solid var(--mi-color-border);color:var(--mi-color-text)}
.mi-form{display:grid;gap:1rem;max-width:38rem;margin-top:2rem}
.mi-form label{display:grid;gap:.35rem;font:650 .95rem/1.4 var(--mi-font-ui),sans-serif}
.mi-form input,.mi-form textarea{width:100%;min-height:44px;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-control);padding:.75rem;background:var(--mi-color-surface);color:var(--mi-color-text);font:inherit}
.mi-form textarea{min-height:8rem}
.mi-footer{display:grid;gap:2rem}
.mi-footer nav{display:flex;flex-wrap:wrap;gap:1rem}

/* Structural variant two changes the exported composition, not only its color. */
@media(min-width:48rem){
  .mi-split{grid-template-columns:1fr 1fr}
  .mi-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .mi-footer{grid-template-columns:1fr auto}
  .mi-section-variant--2[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,1.12fr) minmax(18rem,.88fr)}
  .mi-section-variant--2[data-section-family="hero"] .mi-media{order:-1}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-section__composition{display:grid;grid-template-columns:minmax(14rem,.72fr) minmax(0,1.28fr);column-gap:clamp(2rem,6vw,6rem);align-items:start}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-heading{grid-column:1;grid-row:1/span 2}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-grid,
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-media,
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-form{grid-column:2;grid-row:1;margin-top:0}
  .mi-section-variant--2[data-section-family="contact"] .mi-section__composition{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(18rem,.9fr);gap:clamp(2rem,6vw,6rem)}
  .mi-section-variant--2[data-section-family="contact"] .mi-heading{grid-column:2}
  .mi-section-variant--2[data-section-family="contact"] .mi-form{grid-column:1;grid-row:1;margin-top:0}
  .mi-section-variant--2[data-section-family="footer"] .mi-footer{grid-template-columns:1fr}
  .mi-section-variant--2[data-section-family="footer"] .mi-footer nav{justify-content:flex-start}
}
@media(min-width:64rem){
  .mi-section-variant--2[data-section-family="navbar"] .mi-brand{order:3;margin-left:auto;margin-right:0}
  .mi-section-variant--2[data-section-family="navbar"] .mi-nav{order:1}
  .mi-section-variant--2[data-section-family="navbar"] .mi-action{order:2}
}

/* Certified theme identities are embedded so ZIP and project exports match review and live rendering. */
.mi-section-theme--minimalist .mi-card{padding-inline:0;border:0;border-top:1px solid var(--mi-color-border);border-radius:0;background:transparent;box-shadow:none}
.mi-section-theme--minimalist .mi-grid{column-gap:clamp(1.5rem,4vw,4rem)}
.mi-section-theme--minimalist .mi-media{border-radius:0;box-shadow:none}
.mi-section-theme--minimalist .mi-action--secondary{border-color:transparent;text-decoration:underline;text-underline-offset:.35em}
.mi-section-theme--corporate[data-section-family="hero"]{background:linear-gradient(90deg,color-mix(in srgb,var(--mi-color-primary) 9%,transparent),transparent 62%),var(--mi-color-surface)}
.mi-section-theme--corporate .mi-heading{padding-left:1.5rem;border-left:4px solid var(--mi-color-primary)}
.mi-section-theme--corporate .mi-card{border-top:4px solid var(--mi-color-primary);border-radius:calc(var(--mi-radius-card) * .65);box-shadow:none}
.mi-section-theme--luxury h1,.mi-section-theme--luxury h2{font-weight:420;line-height:.98;letter-spacing:-.045em}
.mi-section-theme--luxury .mi-card{padding-inline:0;border:0;border-top:1px solid color-mix(in srgb,var(--mi-color-accent) 62%,var(--mi-color-border));border-radius:0;background:transparent;box-shadow:none}
.mi-section-theme--luxury[data-section-family="hero"] .mi-media{min-height:clamp(28rem,62vw,44rem)}
.mi-section-theme--luxury[data-section-family="hero"] .mi-media img{height:100%;aspect-ratio:3/4}
.mi-section-theme--luxury .mi-action--primary{padding-inline:1.5rem;letter-spacing:.06em;text-transform:uppercase}
.mi-section-theme--editorial .mi-heading{max-width:50rem}
.mi-section-theme--editorial h1{font-weight:520;line-height:.94}
.mi-section-theme--editorial .mi-card{padding-inline:0;border:0;border-top:2px solid var(--mi-color-text);border-radius:0;background:transparent;box-shadow:none}
.mi-section-theme--editorial[data-section-family="hero"] .mi-section__composition{align-items:end}
.mi-section-theme--editorial[data-section-family="hero"] .mi-media{border-radius:0;box-shadow:none}
.mi-section-theme--glass{background:radial-gradient(circle at 88% 12%,color-mix(in srgb,var(--mi-color-accent) 18%,transparent),transparent 34%),radial-gradient(circle at 12% 90%,color-mix(in srgb,var(--mi-color-primary) 12%,transparent),transparent 38%),var(--mi-color-surface)}
.mi-section-theme--glass .mi-card,.mi-section-theme--glass .mi-form{border:1px solid color-mix(in srgb,var(--mi-color-border) 66%,transparent);background:color-mix(in srgb,var(--mi-color-surface-elevated) 78%,transparent);box-shadow:var(--mi-shadow-card);backdrop-filter:blur(var(--mi-backdrop-blur))}
.mi-section-theme--glass .mi-form{padding:1.5rem;border-radius:var(--mi-radius-card)}
.mi-section-theme--glass[data-section-family="hero"] .mi-media{transform:perspective(70rem) rotateY(-3deg) rotateX(1deg)}
.mi-section-theme--maximalist h1{font-size:clamp(3rem,8vw,6rem);font-weight:900;line-height:.86;letter-spacing:-.055em}
.mi-section-theme--maximalist .mi-card{border:2px solid var(--mi-color-text);background:var(--mi-color-surface-elevated);box-shadow:.55rem .55rem 0 color-mix(in srgb,var(--mi-color-accent) 76%,var(--mi-color-text))}
.mi-section-theme--maximalist .mi-action--primary{border:2px solid var(--mi-color-text);box-shadow:.3rem .3rem 0 var(--mi-color-text)}
.mi-section-theme--maximalist[data-section-family="hero"]{background:linear-gradient(135deg,color-mix(in srgb,var(--mi-color-accent) 24%,transparent) 0 30%,transparent 30%),var(--mi-color-surface)}
.mi-section-theme--organic{margin:clamp(.25rem,1vw,.75rem);border-radius:clamp(1.5rem,5vw,4rem)}
.mi-section-theme--organic .mi-card{border-color:transparent;border-radius:clamp(1.5rem,4vw,3rem)}
.mi-section-theme--organic .mi-card:nth-child(even){border-radius:3rem 1.25rem 3rem 1.25rem}
.mi-section-theme--organic[data-section-family="hero"] .mi-media{border-radius:44% 56% 38% 62%/54% 40% 60% 46%}
.mi-section-theme--organic .mi-action--primary{padding-inline:1.4rem;border-radius:999px}
.mi-section-theme--futuristic{background:linear-gradient(color-mix(in srgb,var(--mi-color-border) 32%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--mi-color-border) 32%,transparent) 1px,transparent 1px),var(--mi-color-surface);background-size:2.25rem 2.25rem}
.mi-section-theme--futuristic .mi-eyebrow{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.mi-section-theme--futuristic .mi-card{border-color:color-mix(in srgb,var(--mi-color-accent) 50%,var(--mi-color-border));background:color-mix(in srgb,var(--mi-color-surface-elevated) 92%,transparent);clip-path:polygon(0 0,calc(100% - 1.1rem) 0,100% 1.1rem,100% 100%,0 100%)}
.mi-section-theme--futuristic .mi-action--primary{box-shadow:0 0 2rem color-mix(in srgb,var(--mi-color-accent) 28%,transparent)}
.mi-section-theme--playful{background:radial-gradient(circle,color-mix(in srgb,var(--mi-color-accent) 24%,transparent) 1.5px,transparent 1.6px) 0 0/1.1rem 1.1rem,var(--mi-color-surface)}
.mi-section-theme--playful .mi-heading{padding:1.5rem;border-radius:2rem 2rem .75rem 2rem;background:var(--mi-color-surface-elevated)}
.mi-section-theme--playful .mi-card{border-width:2px;border-radius:1.5rem 1.5rem .5rem 1.5rem;box-shadow:.35rem .35rem 0 color-mix(in srgb,var(--mi-color-accent) 34%,transparent)}
.mi-section-theme--playful .mi-card:nth-child(even){margin-top:1.5rem;border-radius:.5rem 1.5rem 1.5rem 1.5rem}
.mi-section-theme--playful .mi-action--primary{border-radius:999px}
.mi-section-theme--cinematic[data-section-family="hero"]{min-height:min(52rem,92svh);padding-block:0;background:#07171c;color:#f8fbfb}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-eyebrow{color:#bfeee8}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-container{width:100%;max-width:none}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-section__composition{min-height:min(52rem,92svh);display:grid;grid-template-columns:1fr;grid-template-areas:"cinema";align-items:end}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-section__composition>*{grid-area:cinema}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-heading{z-index:2;width:min(100% - 2rem,72rem);max-width:none;margin-inline:auto;padding-block:clamp(4rem,10vw,8rem)}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-heading>*{max-width:48rem}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-heading>p{color:#d8e3e3}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media{position:relative;min-height:inherit;margin:0;border-radius:0;box-shadow:none}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgb(3 14 18/.92),rgb(3 14 18/.52) 56%,rgb(3 14 18/.18))}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media img{width:100%;height:100%;min-height:inherit;aspect-ratio:auto;border-radius:0}
.mi-section-theme--cinematic h1{font-size:clamp(3.2rem,10vw,8rem);line-height:.88;text-transform:uppercase}
.mi-section-theme--cinematic .mi-card{border:0;border-radius:0;background:transparent;box-shadow:none}

@media(min-width:48rem) and (max-width:71.99rem){h1{max-width:100%;font-size:clamp(3rem,6vw,4.25rem);overflow-wrap:break-word}.mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) h2{font-size:clamp(1.65rem,3.6vw,2.25rem)}}
@media(max-width:63.99rem){
  .mi-menu-toggle{display:inline-flex;align-items:center}
  .mi-nav{display:none;position:absolute;top:100%;left:1rem;right:1rem;flex-direction:column;align-items:stretch;padding:1rem;background:var(--mi-color-surface);border:1px solid var(--mi-color-border);border-radius:var(--mi-radius-card);box-shadow:var(--mi-shadow-card)}
  .mi-nav[data-open="true"]{display:flex}
  .mi-nav a{padding:.25rem .5rem}
}
@media(max-width:47.99rem){
  .mi-section-theme--glass[data-section-family="hero"] .mi-media{transform:none}
  .mi-section-theme--playful .mi-card:nth-child(even){margin-top:0}
  .mi-section-theme--cinematic[data-section-family="hero"],.mi-section-theme--cinematic[data-section-family="hero"] .mi-section__composition{min-height:38rem}
  .mi-section-theme--cinematic[data-section-family="hero"] .mi-heading{padding-block:3.5rem}
  .mi-section-theme--cinematic h1{font-size:clamp(2.7rem,14vw,4.8rem)}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.mi-action,.mi-form button{transition:none!important}}
`;
}

type StaticThemeTokens = {
  radiusControl: string;
  radiusCard: string;
  imageRadius: string;
  shadowControl: string;
  shadowCard: string;
  borderWidth: string;
  sectionSpace: string;
  controlWeight: string;
  displayTracking: string;
  bodyLeading: string;
  motionFast: string;
  motionStandard: string;
  motionDistance: string;
  blur: string;
};

const STATIC_THEME_TOKENS: Record<Site["theme"]["family"], StaticThemeTokens> =
  {
    minimalist: {
      radiusControl: ".5rem",
      radiusCard: ".75rem",
      imageRadius: ".75rem",
      shadowControl: "0 1px 2px rgb(0 0 0/.04)",
      shadowCard: "0 8px 24px rgb(0 0 0/.05)",
      borderWidth: "1px",
      sectionSpace: "clamp(4rem,8vw,7rem)",
      controlWeight: "600",
      displayTracking: "-.035em",
      bodyLeading: "1.65",
      motionFast: "120ms",
      motionStandard: "200ms",
      motionDistance: "10px",
      blur: "0px",
    },
    corporate: {
      radiusControl: ".375rem",
      radiusCard: ".5rem",
      imageRadius: ".5rem",
      shadowControl: "0 1px 2px rgb(15 23 42/.06)",
      shadowCard: "0 10px 30px rgb(15 23 42/.08)",
      borderWidth: "1px",
      sectionSpace: "clamp(3.5rem,7vw,6rem)",
      controlWeight: "650",
      displayTracking: "-.025em",
      bodyLeading: "1.6",
      motionFast: "120ms",
      motionStandard: "190ms",
      motionDistance: "8px",
      blur: "0px",
    },
    luxury: {
      radiusControl: ".25rem",
      radiusCard: ".375rem",
      imageRadius: ".25rem",
      shadowControl: "none",
      shadowCard: "0 18px 50px rgb(0 0 0/.08)",
      borderWidth: "1px",
      sectionSpace: "clamp(5rem,10vw,9rem)",
      controlWeight: "550",
      displayTracking: "-.02em",
      bodyLeading: "1.75",
      motionFast: "180ms",
      motionStandard: "320ms",
      motionDistance: "14px",
      blur: "0px",
    },
    editorial: {
      radiusControl: ".125rem",
      radiusCard: ".125rem",
      imageRadius: "0",
      shadowControl: "none",
      shadowCard: "none",
      borderWidth: "1px",
      sectionSpace: "clamp(4rem,9vw,8rem)",
      controlWeight: "600",
      displayTracking: "-.045em",
      bodyLeading: "1.72",
      motionFast: "140ms",
      motionStandard: "240ms",
      motionDistance: "12px",
      blur: "0px",
    },
    glass: {
      radiusControl: "1rem",
      radiusCard: "1.5rem",
      imageRadius: "1.5rem",
      shadowControl: "0 8px 28px rgb(15 23 42/.08)",
      shadowCard: "0 24px 70px rgb(15 23 42/.12)",
      borderWidth: "1px",
      sectionSpace: "clamp(4rem,8vw,7rem)",
      controlWeight: "625",
      displayTracking: "-.035em",
      bodyLeading: "1.62",
      motionFast: "150ms",
      motionStandard: "260ms",
      motionDistance: "16px",
      blur: "18px",
    },
    maximalist: {
      radiusControl: ".75rem",
      radiusCard: "1rem",
      imageRadius: "1rem",
      shadowControl: "0 4px 0 rgb(0 0 0/.18)",
      shadowCard: "0 10px 0 rgb(0 0 0/.16)",
      borderWidth: "2px",
      sectionSpace: "clamp(3.5rem,7vw,6rem)",
      controlWeight: "800",
      displayTracking: "-.055em",
      bodyLeading: "1.5",
      motionFast: "110ms",
      motionStandard: "190ms",
      motionDistance: "20px",
      blur: "0px",
    },
    organic: {
      radiusControl: "1.25rem",
      radiusCard: "2rem",
      imageRadius: "2rem",
      shadowControl: "0 4px 14px rgb(0 0 0/.04)",
      shadowCard: "0 18px 55px rgb(0 0 0/.06)",
      borderWidth: "1px",
      sectionSpace: "clamp(4rem,9vw,7.5rem)",
      controlWeight: "600",
      displayTracking: "-.025em",
      bodyLeading: "1.7",
      motionFast: "180ms",
      motionStandard: "320ms",
      motionDistance: "14px",
      blur: "0px",
    },
    futuristic: {
      radiusControl: ".625rem",
      radiusCard: ".875rem",
      imageRadius: ".875rem",
      shadowControl:
        "0 0 24px color-mix(in srgb,var(--mi-color-accent) 16%,transparent)",
      shadowCard:
        "0 0 54px color-mix(in srgb,var(--mi-color-accent) 12%,transparent)",
      borderWidth: "1px",
      sectionSpace: "clamp(4rem,8vw,7rem)",
      controlWeight: "700",
      displayTracking: "-.04em",
      bodyLeading: "1.58",
      motionFast: "120ms",
      motionStandard: "220ms",
      motionDistance: "18px",
      blur: "8px",
    },
    playful: {
      radiusControl: "1.5rem",
      radiusCard: "2rem",
      imageRadius: "2rem",
      shadowControl: "0 5px 0 rgb(0 0 0/.09)",
      shadowCard: "0 14px 0 rgb(0 0 0/.08)",
      borderWidth: "2px",
      sectionSpace: "clamp(3.5rem,8vw,6.5rem)",
      controlWeight: "750",
      displayTracking: "-.04em",
      bodyLeading: "1.58",
      motionFast: "130ms",
      motionStandard: "230ms",
      motionDistance: "18px",
      blur: "0px",
    },
    cinematic: {
      radiusControl: ".375rem",
      radiusCard: ".75rem",
      imageRadius: ".75rem",
      shadowControl: "0 8px 30px rgb(0 0 0/.14)",
      shadowCard: "0 30px 90px rgb(0 0 0/.22)",
      borderWidth: "1px",
      sectionSpace: "clamp(5rem,11vw,10rem)",
      controlWeight: "650",
      displayTracking: "-.05em",
      bodyLeading: "1.68",
      motionFast: "180ms",
      motionStandard: "360ms",
      motionDistance: "24px",
      blur: "4px",
    },
  };

function staticThemeTokens(site: Site): StaticThemeTokens {
  let tokens = { ...STATIC_THEME_TOKENS[site.theme.family] };
  for (const modifier of site.theme.modifiers) {
    if (modifier === "liquid")
      tokens = {
        ...tokens,
        radiusControl: "1.5rem",
        radiusCard: "2.5rem",
        imageRadius: "2.5rem",
        motionDistance: "18px",
      };
    if (modifier === "rounded")
      tokens = {
        ...tokens,
        radiusControl: "1rem",
        radiusCard: "1.5rem",
        imageRadius: "1.5rem",
      };
    if (modifier === "sharp")
      tokens = {
        ...tokens,
        radiusControl: ".125rem",
        radiusCard: ".125rem",
        imageRadius: "0",
      };
    if (modifier === "motion-rich")
      tokens = {
        ...tokens,
        motionFast: "150ms",
        motionStandard: "340ms",
        motionDistance: "24px",
      };
    if (modifier === "motion-subtle")
      tokens = {
        ...tokens,
        motionFast: "120ms",
        motionStandard: "200ms",
        motionDistance: "8px",
      };
    if (modifier === "3d-depth")
      tokens = {
        ...tokens,
        shadowControl: "0 10px 30px rgb(0 0 0/.1)",
        shadowCard: "0 28px 80px rgb(0 0 0/.18)",
      };
    if (modifier === "neon-glow")
      tokens = {
        ...tokens,
        shadowControl:
          "0 0 28px color-mix(in srgb,var(--mi-color-accent) 20%,transparent)",
        shadowCard:
          "0 0 64px color-mix(in srgb,var(--mi-color-accent) 18%,transparent)",
      };
  }
  if (site.theme.brand.density === "compact")
    tokens.sectionSpace = "clamp(3rem,6vw,5rem)";
  if (site.theme.brand.density === "spacious")
    tokens.sectionSpace = "clamp(5rem,10vw,9rem)";
  if (site.theme.brand.shape === "sharp")
    tokens = {
      ...tokens,
      radiusControl: ".2rem",
      radiusCard: ".35rem",
      imageRadius: ".2rem",
    };
  if (site.theme.brand.shape === "soft")
    tokens = {
      ...tokens,
      radiusControl: "1.1rem",
      radiusCard: "1.75rem",
      imageRadius: "1.75rem",
    };
  if (site.theme.brand.motion === "none")
    tokens = {
      ...tokens,
      motionFast: "0ms",
      motionStandard: "0ms",
      motionDistance: "0px",
    };
  if (site.theme.brand.motion === "subtle")
    tokens = {
      ...tokens,
      motionFast: "120ms",
      motionStandard: "200ms",
      motionDistance: "8px",
    };
  if (site.theme.brand.motion === "rich")
    tokens = {
      ...tokens,
      motionFast: "160ms",
      motionStandard: "360ms",
      motionDistance: "24px",
    };
  return tokens;
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

function contrastForCss(value: string): string {
  const hex = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 > 0.55
    ? "#111111"
    : "#ffffff";
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
