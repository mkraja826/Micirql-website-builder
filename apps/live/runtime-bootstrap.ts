import {
  liveResolverHostname,
  type LiveSiteStore,
  type PublishedSiteRecord,
} from "@micirql/live-runtime";
import {
  createFunctionBindingResolver,
  registeredPublicFunctionsOrigin,
  renderPreparedPage,
  type PreparedPage,
  type ResolvedBrandMark,
} from "@micirql/renderer";
import { nativeFunctionCatalog } from "@micirql/functions";
import type { Site } from "@micirql/schema";
import { renderToStaticMarkup } from "react-dom/server.edge";
import { configureLiveHostRuntime } from "./live-runtime";
import { LIVE_SITE_SCRIPT, LIVE_SITE_STYLES } from "./live-site-assets";
import { createLiveProductionRegistry } from "./production-registry";

let configured = false;
const PRIVATE_ASSET_BUCKET = "workspace-assets";
const BRAND_MARK_URL_TTL_SECONDS = 60 * 60;

type LiveRpc = <T>(name: string, body: Record<string, unknown>) => Promise<T>;

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export function ensureLiveRuntimeConfigured() {
  if (configured) return;

  const supabaseUrl = process.env.MICIRQL_SUPABASE_URL?.replace(/\/+$/, "");
  const publishableKey = process.env.MICIRQL_SUPABASE_PUBLISHABLE_KEY;
  const secretKey =
    process.env.MICIRQL_SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicFunctionsOrigin = registeredPublicFunctionsOrigin(
    process.env.MICIRQL_PUBLIC_FUNCTIONS_ORIGIN,
  );

  if (!supabaseUrl || !publishableKey || !publicFunctionsOrigin) return;

  const rpc = async <T>(
    name: string,
    body: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });

    if (!response.ok) {
      throw new Error(
        `Live Supabase RPC ${name} failed with ${response.status}.`,
      );
    }

    return (await response.json()) as T;
  };

  const store: LiveSiteStore = {
    async resolveHostname(hostname) {
      const rows = await rpc<Array<{ site_id: string }>>(
        "resolve_live_site_hostname",
        {
          p_hostname: liveResolverHostname(hostname),
        },
      );
      const siteId = rows[0]?.site_id;
      return siteId ? { siteId } : undefined;
    },

    async getPublishedSite(siteId) {
      const rows = await rpc<
        Array<{
          site_id: string;
          version_id: string;
          snapshot: PublishedSiteRecord["snapshot"];
        }>
      >("get_live_published_site", { p_site_id: siteId });
      const row = rows[0];
      if (!row) return undefined;
      return {
        siteId: row.site_id,
        versionId: row.version_id,
        snapshot: row.snapshot,
      } satisfies PublishedSiteRecord;
    },
  };

  configureLiveHostRuntime({
    store,
    registry: createLiveProductionRegistry(),
    functions: createFunctionBindingResolver({
      actionIds: nativeFunctionCatalog.map((definition) => definition.id),
      gatewayBasePath: `${publicFunctionsOrigin}/api/functions`,
    }),
    brandMarks: {
      resolve: (site) =>
        resolveLiveBrandMarkForSite(site, {
          rpc,
          supabaseUrl,
          ...(secretKey ? { secretKey } : {}),
        }),
    },
    renderPage(page: PreparedPage) {
      return renderToStaticMarkup(renderPreparedPage(page));
    },
    documentStyles: LIVE_SITE_STYLES,
    documentScript: LIVE_SITE_SCRIPT,
    cacheTtlSeconds: 300,
  });

  configured = true;
}

/**
 * Resolves only the exact mark exposed by the published-site RPC. A private
 * Storage key is read and signed with the server credential only after that
 * public association check succeeds; neither value is returned by the RPC or
 * persisted in the immutable site snapshot.
 */
export async function resolveLiveBrandMarkForSite(
  site: Site,
  input: {
    rpc: LiveRpc;
    supabaseUrl: string;
    secretKey?: string;
    fetcher?: Fetcher;
  },
): Promise<ResolvedBrandMark | undefined> {
  const rawAssetId = site.theme.brand.logoAssetId;
  const assetId = rawAssetId?.trim() ? rawAssetId : undefined;
  if (!assetId) return undefined;

  try {
    const rows = await input.rpc<
      Array<{
        asset_id: unknown;
        src: unknown;
        alt: unknown;
        width: unknown;
        height: unknown;
      }>
    >("get_live_brand_mark", {
      p_site_id: site.siteId,
      p_asset_id: assetId,
    });
    const row = rows[0];
    const width = positive(row?.width);
    const height = positive(row?.height);
    if (text(row?.asset_id) !== assetId || !width || !height) {
      return undefined;
    }

    const src =
      text(row?.src) ?? (await signLiveStorageBrandMark(site, assetId, input));
    if (!src) return undefined;
    return {
      assetId,
      src,
      alt: text(row?.alt) ?? `${site.name} logo`,
      width,
      height,
    };
  } catch {
    return undefined;
  }
}

async function signLiveStorageBrandMark(
  site: Site,
  assetId: string,
  input: {
    supabaseUrl: string;
    secretKey?: string;
    fetcher?: Fetcher;
  },
): Promise<string | undefined> {
  const secret = input.secretKey;
  if (!secret) return undefined;
  const fetcher = input.fetcher ?? fetch;
  const baseUrl = input.supabaseUrl.replace(/\/+$/, "");
  const headers = {
    apikey: secret,
    accept: "application/json",
    ...(isLegacyJwt(secret) ? { authorization: `Bearer ${secret}` } : {}),
  };
  const query = new URLSearchParams({
    id: `eq.${assetId}`,
    workspace_id: `eq.${site.workspaceId}`,
    active: "eq.true",
    deleted_at: "is.null",
    select: "id,workspace_id,source,kind,storage_provider,original_storage_key",
    limit: "1",
  });
  const assetResponse = await fetcher(`${baseUrl}/rest/v1/assets?${query}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
  });
  if (!assetResponse.ok) return undefined;
  const assets = (await assetResponse.json()) as Array<{
    id?: unknown;
    workspace_id?: unknown;
    source?: unknown;
    kind?: unknown;
    storage_provider?: unknown;
    original_storage_key?: unknown;
  }>;
  const asset = assets[0];
  const source = text(asset?.source);
  const kind = text(asset?.kind);
  const objectKey = text(asset?.original_storage_key);
  if (
    text(asset?.id) !== assetId ||
    text(asset?.workspace_id) !== site.workspaceId ||
    (source !== "user-upload" && source !== "ai-generated") ||
    (kind !== "logo" && kind !== "image") ||
    text(asset?.storage_provider) !== "supabase" ||
    !objectKey ||
    !isWorkspaceStorageKey(objectKey, site.workspaceId)
  ) {
    return undefined;
  }

  const signedResponse = await fetcher(
    `${baseUrl}/storage/v1/object/sign/${PRIVATE_ASSET_BUCKET}/${encodeObjectKey(objectKey)}`,
    {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ expiresIn: BRAND_MARK_URL_TTL_SECONDS }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!signedResponse.ok) return undefined;
  const payload = (await signedResponse.json()) as {
    signedURL?: unknown;
    signedUrl?: unknown;
  };
  const signedPath = text(payload.signedURL) ?? text(payload.signedUrl);
  if (!signedPath) return undefined;
  const signedUrl = /^https?:\/\//i.test(signedPath)
    ? new URL(signedPath)
    : new URL(
        `${baseUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`,
      );
  return signedUrl.origin === new URL(baseUrl).origin
    ? signedUrl.toString()
    : undefined;
}

function isWorkspaceStorageKey(objectKey: string, workspaceId: string) {
  if (
    objectKey.includes("\\") ||
    objectKey.startsWith("/") ||
    objectKey
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return false;
  }
  return (
    objectKey.startsWith(`${workspaceId}/`) ||
    objectKey.startsWith(`workspaces/${workspaceId}/`)
  );
}

function encodeObjectKey(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positive(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function isLegacyJwt(value: string): boolean {
  return value.split(".").length === 3;
}
