import type { Site, SitePage, SiteSection } from "@micirql/schema";
import type { AssetRecord } from "@micirql/assets";
import {
  registeredPublicFunctionsOrigin,
  selectPublicFormBinding,
  type ResolvedBrandMark,
} from "@micirql/renderer";
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
  brandMark?: ResolvedBrandMark;
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
    hydrateBrandMarkReference(
      collectAssetReferences(input.published.snapshot),
      input.published.snapshot,
      input.brandMark,
    ),
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
          ...(input.brandMark ? { brandMark: input.brandMark } : {}),
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

function hydrateBrandMarkReference(
  references: ExportAssetReference[],
  site: Site,
  brandMark: ResolvedBrandMark | undefined,
): ExportAssetReference[] {
  const logoAssetId =
    site.theme.brand.logoAssetId ?? site.generation?.brandInput?.logoAssetId;
  if (!logoAssetId || !brandMark || brandMark.assetId !== logoAssetId) {
    return references;
  }

  return references.map((reference) =>
    reference.assetId === logoAssetId
      ? {
          ...reference,
          sourceUrl: brandMark.src,
          ...(brandMark.alt ? { alt: brandMark.alt } : {}),
        }
      : reference,
  );
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
  const origin = registeredPublicFunctionsOrigin(configured);
  if (!origin) {
    throw new PublishApiError(
      503,
      "PUBLIC_FUNCTION_GATEWAY_INVALID",
      "MICIRQL_PUBLIC_FUNCTIONS_ORIGIN must be exactly https://forms.micirql.com.",
    );
  }
  return origin;
}

function renderStaticPage(input: {
  site: Site;
  page: SitePage;
  versionId: string;
  snapshotHash: string;
  assetMap: Map<string, string>;
  brandMark?: ResolvedBrandMark;
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
        input.brandMark,
        input.actionOrigin,
      ),
    )
    .join("\n");
  const canonical = input.page.seo.canonicalPath;
  const subtypeAttribute = input.site.subtype
    ? ` data-mi-subtype="${escapeAttribute(input.site.subtype)}"`
    : "";
  const candidateAttribute = input.site.generation?.selectedCandidateId
    ? ` data-mi-candidate="${escapeAttribute(input.site.generation.selectedCandidateId)}"`
    : "";
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
<body data-mi-site="${escapeAttribute(input.site.siteId)}" data-mi-version="${escapeAttribute(input.versionId)}" data-mi-theme="${escapeAttribute(input.site.theme.family)}" data-mi-domain="${escapeAttribute(input.site.domain)}"${subtypeAttribute}${candidateAttribute} data-mi-density="${escapeAttribute(input.site.theme.brand.density)}" data-mi-shape="${escapeAttribute(input.site.theme.brand.shape)}" data-mi-motion="${escapeAttribute(input.site.theme.brand.motion)}">
${sections}
</body>
</html>`;
}

function renderSection(
  section: SiteSection,
  index: number,
  site: Site,
  assetMap: Map<string, string>,
  brandMark?: ResolvedBrandMark,
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
    return `<header class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-navbar"><a class="mi-brand" href="/" aria-label="${escapeAttribute(`${site.name} home`)}">${staticBrandContents(site, title, assetMap, brandMark, true)}</a><button class="mi-menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Open primary navigation"><span>Menu</span><span class="mi-menu-icon" aria-hidden="true"></span></button><nav id="site-menu" class="mi-nav" aria-label="Primary">${navItems.map((item) => `<a href="${safeHref(item.href)}">${escapeHtml(item.label)}</a>`).join("")}</nav><button class="mi-nav-backdrop" type="button" tabindex="-1" aria-hidden="true"></button>${renderAction(props.primaryAction)}</div></header>`;
  }
  if (family === "footer") {
    const links = list(props.footerLinks);
    const copyright = value(props.copyright);
    return `<footer class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-footer mi-section__composition"><div><a class="mi-brand mi-brand--footer" href="/" aria-label="${escapeAttribute(`${site.name} home`)}">${staticBrandContents(site, title, assetMap, brandMark, false)}</a>${description ? `<p>${escapeHtml(description)}</p>` : ""}</div><nav aria-label="Footer">${links.map((item) => `<a href="${safeHref(itemHref(item) ?? "/")}">${escapeHtml(itemTitle(item))}</a>`).join("")}</nav>${copyright ? `<p class="mi-footer__copyright">${escapeHtml(copyright)}</p>` : ""}</div></footer>`;
  }

  const heading = `<div class="mi-heading">${value(props.eyebrow) ? `<p class="mi-eyebrow">${escapeHtml(value(props.eyebrow)!)}</p>` : ""}<${family === "hero" ? "h1" : "h2"}>${escapeHtml(title)}</${family === "hero" ? "h1" : "h2"}>${description ? `<p>${escapeHtml(description)}</p>` : ""}${renderActions(props)}</div>`;
  const media = image
    ? `<figure class="mi-media"><img src="${escapeAttribute(image)}" alt="${escapeAttribute(imageAlt(props.image))}"></figure>`
    : "";
  const content = items.length
    ? family === "gallery"
      ? renderGallery(items, assetMap)
      : renderCards(items, assetMap)
    : "";
  const form =
    family === "contact" ? renderForm(section, site.siteId, actionOrigin) : "";
  return `<section class="${classes}" ${identityAttributes} id="section-${index + 1}"><div class="mi-container mi-section__composition${family === "hero" ? " mi-split" : ""}">${heading}${media}${content}${form}</div></section>`;
}

function staticBrandContents(
  site: Site,
  fallbackTitle: string,
  assetMap: Map<string, string>,
  brandMark?: ResolvedBrandMark,
  eager = false,
): string {
  const logoAssetId =
    site.theme.brand.logoAssetId ?? site.generation?.brandInput?.logoAssetId;
  if (!logoAssetId) return escapeHtml(fallbackTitle);

  const source = assetMap.get(`asset:${logoAssetId}`);
  if (!source) {
    throw new PublishApiError(
      503,
      "BRAND_LOGO_UNRESOLVED",
      `Supplied logo ${logoAssetId} is unavailable to the static renderer.`,
    );
  }

  const resolved = brandMark?.assetId === logoAssetId ? brandMark : undefined;
  const alt = resolved?.alt || `${site.name} logo`;
  const dimensions = resolved
    ? ` width="${resolved.width}" height="${resolved.height}" style="aspect-ratio:${resolved.width} / ${resolved.height}"`
    : "";
  return `<img class="mi-brand__logo" src="${escapeAttribute(source)}" alt="${escapeAttribute(alt)}"${dimensions} loading="${eager ? "eager" : "lazy"}" decoding="async" data-mi-image-field="brandMark" data-mi-logo-asset-id="${escapeAttribute(logoAssetId)}">`;
}

function renderForm(
  section: SiteSection,
  siteId: string,
  actionOrigin?: string,
): string {
  const selected = selectPublicFormBinding(
    section.bindings,
    typeof section.props.formBindingKey === "string"
      ? section.props.formBindingKey
      : undefined,
  );
  if (!selected || !actionOrigin) return "";
  const { binding } = selected;
  const url = new URL(
    `/api/functions/${encodeURIComponent(binding.actionId)}`,
    actionOrigin,
  );
  url.searchParams.set("siteId", siteId);
  const newsletter = binding.actionId === "newsletter.subscribe";
  const identityFields = newsletter
    ? ""
    : '<label>Name<input name="name" maxlength="120" autocomplete="name" required></label><label>Phone (optional)<input name="phone" type="tel" minlength="6" maxlength="40" autocomplete="tel"></label>';
  const message = newsletter
    ? ""
    : `<label>Message<textarea name="message" maxlength="4000"${binding.actionId === "lead.create" || binding.actionId === "appointment.request" ? " required" : ""}></textarea></label>`;
  return `<form id="contact-form" class="mi-form" method="post" action="${escapeAttribute(url.toString())}"><label class="mi-form__honeypot" aria-hidden="true">Website<input name="_website" tabindex="-1" autocomplete="off"></label><input name="_idempotencyKey" type="hidden" value="">${identityFields}<label>Email<input name="email" type="email" maxlength="254" autocomplete="email" required></label>${staticActionFields(binding.actionId)}${message}<label class="mi-form__consent"><input name="consent" type="checkbox" value="true" required><span>${staticConsentText(binding.actionId)}</span></label><button type="submit">${staticSubmitLabel(binding.actionId)}</button></form>`;
}

function staticConsentText(actionId: string): string {
  return actionId === "newsletter.subscribe"
    ? "I agree to receive email updates from this business. I can unsubscribe at any time."
    : "I agree that this business may use these details to respond to my request.";
}

function staticActionFields(actionId: string): string {
  if (actionId === "appointment.request") {
    return '<label>Service (optional)<input name="service" maxlength="160"></label><label>Preferred date (optional)<input name="preferredDate" type="date"></label><label>Preferred time (optional)<input name="preferredTime" type="time"></label>';
  }
  if (actionId === "reservation.request") {
    return '<label>Requested date<input name="requestedDate" type="date" required></label><label>Requested time<input name="requestedTime" type="time" required></label><label>Party size<input name="partySize" type="number" min="1" max="100" required></label>';
  }
  if (actionId === "quote.request") {
    return '<label>Service or project<input name="service" maxlength="160" required></label><label>Location (optional)<input name="location" maxlength="240"></label><label>Budget range (optional)<input name="budgetRange" maxlength="120"></label>';
  }
  if (actionId === "property.enquiry") {
    return '<label>Property or project reference<input name="propertyId" maxlength="160" required></label><label>Enquiry type<select name="enquiryType"><option value="details">Request details</option><option value="visit">Arrange a visit</option><option value="brochure">Request a brochure</option><option value="callback">Request a callback</option></select></label>';
  }
  if (actionId === "demo.request") {
    return '<label>Company (optional)<input name="company" maxlength="180" autocomplete="organization"></label><label>Role (optional)<input name="role" maxlength="120" autocomplete="organization-title"></label>';
  }
  if (actionId === "booking.request") {
    return '<label>Check-in<input name="checkIn" type="date" required></label><label>Check-out<input name="checkOut" type="date" required></label><label>Guests<input name="guests" type="number" min="1" max="50" required></label><label>Room preference (optional)<input name="roomPreference" maxlength="160"></label>';
  }
  if (actionId === "enrollment.enquiry") {
    return '<label>Course or programme (optional)<input name="course" maxlength="180"></label><label>Preferred delivery mode (optional)<select name="deliveryMode"><option value="unsure">Not sure yet</option><option value="online">Online</option><option value="in-person">In person</option><option value="hybrid">Hybrid</option></select></label>';
  }
  return "";
}

function staticSubmitLabel(actionId: string): string {
  if (actionId === "appointment.request") return "Request appointment";
  if (actionId === "reservation.request") return "Request a table";
  if (actionId === "quote.request") return "Request quote";
  if (actionId === "newsletter.subscribe") return "Subscribe";
  if (actionId === "property.enquiry") return "Send property enquiry";
  if (actionId === "demo.request") return "Request demo";
  if (actionId === "booking.request") return "Request booking";
  if (actionId === "enrollment.enquiry") return "Send enrollment enquiry";
  return "Send enquiry";
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
  const industryCss = staticIndustryCss(site);
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
.mi-section--navbar{padding:0;border-bottom:var(--mi-border-width) solid var(--mi-color-border);background:var(--mi-color-surface);position:relative;z-index:100;overflow:visible}
.mi-navbar{min-height:4.75rem;display:flex;align-items:center;gap:1rem}
.mi-brand{min-width:0;min-height:44px;max-width:min(13rem,100%);margin-right:auto;display:inline-flex;align-items:center;color:var(--mi-color-text);font:700 1.1rem/1.1 var(--mi-font-display),sans-serif;text-decoration:none}
.mi-brand__logo{display:block;width:auto;height:auto;max-width:100%;max-height:3rem;object-fit:contain;object-position:center}
.mi-brand--footer{margin:0;max-width:min(15rem,100%)}
.mi-brand--footer .mi-brand__logo{max-height:4rem}
.mi-nav{display:flex;align-items:center;gap:1rem}
.mi-nav a,.mi-footer a{min-width:44px;min-height:44px;display:inline-flex;align-items:center;color:var(--mi-color-text-muted);text-decoration-thickness:.08em;text-underline-offset:.25em}
.mi-menu-toggle{display:none;min-width:44px;min-height:44px;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-control);background:var(--mi-color-surface);color:var(--mi-color-text);font:var(--mi-control-weight) .9rem/1 var(--mi-font-ui),sans-serif;padding:.6rem .9rem;gap:.5rem;cursor:pointer}
.mi-nav-backdrop{display:none}
.mi-menu-toggle:focus-visible,.mi-nav a:focus-visible{outline:3px solid var(--mi-color-primary);outline-offset:3px}
.mi-menu-icon,.mi-menu-icon::before,.mi-menu-icon::after{display:block;width:1rem;height:2px;border-radius:999px;background:currentColor;content:"";transition:transform var(--mi-motion-fast) ease,top var(--mi-motion-fast) ease,background-color var(--mi-motion-fast) ease}.mi-menu-icon{position:relative}.mi-menu-icon::before,.mi-menu-icon::after{position:absolute;left:0}.mi-menu-icon::before{top:-.32rem}.mi-menu-icon::after{top:.32rem}.mi-menu-toggle[aria-expanded="true"] .mi-menu-icon{background:transparent}.mi-menu-toggle[aria-expanded="true"] .mi-menu-icon::before{top:0;transform:rotate(45deg)}.mi-menu-toggle[aria-expanded="true"] .mi-menu-icon::after{top:0;transform:rotate(-45deg)}
.mi-section__composition{position:relative}
.mi-heading{max-width:45rem}
.mi-heading>p{max-width:65ch;color:var(--mi-color-text-muted)}
.mi-eyebrow{width:max-content;max-width:100%;margin:0;text-transform:uppercase;letter-spacing:.14em;font:800 .78rem/1.2 var(--mi-font-ui),sans-serif;color:var(--mi-color-primary)}
h1,h2,h3{max-width:100%;font-family:var(--mi-font-display),sans-serif;overflow-wrap:break-word;text-wrap:balance}
h1{font-size:clamp(2.7rem,8vw,5.6rem);font-weight:var(--mi-display-weight);line-height:var(--mi-display-leading);letter-spacing:var(--mi-display-tracking);margin:.25em 0}
h2,h3{font-weight:var(--mi-heading-weight);line-height:var(--mi-heading-leading);letter-spacing:var(--mi-heading-tracking)}
h2{font-size:clamp(2rem,5vw,3.6rem);margin:.25em 0 .45em}
h3{font-size:1.25rem;margin:.2em 0 .55em}
.mi-split{display:grid;gap:clamp(1.5rem,5vw,4rem);align-items:center}.mi-split>*{min-width:0}
.mi-grid{display:grid;gap:1rem;margin-top:2.5rem}
.mi-item-groups{display:grid;gap:clamp(2rem,5vw,4rem);margin-top:2.5rem}.mi-item-group{min-width:0}.mi-item-group__description{max-width:62ch;margin:.6rem 0 0;color:var(--mi-color-text-muted)}.mi-item-group>.mi-grid{margin-top:1rem}
.mi-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:2.5rem}.mi-gallery__item{min-width:0;margin:0;overflow:hidden;border-radius:var(--mi-radius-card);background:var(--mi-color-secondary)}.mi-gallery__item img{display:block;width:100%;height:100%;aspect-ratio:1/1;object-fit:cover}
.mi-card{min-width:0;padding:1.4rem;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-card);background:var(--mi-color-surface);box-shadow:var(--mi-shadow-card)}
.mi-card h3{font-size:clamp(1.125rem,1.5vw,1.35rem);font-weight:600;line-height:1.22;letter-spacing:-.01em}
.mi-card p{color:var(--mi-color-text-muted)}
.mi-card .mi-card__meta{margin:.45rem 0 0;color:var(--mi-color-text);font-family:var(--mi-font-ui),system-ui,sans-serif;font-size:.875rem;font-weight:700;line-height:1.35;letter-spacing:.02em;font-variant-numeric:tabular-nums}
.mi-card img,.mi-media img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--mi-image-radius)}
.mi-media{margin:2rem 0;border-radius:var(--mi-image-radius);overflow:hidden;box-shadow:var(--mi-shadow-card)}
.mi-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
.mi-action,.mi-form button{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:.75rem 1rem;border-radius:var(--mi-radius-control);font:var(--mi-control-weight) .92rem/1 var(--mi-font-ui),sans-serif;text-decoration:none;transition:transform var(--mi-motion-fast) ease,box-shadow var(--mi-motion-fast) ease,background-color var(--mi-motion-fast) ease}
.mi-action:hover,.mi-form button:hover{transform:translateY(calc(var(--mi-motion-distance) * -.18));box-shadow:var(--mi-shadow-control)}
.mi-action--primary,.mi-form button{border:0;background:var(--mi-color-primary);color:var(--mi-color-primary-contrast)}
.mi-form button:disabled{opacity:.7;cursor:wait;transform:none;box-shadow:none}
.mi-action--secondary{border:var(--mi-border-width) solid var(--mi-color-border);color:var(--mi-color-text)}
.mi-form{display:grid;gap:1rem;min-width:0;max-width:38rem;margin-top:2rem}
.mi-form label{display:grid;gap:.35rem;min-width:0;font:650 .95rem/1.4 var(--mi-font-ui),sans-serif}
.mi-form input,.mi-form textarea,.mi-form select{width:100%;min-width:0;max-width:100%;min-height:44px;border:var(--mi-border-width) solid var(--mi-color-border);border-radius:var(--mi-radius-control);padding:.75rem;background:var(--mi-color-surface);color:var(--mi-color-text);font:inherit}
.mi-form textarea{min-height:8rem}
.mi-form .mi-form__consent{grid-template-columns:44px minmax(0,1fr);align-items:center}
.mi-form .mi-form__consent input[type=checkbox]{width:44px;min-height:44px;margin:0;padding:0}
.mi-form__honeypot{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
.mi-footer{display:grid;gap:2rem}
.mi-footer nav{display:flex;flex-wrap:wrap;gap:1rem}
.mi-footer__copyright{grid-column:1/-1;margin:0;color:var(--mi-color-text-muted);font-size:.9rem}

${industryCss}

/* Structural variant two changes the exported composition, not only its color. */
@media(min-width:48rem){
  .mi-split{grid-template-columns:1fr 1fr}
  .mi-section-theme[data-section-family="contact"] .mi-section__composition{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(1.5rem,5vw,4rem);align-items:center}
  .mi-grid,.mi-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}
  .mi-footer{grid-template-columns:1fr auto}
  .mi-section-variant--2[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,1.12fr) minmax(18rem,.88fr)}
  .mi-section-variant--2[data-section-family="hero"] .mi-media{order:-1}
  .mi-section-theme--editorial[data-section-family="hero"] .mi-section__composition,.mi-section-theme--luxury[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,.72fr) minmax(24rem,1.28fr)}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-section__composition{display:grid;grid-template-columns:minmax(14rem,.72fr) minmax(0,1.28fr);column-gap:clamp(2rem,6vw,6rem);align-items:start}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-heading{grid-column:1;grid-row:1/span 2}
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-grid,
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-media,
  .mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-form{grid-column:2;grid-row:1;margin-top:0}
  .mi-section-variant--2[data-section-family="contact"] .mi-section__composition{grid-template-columns:minmax(0,2fr) minmax(0,3fr)}
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
.mi-section-theme--maximalist h1{font-size:clamp(3rem,8vw,6rem);font-weight:700;line-height:.98;letter-spacing:-.025em}
.mi-section-theme--maximalist h2,.mi-section-theme--maximalist h3,.mi-section-theme--cinematic h2,.mi-section-theme--cinematic h3{font-family:var(--mi-font-ui),sans-serif;font-weight:650;line-height:1.1;letter-spacing:-.02em}
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
.mi-section-theme--cinematic[data-section-family="hero"] .mi-heading>*{max-width:56rem}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-heading>p{color:#d8e3e3}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media{position:relative;min-height:inherit;margin:0;border-radius:0;box-shadow:none}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgb(3 14 18/.92),rgb(3 14 18/.52) 56%,rgb(3 14 18/.18))}
.mi-section-theme--cinematic[data-section-family="hero"] .mi-media img{width:100%;height:100%;min-height:inherit;aspect-ratio:auto;border-radius:0}
.mi-section-theme--cinematic h1{font-size:clamp(2.5rem,4.6vw,4.25rem);font-weight:650;line-height:1.02;letter-spacing:-.025em;text-transform:none}
.mi-section-theme--cinematic .mi-card{border:0;border-radius:0;background:transparent;box-shadow:none}

@media(min-width:48rem) and (max-width:71.99rem){h1{max-width:100%;font-size:clamp(3rem,6vw,4.25rem);overflow-wrap:break-word}.mi-section-variant--2:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) h2{font-size:clamp(1.65rem,3.6vw,2.25rem)}}
@media(min-width:48rem) and (max-width:63.99rem){
  .mi-section--hero .mi-section__composition{grid-template-columns:minmax(0,1fr)}
  .mi-section-variant--2[data-section-family="navbar"] .mi-navbar{grid-template-areas:"toggle cta brand"}
  .mi-section-variant--2[data-section-family="navbar"] .mi-brand{justify-self:end}
}
@media(max-width:63.99rem){
  .mi-navbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"toggle brand cta"}
  .mi-brand{grid-area:brand;min-width:0;margin:0;justify-self:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mi-menu-toggle{display:inline-flex;align-items:center}
  .mi-menu-toggle{grid-area:toggle}
  .mi-navbar>.mi-action{grid-area:cta;max-width:30vw}
  .mi-menu-toggle{position:relative;z-index:32}
  .mi-nav{display:none;position:absolute;z-index:31;top:calc(100% + .5rem);left:1rem;flex-direction:column;align-items:stretch;width:min(24rem,calc(100vw - 2rem));padding:.4rem;background:var(--mi-color-surface);border:1px solid var(--mi-color-border);border-radius:var(--mi-radius-card);box-shadow:var(--mi-shadow-card)}
  .mi-nav[data-open="true"]{display:flex}
  .mi-menu-toggle[aria-expanded="true"]~.mi-nav-backdrop{position:fixed;z-index:30;inset:0;display:block;width:100vw;height:100vh;margin:0;padding:0;border:0;border-radius:0;background:rgb(7 23 28/.42);backdrop-filter:blur(2px);cursor:default}
  .mi-nav a{padding:.55rem .7rem;border-radius:calc(var(--mi-radius-control) * .7)}
}
@media(max-width:47.99rem){
  .mi-navbar{grid-template-columns:auto minmax(0,1fr);grid-template-areas:"toggle brand" "cta cta";row-gap:.625rem;padding-block:.625rem}
  .mi-brand{justify-self:end}
  .mi-navbar>.mi-action{width:100%;max-width:none}
  .mi-section-theme--glass[data-section-family="hero"] .mi-media{transform:none}
  .mi-section-theme--playful .mi-card:nth-child(even){margin-top:0}
  .mi-section-theme--cinematic[data-section-family="hero"],.mi-section-theme--cinematic[data-section-family="hero"] .mi-section__composition{min-height:38rem}
  .mi-section-theme--cinematic[data-section-family="hero"] .mi-heading{padding-block:3.5rem}
  .mi-section-theme--cinematic h1{font-size:clamp(2.7rem,14vw,4.8rem)}
}
.mi-section-theme>.mi-container{container-type:inline-size}
.mi-section-theme[data-section-family="hero"]{--mi-hero-display-min:2.2rem;--mi-hero-display-fluid:4.8cqi;--mi-hero-display-max:4.5rem}
.mi-section-theme--maximalist[data-section-family="hero"]{--mi-hero-display-min:2.4rem;--mi-hero-display-fluid:5cqi;--mi-hero-display-max:4.75rem}
.mi-section-theme--cinematic[data-section-family="hero"]{--mi-hero-display-min:2.35rem;--mi-hero-display-fluid:4.6cqi;--mi-hero-display-max:4.25rem}
.mi-section-theme[data-section-family="hero"] h1{max-inline-size:min(19ch,100%);font-size:clamp(var(--mi-hero-display-min),var(--mi-hero-display-fluid),var(--mi-hero-display-max));overflow-wrap:anywhere}
.mi-section-theme[data-section-family="hero"] .mi-heading>p:not(.mi-eyebrow){max-inline-size:62ch}
@media(max-width:63.99rem){
  .mi-section-theme[data-section-family="hero"] .mi-section__composition,.mi-section-variant--2[data-section-family="hero"] .mi-section__composition,.mi-section-theme--editorial[data-section-family="hero"] .mi-section__composition,.mi-section-theme--luxury[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,1fr)}
  .mi-nav[data-open="true"]{max-height:min(70svh,30rem);overflow-y:auto;overscroll-behavior:contain}
}
@media(max-width:47.99rem){
  .mi-section-theme[data-section-family="hero"]{--mi-hero-display-min:2rem;--mi-hero-display-fluid:9cqi;--mi-hero-display-max:2.75rem}
  .mi-section-theme--maximalist[data-section-family="hero"],.mi-section-theme--cinematic[data-section-family="hero"]{--mi-hero-display-min:1.85rem;--mi-hero-display-fluid:7.6cqi;--mi-hero-display-max:2.25rem}
  .mi-section-theme--maximalist[data-section-family="hero"] h1,.mi-section-theme--cinematic[data-section-family="hero"] h1{font-family:var(--mi-font-ui),sans-serif;font-weight:600;line-height:1.08;letter-spacing:-.02em;text-transform:none}
  .mi-section-theme--maximalist h2,.mi-section-theme--cinematic h2{font-size:clamp(1.55rem,6.4cqi,2rem);line-height:1.14}
  .mi-section-theme--maximalist h3,.mi-section-theme--cinematic h3{font-size:clamp(1.1rem,4.8cqi,1.35rem);line-height:1.14}
  .mi-section-theme[data-section-family="hero"] .mi-actions{display:grid;grid-template-columns:minmax(0,1fr)}
  .mi-section-theme[data-section-family="hero"] .mi-action{width:100%}
  .mi-section-theme--luxury[data-section-family="hero"] .mi-media{min-height:clamp(18rem,78vw,28rem)}
}
@media(min-width:64rem){
  .mi-section-variant--3[data-section-family="navbar"] .mi-navbar,.mi-section-variant--5[data-section-family="navbar"] .mi-navbar{display:grid;grid-template-columns:minmax(0,1fr) auto;padding-block:.625rem}
  .mi-section-variant--3[data-section-family="navbar"] .mi-navbar{grid-template-areas:"brand cta" "nav nav"}
  .mi-section-variant--5[data-section-family="navbar"] .mi-navbar{grid-template-areas:"brand brand" "nav cta"}
  .mi-section-variant--3[data-section-family="navbar"] .mi-brand,.mi-section-variant--5[data-section-family="navbar"] .mi-brand{grid-area:brand;justify-self:center;margin:0}
  .mi-section-variant--3[data-section-family="navbar"] .mi-nav,.mi-section-variant--5[data-section-family="navbar"] .mi-nav{grid-area:nav;justify-self:start}
  .mi-section-variant--3[data-section-family="navbar"] .mi-action,.mi-section-variant--5[data-section-family="navbar"] .mi-action{grid-area:cta}
  .mi-section-variant--4[data-section-family="navbar"] .mi-navbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"nav brand cta"}
  .mi-section-variant--4[data-section-family="navbar"] .mi-brand{grid-area:brand;justify-self:center;margin:0}.mi-section-variant--4[data-section-family="navbar"] .mi-nav{grid-area:nav;justify-self:start}.mi-section-variant--4[data-section-family="navbar"] .mi-action{grid-area:cta}

  .mi-section-variant--3[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.mi-section-variant--3[data-section-family="hero"] .mi-heading{max-width:56rem}.mi-section-variant--3[data-section-family="hero"] .mi-actions{justify-content:center}.mi-section-variant--3[data-section-family="hero"] .mi-media{width:min(100%,68rem)}.mi-section-variant--3[data-section-family="hero"] .mi-media img{aspect-ratio:16/7}
  .mi-section-variant--4[data-section-family="hero"] .mi-section__composition{grid-template-columns:repeat(12,minmax(0,1fr));align-items:center}.mi-section-variant--4[data-section-family="hero"] .mi-heading{z-index:2;grid-column:1/span 7;grid-row:1;padding:clamp(1.5rem,4vw,3.5rem);border:1px solid var(--mi-color-border);border-radius:var(--mi-radius-card);background:color-mix(in srgb,var(--mi-color-surface) 94%,transparent);box-shadow:var(--mi-shadow-card)}.mi-section-variant--4[data-section-family="hero"] .mi-media{grid-column:6/-1;grid-row:1;min-height:32rem}.mi-section-variant--4[data-section-family="hero"] .mi-media img{height:100%;min-height:32rem}
  .mi-section-variant--5[data-section-family="hero"] .mi-section__composition{grid-template-columns:minmax(0,1fr);grid-template-areas:"immersive-hero";align-items:end}.mi-section-variant--5[data-section-family="hero"] .mi-section__composition>*{grid-area:immersive-hero}.mi-section-variant--5[data-section-family="hero"] .mi-heading{z-index:2;width:min(42rem,calc(100% - 4rem));margin:0 0 2rem 2rem;padding:clamp(1.5rem,4vw,3rem);border-radius:var(--mi-radius-card);background:color-mix(in srgb,var(--mi-color-surface) 92%,transparent);box-shadow:var(--mi-shadow-card)}.mi-section-variant--5[data-section-family="hero"] .mi-media,.mi-section-variant--5[data-section-family="hero"] .mi-media img{width:100%;min-height:38rem}.mi-section-variant--5[data-section-family="hero"] .mi-media img{height:100%;aspect-ratio:16/9}

  .mi-section-variant--3:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-heading{margin-inline:auto;text-align:center}.mi-section-variant--3:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-actions{justify-content:center}
  .mi-section-variant--4:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-section__composition{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:clamp(2rem,5vw,5rem);align-items:start}.mi-section-variant--4:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-heading{grid-column:1/span 4;grid-row:1/span 2}.mi-section-variant--4:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) :is(.mi-grid,.mi-media){grid-column:5/-1;grid-row:1;margin-top:0}.mi-section-variant--4:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-actions{grid-column:5/-1}
  .mi-section-variant--5:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-section__composition{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:clamp(2rem,6vw,6rem);align-items:center}.mi-section-variant--5:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-grid{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:0}.mi-section-variant--5:not([data-section-family="navbar"]):not([data-section-family="hero"]):not([data-section-family="contact"]):not([data-section-family="footer"]) .mi-card:first-child{grid-column:1/-1}

  .mi-section-variant--3[data-section-family="contact"] .mi-section__composition{grid-template-columns:minmax(0,1fr);justify-items:center}.mi-section-variant--3[data-section-family="contact"] :is(.mi-heading,.mi-form){width:min(100%,46rem)}.mi-section-variant--4[data-section-family="contact"] .mi-section__composition{grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr)}.mi-section-variant--4[data-section-family="contact"] .mi-form{padding:clamp(1.5rem,3vw,2.5rem);border:1px solid var(--mi-color-border);border-radius:var(--mi-radius-card);background:var(--mi-color-surface-elevated);box-shadow:var(--mi-shadow-card)}.mi-section-variant--5[data-section-family="contact"] .mi-section__composition{grid-template-columns:minmax(0,1.2fr) minmax(22rem,.8fr);align-items:start}
  .mi-section-variant--3[data-section-family="footer"] .mi-footer{grid-template-columns:minmax(0,1fr);justify-items:center;text-align:center}.mi-section-variant--3[data-section-family="footer"] .mi-footer nav{justify-content:center}.mi-section-variant--4[data-section-family="footer"] .mi-footer{grid-template-columns:minmax(0,2fr) minmax(14rem,1fr)}.mi-section-variant--4[data-section-family="footer"] .mi-footer nav{display:grid;justify-content:stretch}.mi-section-variant--5[data-section-family="footer"] .mi-footer{grid-template-columns:minmax(0,1fr)}.mi-section-variant--5[data-section-family="footer"] .mi-footer nav{justify-content:flex-start;padding-top:1.5rem;border-top:1px solid var(--mi-color-border)}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.mi-action,.mi-form button,.mi-menu-icon,.mi-menu-icon::before,.mi-menu-icon::after{transition:none!important}}
`;
}

function staticIndustryCss(site: Site): string {
  if (site.domain === "restaurant" && site.subtype === "restaurant") {
    const subtypeSelector =
      '[data-mi-domain="restaurant"][data-mi-subtype="restaurant"]';
    const candidateId = site.generation?.selectedCandidateId;
    const selector = candidateId
      ? `${subtypeSelector}[data-mi-candidate="${escapeCssAttributeValue(candidateId)}"]`
      : subtypeSelector;
    // Candidate palette, theme, section variants and section order are already
    // embedded in the immutable Site snapshot. Scope the export-native
    // Restaurant grammar to that exact identity so two candidate exports
    // cannot collapse onto one generic subtype presentation contract.
    return `${selector}{--mi-restaurant-paper:color-mix(in srgb,var(--mi-color-surface) 94%,var(--mi-color-accent));--mi-restaurant-rule:color-mix(in srgb,var(--mi-color-border) 72%,var(--mi-color-text));overflow-x:clip;background:var(--mi-color-surface)}
${selector} .mi-section{--mi-section-space:clamp(3.75rem,8vw,7.5rem);background:linear-gradient(90deg,color-mix(in srgb,var(--mi-color-accent) 5%,transparent) 1px,transparent 1px),var(--mi-color-surface);background-size:min(8vw,7rem) 100%}${selector} .mi-section:nth-child(odd):not(.mi-section--navbar){background:linear-gradient(90deg,color-mix(in srgb,var(--mi-color-accent) 5%,transparent) 1px,transparent 1px),var(--mi-restaurant-paper)}
${selector} .mi-section--navbar{border-bottom:0}${selector} .mi-navbar{min-height:5rem;border-top:1px solid var(--mi-restaurant-rule);border-bottom:3px double var(--mi-restaurant-rule)}
${selector} .mi-eyebrow{color:var(--mi-color-primary);font-size:.72rem;font-weight:750;line-height:1.3;letter-spacing:.15em}${selector} :is(h1,h2,h3){hyphens:none;overflow-wrap:normal;word-break:normal;text-wrap:balance}${selector} h1{max-width:13ch;font-size:clamp(2.75rem,6.6vw,4.25rem);font-weight:600;line-height:1.02;letter-spacing:-.035em}${selector} h2{max-width:18ch;font-weight:580;line-height:1.08;letter-spacing:-.025em}
${selector} .mi-section--hero{padding-top:clamp(3rem,7vw,6.5rem)}${selector} .mi-section--hero .mi-section__composition{min-height:clamp(34rem,72vh,47rem);column-gap:clamp(2rem,6vw,7rem)}${selector} .mi-section--hero .mi-heading{z-index:1;padding-block:clamp(1.5rem,4vw,3.5rem)}${selector} .mi-section--hero .mi-media{position:relative;min-height:28rem;margin:0;border-radius:0;overflow:visible;box-shadow:none}${selector} .mi-section--hero .mi-media::before{content:"";position:absolute;inset:.8rem -.8rem -.8rem .8rem;z-index:-1;border:1px solid var(--mi-color-accent);pointer-events:none}${selector} .mi-section--hero .mi-media img{min-height:28rem;aspect-ratio:5/6;border-radius:0;object-fit:cover}
${selector} .mi-action{border-radius:0;padding-inline:1.2rem}${selector} .mi-action--secondary{border-width:0 0 1px}${selector} .mi-section--services .mi-card{display:grid;min-height:0;grid-template-columns:minmax(0,1fr) auto;gap:.35rem clamp(1rem,4vw,3rem);padding:1.15rem 0;border:0;border-top:1px solid var(--mi-restaurant-rule);border-radius:0;background:transparent;box-shadow:none}${selector} .mi-section--services .mi-card h3{grid-column:1;margin:0;font-family:var(--mi-font-display),serif;font-size:clamp(1.05rem,2vw,1.3rem);font-weight:600}${selector} .mi-section--services .mi-card__meta{grid-column:2;grid-row:1;align-self:baseline;margin:0;white-space:nowrap;color:var(--mi-color-primary)}${selector} .mi-section--services .mi-card>p:not(.mi-card__meta){grid-column:1/-1;max-width:62ch;margin:0}${selector} .mi-section--services .mi-item-groups{margin-top:clamp(2rem,5vw,4.5rem)}${selector} .mi-section--services .mi-item-group>h3{margin:0;padding-bottom:.65rem;border-bottom:3px double var(--mi-color-text);font-family:var(--mi-font-display),serif;font-size:clamp(1.45rem,3vw,2.1rem);font-weight:580}${selector} .mi-section--services .mi-item-group>.mi-grid{margin-top:0}
${selector} .mi-gallery{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:clamp(.65rem,1.8vw,1.5rem)}${selector} .mi-gallery__item{grid-column:auto!important;margin:0;overflow:hidden;border-radius:0}${selector} .mi-gallery__item:first-child{grid-column:1/-1!important}${selector} .mi-gallery__item img{width:100%;height:100%;aspect-ratio:4/3;border-radius:0;object-fit:cover}
${selector} .mi-section--contact .mi-form{margin-top:0;border:1px solid var(--mi-restaurant-rule);border-top:4px solid var(--mi-color-primary);border-radius:0;background:var(--mi-color-surface);box-shadow:0 1.4rem 4rem color-mix(in srgb,var(--mi-color-text) 7%,transparent)}${selector} .mi-section--cta{border-top:3px double var(--mi-restaurant-rule);border-bottom:3px double var(--mi-restaurant-rule)}
@media(min-width:48rem){${selector} .mi-section-variant--5.mi-section--hero .mi-section__composition{grid-template-columns:minmax(17rem,.8fr) minmax(24rem,1.2fr)!important;grid-template-areas:none!important;align-items:center}${selector} .mi-section-variant--5.mi-section--hero .mi-section__composition>*{grid-area:auto!important}${selector} .mi-section-variant--5.mi-section--hero .mi-heading{width:auto!important;margin:0!important;padding:clamp(1rem,2vw,2rem) 0!important;border-radius:0;background:transparent;box-shadow:none}${selector} .mi-section-variant--5.mi-section--hero .mi-media,${selector} .mi-section-variant--5.mi-section--hero .mi-media img{width:100%;min-height:30rem;aspect-ratio:4/3}${selector} .mi-section--services .mi-item-groups{grid-column:5/-1;grid-row:1;margin:0}${selector} .mi-section--services .mi-item-group>.mi-grid{grid-template-columns:repeat(2,minmax(0,1fr));column-gap:clamp(2rem,5vw,5rem)}}
@media(max-width:47.99rem){${selector} .mi-section{--mi-section-space:clamp(3rem,14vw,4.75rem);background-size:4.5rem 100%}${selector} .mi-eyebrow{width:auto;max-width:100%;white-space:normal;overflow-wrap:anywhere}${selector} h1{max-width:100%;font-size:clamp(2.1rem,10vw,2.85rem);line-height:1.08;letter-spacing:-.025em}${selector} .mi-section-variant--5.mi-section--hero .mi-section__composition{min-height:0;grid-template-columns:minmax(0,1fr)!important;grid-template-areas:none!important}${selector} .mi-section-variant--5.mi-section--hero .mi-section__composition>*{grid-area:auto!important}${selector} .mi-section-variant--5.mi-section--hero .mi-heading{width:100%!important;margin:0!important;padding:0!important;border-radius:0;background:transparent;box-shadow:none}${selector} .mi-section--hero .mi-media,${selector} .mi-section--hero .mi-media img{min-width:0;width:100%;max-width:100%;min-height:16rem;aspect-ratio:4/3;box-sizing:border-box}${selector} .mi-section--hero .mi-media{overflow:hidden}${selector} .mi-section--hero .mi-media::before{inset:.5rem -.4rem -.5rem .4rem}${selector} .mi-gallery{grid-template-columns:1fr!important}${selector} .mi-gallery__item:nth-child(n){grid-column:1!important}${selector} .mi-section--services .mi-card__meta{max-width:8rem;white-space:normal;overflow-wrap:anywhere;text-align:right}}
@media(max-width:22rem){${selector} .mi-section--services .mi-card{grid-template-columns:minmax(0,1fr)}${selector} .mi-section--services .mi-card__meta{grid-column:1;grid-row:auto;max-width:100%;text-align:left}}`;
  }
  if (site.domain !== "clinic" || site.subtype !== "physiotherapy") return "";

  const subtypeSelector = '[data-mi-subtype="physiotherapy"]';
  const candidateId = site.generation?.selectedCandidateId;
  const candidateSelector = candidateId
    ? `${subtypeSelector}[data-mi-candidate="${escapeCssAttributeValue(candidateId)}"]`
    : subtypeSelector;

  // The static renderer has a smaller class vocabulary than the React
  // renderer, so this is an export-native version of the same movement-pathway
  // grammar. The base token layer is subtype-scoped while every compositional
  // rule is scoped to the exact selected candidate. Candidate theme, section
  // variants and section order already live in the immutable Site snapshot, so
  // this avoids copying the React-only candidate stylesheet into the export.
  return `${subtypeSelector}{
  --mi-physio-path:color-mix(in srgb,var(--mi-color-primary) 30%,var(--mi-color-border));
  --mi-physio-warm:color-mix(in srgb,var(--mi-color-accent) 82%,var(--mi-color-surface));
  background:color-mix(in srgb,var(--mi-color-primary) 5%,var(--mi-color-surface));
}
${candidateSelector} .mi-section--navbar::after{content:"";position:absolute;right:0;bottom:-.1rem;left:0;height:2px;border-radius:999px;background:linear-gradient(90deg,transparent,var(--mi-color-primary) 18% 70%,var(--mi-color-accent),transparent);opacity:.44;pointer-events:none}
${candidateSelector} .mi-section--hero .mi-section__composition{position:relative;column-gap:clamp(2.5rem,6vw,6.5rem)}
${candidateSelector} .mi-section--hero .mi-section__composition::before{content:"";position:absolute;z-index:-1;top:8%;left:4%;width:min(44%,33rem);aspect-ratio:1.35;border:1px solid var(--mi-physio-path);border-radius:58% 42% 55% 45%/45% 55% 45% 55%;transform:rotate(-7deg);pointer-events:none}
${candidateSelector} .mi-section--hero h1{max-inline-size:min(17ch,100%);font-weight:650;line-height:1.1;letter-spacing:-.024em;text-transform:none;word-break:normal;overflow-wrap:normal;hyphens:none}
${candidateSelector} .mi-section--hero .mi-media{border:1px solid color-mix(in srgb,var(--mi-color-primary) 24%,var(--mi-color-border));border-radius:58% 42% 52% 48%/44% 56% 44% 56%;box-shadow:1.1rem 1.1rem 0 color-mix(in srgb,var(--mi-color-primary) 7%,transparent),var(--mi-shadow-card)}
${candidateSelector} :is(.mi-section--services,.mi-section--features) .mi-card{border-color:color-mix(in srgb,var(--mi-color-primary) 16%,var(--mi-color-border));background:color-mix(in srgb,var(--mi-color-surface-elevated) 94%,var(--mi-color-primary));box-shadow:0 1.25rem 3.5rem color-mix(in srgb,var(--mi-color-secondary) 8%,transparent)}
${candidateSelector} .mi-section--process .mi-grid{position:relative;isolation:isolate}
${candidateSelector} .mi-section--process .mi-card{border-color:var(--mi-physio-path);background:var(--mi-color-surface)}
${candidateSelector} .mi-section--cta{background:linear-gradient(112deg,transparent 0 72%,color-mix(in srgb,var(--mi-color-accent) 14%,transparent) 72% 100%),color-mix(in srgb,var(--mi-color-primary) 7%,var(--mi-color-surface))}
@media(min-width:48rem){${candidateSelector} :is(.mi-section--services,.mi-section--features) .mi-card:nth-child(even){margin-top:clamp(1rem,2.8vw,2.5rem)}${candidateSelector} .mi-section--process .mi-grid::before{content:"";position:absolute;z-index:-1;top:2.15rem;right:8%;left:8%;height:2px;background:repeating-linear-gradient(90deg,var(--mi-physio-path) 0 .65rem,transparent .65rem 1.15rem);pointer-events:none}}
@media(max-width:47.99rem){${candidateSelector} .mi-section--hero .mi-section__composition::before{top:auto;bottom:1rem;left:8%;width:74%;transform:rotate(-4deg)}${candidateSelector} .mi-section--hero .mi-media{box-shadow:.55rem .55rem 0 color-mix(in srgb,var(--mi-color-primary) 7%,transparent),var(--mi-shadow-card)}}`;
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

const STATIC_JAVASCRIPT = `function micirqlSubmissionKey(){if(typeof crypto!=="undefined"&&typeof crypto.randomUUID==="function")return crypto.randomUUID();return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)}function micirqlPrepareForm(form,rotateKey){const key=form.querySelector('input[name="_idempotencyKey"]');if(key instanceof HTMLInputElement&&(rotateKey||!key.value))key.value=micirqlSubmissionKey();const button=form.querySelector('button[type="submit"]');if(button instanceof HTMLButtonElement){button.disabled=false;button.removeAttribute("aria-disabled")}}document.querySelectorAll('form[action*="/api/functions/"]').forEach(function(form){micirqlPrepareForm(form,false);form.addEventListener("submit",function(){const button=form.querySelector('button[type="submit"]');if(button instanceof HTMLButtonElement){button.disabled=true;button.setAttribute("aria-disabled","true")}})});window.addEventListener("pageshow",function(event){if(!event.persisted)return;document.querySelectorAll('form[action*="/api/functions/"]').forEach(function(form){micirqlPrepareForm(form,true)})});function closeNavigation(button,restoreFocus){const menu=document.getElementById(button.getAttribute("aria-controls")||"");button.setAttribute("aria-expanded","false");button.setAttribute("aria-label","Open primary navigation");if(menu)menu.dataset.open="false";if(restoreFocus)button.focus()}document.addEventListener("click",function(event){const target=event.target instanceof Element?event.target:null;const clicked=target&&target.closest(".mi-menu-toggle");document.querySelectorAll(".mi-menu-toggle").forEach(function(button){const menu=document.getElementById(button.getAttribute("aria-controls")||"");const open=button===clicked&&button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));button.setAttribute("aria-label",(open?"Close":"Open")+" primary navigation");if(menu)menu.dataset.open=String(open)})});document.addEventListener("keydown",function(event){if(event.key!=="Escape")return;const button=document.querySelector('.mi-menu-toggle[aria-expanded="true"]');if(button instanceof HTMLElement)closeNavigation(button,true)});document.addEventListener("focusin",function(event){const target=event.target instanceof Node?event.target:null;document.querySelectorAll('.mi-menu-toggle[aria-expanded="true"]').forEach(function(button){const menu=document.getElementById(button.getAttribute("aria-controls")||"");if(target&&target!==button&&(!menu||!menu.contains(target)))closeNavigation(button,false)})});window.matchMedia("(min-width: 64rem)").addEventListener("change",function(event){if(!event.matches)return;document.querySelectorAll('.mi-menu-toggle[aria-expanded="true"]').forEach(function(button){closeNavigation(button,false)})});`;

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

function renderGallery(
  items: Record<string, unknown>[],
  assetMap: Map<string, string>,
): string {
  const figures = items.flatMap((item) => {
    const source = imageFor(item.image, assetMap);
    if (!source) return [];
    const alt = imageAlt(item.image) || itemTitle(item);
    return [
      `<figure class="mi-gallery__item"><img src="${escapeAttribute(source)}" alt="${escapeAttribute(alt)}" loading="lazy"></figure>`,
    ];
  });
  return figures.length
    ? `<div class="mi-gallery">${figures.join("")}</div>`
    : renderCards(items, assetMap);
}

function renderCards(
  items: Record<string, unknown>[],
  assetMap: Map<string, string>,
): string {
  const renderCard = (item: Record<string, unknown>) => {
    const image = imageFor(item.image, assetMap);
    const meta = itemMeta(item);
    const description = itemDescription(item);
    return `<article class="mi-card">${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(itemTitle(item))}">` : ""}<h3>${escapeHtml(itemTitle(item))}</h3>${meta ? `<p class="mi-card__meta">${escapeHtml(meta)}</p>` : ""}${description ? `<p>${escapeHtml(description)}</p>` : ""}</article>`;
  };
  if (!items.some((item) => itemGroup(item))) {
    return `<div class="mi-grid">${items.map(renderCard).join("")}</div>`;
  }

  const groups: Array<{
    label: string;
    description?: string;
    items: Record<string, unknown>[];
  }> = [];
  for (const item of items) {
    const label = itemGroup(item) ?? "Menu";
    const description = value(item.groupDescription);
    const group = groups.find((entry) => entry.label === label);
    if (group) {
      group.items.push(item);
      if (!group.description && description) group.description = description;
    } else {
      groups.push({
        label,
        ...(description ? { description } : {}),
        items: [item],
      });
    }
  }
  return `<div class="mi-item-groups">${groups.map((group) => `<section class="mi-item-group"><h3>${escapeHtml(group.label)}</h3>${group.description ? `<p class="mi-item-group__description">${escapeHtml(group.description)}</p>` : ""}<div class="mi-grid">${group.items.map(renderCard).join("")}</div></section>`).join("")}</div>`;
}

function itemGroup(item: Record<string, unknown>): string | undefined {
  return value(item.group);
}

function itemMeta(item: Record<string, unknown>): string | undefined {
  return value(item.meta);
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
  const backgroundLuminance = relativeLuminanceForCss(hex);
  const darkLuminance = relativeLuminanceForCss("111111");
  const darkContrast = (backgroundLuminance + 0.05) / (darkLuminance + 0.05);
  const lightContrast = 1.05 / (backgroundLuminance + 0.05);
  return darkContrast >= lightContrast ? "#111111" : "#ffffff";
}

function relativeLuminanceForCss(hex: string): number {
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722;
}

function cssFont(value: string): string {
  const cleaned = value.replace(/[^a-z0-9 ,.'"-]/gi, "").trim();
  return cleaned || "system-ui";
}

function escapeCssAttributeValue(value: string): string {
  return [...value]
    .map((character) =>
      /^[a-z0-9_-]$/i.test(character)
        ? character
        : `\\${character.codePointAt(0)!.toString(16)} `,
    )
    .join("");
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
