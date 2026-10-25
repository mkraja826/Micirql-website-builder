import type { AssetRecord } from "@micirql/assets";
import type { ResolvedBrandMark } from "@micirql/renderer";
import type { Site } from "@micirql/schema";
import { demoAssetById } from "./demo-assets";

type AssetRow = {
  id: unknown;
  workspace_id: unknown;
  source: unknown;
  kind: unknown;
  alt: unknown;
  width: unknown;
  height: unknown;
  original_url: unknown;
  storage_provider?: unknown;
  original_storage_key?: unknown;
  active: unknown;
  deleted_at?: unknown;
};

const PRIVATE_ASSET_BUCKET = "workspace-assets";
const BRAND_MARK_URL_TTL_SECONDS = 60 * 60;

/**
 * Resolves the canonical theme logo without placing storage credentials or
 * mutable asset metadata in the Site snapshot. Development uploads and the
 * curated catalog resolve in-process; persisted uploads resolve server-side
 * through the private asset registry only after the caller authorizes access.
 */
export async function resolveBrandMarkForSite(
  site: Site,
  options: {
    allowPersistedLookup?: boolean;
    allowWorkspaceLocalLookup?: boolean;
  } = {},
): Promise<ResolvedBrandMark | undefined> {
  const rawAssetId = site.theme.brand.logoAssetId;
  const assetId = rawAssetId?.trim() ? rawAssetId : undefined;
  if (!assetId) return undefined;

  const localCandidate = demoAssetById(assetId);
  const local =
    localCandidate &&
    (options.allowWorkspaceLocalLookup ||
      (localCandidate.source === "micirql-placeholder" &&
        !localCandidate.workspaceId))
      ? localCandidate
      : undefined;
  const asset =
    local ??
    (options.allowPersistedLookup
      ? await readProductionAsset(assetId)
      : undefined);
  if (
    !asset ||
    asset.id !== assetId ||
    !canUseAsBrandMark(asset, site.workspaceId)
  ) {
    return undefined;
  }

  return {
    assetId,
    src: asset.originalUrl,
    alt: asset.alt.trim() || `${site.name} logo`,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Server-only persisted lookup. Callers must already have authenticated and
 * authorized access to the site/workspace before invoking this helper.
 */
export function resolvePersistedBrandMarkForSite(site: Site) {
  return resolveBrandMarkForSite(site, {
    allowPersistedLookup: true,
    allowWorkspaceLocalLookup: true,
  });
}

function canUseAsBrandMark(asset: AssetRecord, workspaceId: string): boolean {
  if (!asset.active || (asset.kind !== "logo" && asset.kind !== "image")) {
    return false;
  }
  if (asset.source === "micirql-placeholder") return !asset.workspaceId;
  return asset.workspaceId === workspaceId;
}

async function readProductionAsset(
  assetId: string,
): Promise<AssetRecord | undefined> {
  const baseUrl = (
    process.env.MICIRQL_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/+$/, "");
  const secret =
    process.env.MICIRQL_SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !secret) return undefined;

  const query = new URLSearchParams({
    id: `eq.${assetId}`,
    active: "eq.true",
    deleted_at: "is.null",
    select:
      "id,workspace_id,source,kind,alt,width,height,original_url,storage_provider,original_storage_key,active,deleted_at",
    limit: "1",
  });
  try {
    const response = await fetch(`${baseUrl}/rest/v1/assets?${query}`, {
      headers: {
        apikey: secret,
        accept: "application/json",
        ...(isLegacyJwt(secret) ? { authorization: `Bearer ${secret}` } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return undefined;
    const rows = (await response.json()) as AssetRow[];
    const row = rows[0];
    if (!row) return undefined;
    const originalUrl =
      stringValue(row.original_url) ??
      (await createSignedStorageUrl(baseUrl, secret, row));
    return normalizeAssetRow(row, originalUrl);
  } catch {
    return undefined;
  }
}

function normalizeAssetRow(
  row: AssetRow,
  originalUrl: string | undefined,
): AssetRecord | undefined {
  const id = opaqueStringValue(row.id);
  const source = stringValue(row.source);
  const kind = stringValue(row.kind);
  const width = positiveNumber(row.width);
  const height = positiveNumber(row.height);
  if (
    !id ||
    !originalUrl ||
    !width ||
    !height ||
    !["user-upload", "micirql-placeholder", "ai-generated"].includes(
      source ?? "",
    ) ||
    !["image", "logo"].includes(kind ?? "") ||
    row.active !== true ||
    row.deleted_at != null
  ) {
    return undefined;
  }

  const ratio = width / height;
  return {
    id,
    ...(stringValue(row.workspace_id)
      ? { workspaceId: stringValue(row.workspace_id) }
      : {}),
    source: source as AssetRecord["source"],
    kind: kind as AssetRecord["kind"],
    name: `${id} logo`,
    alt: stringValue(row.alt) ?? "",
    width,
    height,
    orientation:
      ratio >= 2
        ? "panoramic"
        : ratio > 1.08
          ? "landscape"
          : ratio < 0.92
            ? "portrait"
            : "square",
    aspectRatio: ratio,
    focalPoint: { x: 0.5, y: 0.5 },
    domains: [],
    subtypes: [],
    sectionFamilies: [],
    themes: [],
    tags: ["brand", "logo"],
    license:
      source === "user-upload"
        ? "user-owned"
        : source === "ai-generated"
          ? "generated"
          : "micirql-owned",
    originalUrl,
    variants: [],
    active: true,
    createdAt: new Date(0).toISOString(),
  };
}

async function createSignedStorageUrl(
  baseUrl: string,
  secret: string,
  row: AssetRow,
): Promise<string | undefined> {
  const workspaceId = stringValue(row.workspace_id);
  const source = stringValue(row.source);
  const storageProvider = stringValue(row.storage_provider);
  const objectKey = stringValue(row.original_storage_key);
  if (
    !workspaceId ||
    !objectKey ||
    storageProvider !== "supabase" ||
    (source !== "user-upload" && source !== "ai-generated") ||
    !isWorkspaceStorageKey(objectKey, workspaceId)
  ) {
    return undefined;
  }

  const response = await fetch(
    `${baseUrl}/storage/v1/object/sign/${PRIVATE_ASSET_BUCKET}/${encodeObjectKey(objectKey)}`,
    {
      method: "POST",
      headers: {
        apikey: secret,
        accept: "application/json",
        "content-type": "application/json",
        ...(isLegacyJwt(secret) ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ expiresIn: BRAND_MARK_URL_TTL_SECONDS }),
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    },
  );
  if (!response.ok) return undefined;
  const payload = (await response.json()) as {
    signedURL?: unknown;
    signedUrl?: unknown;
  };
  const signedPath =
    stringValue(payload.signedURL) ?? stringValue(payload.signedUrl);
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

function opaqueStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function isLegacyJwt(value: string): boolean {
  return value.split(".").length === 3;
}
