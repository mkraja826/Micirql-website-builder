import { assetRecordSchema, type AssetRecord, type UploadGateway } from "@micirql/assets";
import type { NextRequest } from "next/server";
import {
  IMAGE_UPLOAD_TYPES,
  LOGO_UPLOAD_TYPES,
  MAX_WORKSPACE_UPLOAD_BYTES,
} from "./upload-errors";
import { bearerToken } from "./api/drafts/supabase-store";

const STORAGE_BUCKET = "workspace-assets";
const INTENT_TTL_MS = 15 * 60 * 1000;
const PREVIEW_URL_TTL_SECONDS = 60 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Fetcher = typeof fetch;

type SupabaseUploadConfig = {
  url: string;
  key: string;
  token: string;
};

type IntentRow = {
  upload_id: string;
  asset_id: string;
  workspace_id: string;
  site_id: string | null;
  file_name: string;
  content_type: string;
  byte_size: number | string;
  object_key: string;
  expires_at: string;
  completed_at: string | null;
};

type AssetRow = Record<string, unknown> & {
  id?: unknown;
  workspace_id?: unknown;
  original_storage_key?: unknown;
};

export function createSupabaseWorkspaceUploadGateway(
  request: NextRequest,
  options: {
    fetcher?: Fetcher;
    now?: () => Date;
    id?: () => string;
  } = {},
): UploadGateway | undefined {
  const config = uploadConfig(request);
  if (!config) return undefined;

  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => new Date());
  const makeId = options.id ?? (() => crypto.randomUUID());
  const client = createSupabaseUploadClient(config, fetcher);

  return {
    async createIntent(input) {
      const workspaceId = requireUuid(input.principal.workspaceId, "workspace");
      const siteId = requireUuid(input.siteId, "site");
      const kind = input.kind ?? "image";
      assertUploadMetadata(input.contentType, input.bytes, kind);
      await client.assertOwnedSite(workspaceId, siteId);

      const uploadId = makeId();
      const assetId = makeId();
      const fileName = safeFileName(input.fileName);
      const objectKey = `${workspaceId}/incoming/${safeSegment(uploadId)}/${fileName}`;
      const expiresAt = new Date(now().getTime() + INTENT_TTL_MS).toISOString();

      // Sign before inserting the intent. If signing fails, no server-managed
      // intent row is left behind; the signed URL is never returned to the
      // browser unless the RLS-protected insert also succeeds.
      const uploadUrl = await client.createSignedUploadUrl(objectKey);
      await client.insertIntent({
        upload_id: uploadId,
        asset_id: assetId,
        workspace_id: workspaceId,
        site_id: siteId,
        file_name: fileName,
        content_type: normalizeContentType(input.contentType),
        byte_size: input.bytes,
        object_key: objectKey,
        expires_at: expiresAt,
      });

      return {
        uploadId,
        assetId,
        uploadUrl,
        // A publishable key is safe in a browser. The signed URL token, not a
        // user bearer token or service credential, authorizes the transfer.
        headers: { apikey: config.key, "x-upsert": "false" },
        expiresAt,
        bodyFormat: "multipart",
      };
    },

    async finalize(input) {
      const workspaceId = requireUuid(input.principal.workspaceId, "workspace");
      const siteId = requireUuid(input.siteId, "site");
      const kind = input.kind ?? "image";
      if (kind !== "image" && kind !== "logo") throw codedError("UPLOAD_INVALID_REQUEST", 400);

      const intent = await client.readIntent(input.uploadId, workspaceId);
      if (!intent) throw codedError("UPLOAD_INTENT_NOT_FOUND", 409);
      if (intent.workspace_id !== workspaceId || intent.site_id !== siteId) {
        throw codedError("UPLOAD_WORKSPACE_MISMATCH", 403);
      }
      await client.assertOwnedSite(workspaceId, siteId);

      if (intent.completed_at) {
        return client.recoverCompletedAsset(intent);
      }
      if (Date.parse(intent.expires_at) <= now().getTime()) {
        throw codedError("UPLOAD_INTENT_EXPIRED", 409);
      }

      const stored = await client.downloadObject(intent.object_key);
      const expectedBytes = Number(intent.byte_size);
      if (!Number.isSafeInteger(expectedBytes) || stored.bytes.byteLength !== expectedBytes) {
        throw codedError("UPLOAD_SIZE_MISMATCH", 413);
      }
      if (stored.bytes.byteLength > MAX_WORKSPACE_UPLOAD_BYTES) {
        throw codedError("UPLOAD_SIZE_INVALID", 413);
      }
      const expectedType = normalizeContentType(intent.content_type);
      if (stored.contentType !== expectedType) {
        throw codedError("UPLOAD_CONTENT_TYPE_MISMATCH", 415);
      }
      const allowed = kind === "logo" ? LOGO_UPLOAD_TYPES : IMAGE_UPLOAD_TYPES;
      if (!(allowed as readonly string[]).includes(expectedType)) {
        throw codedError("UPLOAD_NOT_IMAGE", 415);
      }

      const dimensions = inspectUploadedImage(stored.bytes, expectedType);
      let row: AssetRow;
      try {
        row = await client.finalizeAsset({
          uploadId: intent.upload_id,
          name: input.name?.trim() || intent.file_name,
          alt: input.alt?.trim() || "",
          kind,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (error) {
        if (errorCode(error) === "UPLOAD_ALREADY_COMPLETED") {
          return client.recoverCompletedAsset(intent);
        }
        throw error;
      }
      return client.normalizeAsset(row, intent);
    },
  };
}

function createSupabaseUploadClient(config: SupabaseUploadConfig, fetcher: Fetcher) {
  const storageBase = `${config.url}/storage/v1`;
  const headers = (json = false) => ({
    apikey: config.key,
    authorization: `Bearer ${config.token}`,
    accept: "application/json",
    ...(json ? { "content-type": "application/json" } : {}),
  });

  async function assertOwnedSite(workspaceId: string, siteId: string) {
    const query = new URLSearchParams({
      id: `eq.${siteId}`,
      workspace_id: `eq.${workspaceId}`,
      select: "id",
      limit: "1",
    });
    const response = await fetcher(`${config.url}/rest/v1/sites?${query}`, {
      headers: headers(),
      cache: "no-store",
    });
    const rows = await responseJson<Array<{ id?: unknown }>>(response, "UPLOAD_NOT_AUTHORIZED");
    if (rows.length !== 1 || rows[0]?.id !== siteId) {
      throw codedError("UPLOAD_NOT_AUTHORIZED", 403);
    }
  }

  async function createSignedUploadUrl(objectKey: string) {
    const response = await fetcher(
      `${storageBase}/object/upload/sign/${STORAGE_BUCKET}/${encodeObjectKey(objectKey)}`,
      {
        method: "POST",
        headers: { ...headers(true), "x-upsert": "false" },
        body: "{}",
        cache: "no-store",
      },
    );
    const payload = await responseJson<{ url?: unknown; signedURL?: unknown }>(
      response,
      "UPLOAD_SERVICE_UNAVAILABLE",
    );
    const relative = stringValue(payload.url) ?? stringValue(payload.signedURL);
    if (!relative) throw codedError("UPLOAD_SERVICE_UNAVAILABLE", 503);
    return /^https?:\/\//i.test(relative)
      ? relative
      : `${storageBase}${relative.startsWith("/") ? "" : "/"}${relative}`;
  }

  async function insertIntent(intent: Omit<IntentRow, "completed_at">) {
    const response = await fetcher(`${config.url}/rest/v1/asset_upload_intents`, {
      method: "POST",
      headers: { ...headers(true), Prefer: "return=minimal" },
      body: JSON.stringify(intent),
      cache: "no-store",
    });
    await responseEmpty(response, "UPLOAD_NOT_AUTHORIZED");
  }

  async function readIntent(uploadId: string, workspaceId: string) {
    const query = new URLSearchParams({
      upload_id: `eq.${uploadId}`,
      workspace_id: `eq.${workspaceId}`,
      select:
        "upload_id,asset_id,workspace_id,site_id,file_name,content_type,byte_size,object_key,expires_at,completed_at",
      limit: "1",
    });
    const response = await fetcher(
      `${config.url}/rest/v1/asset_upload_intents?${query}`,
      { headers: headers(), cache: "no-store" },
    );
    const rows = await responseJson<IntentRow[]>(response, "UPLOAD_INTENT_NOT_FOUND");
    return rows[0];
  }

  async function downloadObject(objectKey: string) {
    const response = await fetcher(
      `${storageBase}/object/authenticated/${STORAGE_BUCKET}/${encodeObjectKey(objectKey)}`,
      { headers: headers(), cache: "no-store" },
    );
    if (!response.ok) await responseFailure(response, "UPLOAD_TRANSFER_FAILED");
    const declaredLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_WORKSPACE_UPLOAD_BYTES
    ) {
      throw codedError("UPLOAD_SIZE_INVALID", 413);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      bytes,
      contentType: normalizeContentType(response.headers.get("content-type") ?? ""),
    };
  }

  async function finalizeAsset(input: {
    uploadId: string;
    name: string;
    alt: string;
    kind: "image" | "logo";
    width: number;
    height: number;
  }) {
    const response = await fetcher(`${config.url}/rest/v1/rpc/finalize_asset_upload`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({
        p_upload_id: input.uploadId,
        p_name: input.name.slice(0, 120),
        p_alt: input.alt.slice(0, 240),
        p_kind: input.kind,
        p_width: input.width,
        p_height: input.height,
        p_source: "user-upload",
        p_license: "user-owned",
        p_domains: [],
        p_subtypes: [],
        p_section_families: [],
        p_themes: [],
        p_tags:
          input.kind === "logo" ? ["upload", "brand", "logo"] : ["upload"],
        p_dominant_tone: null,
      }),
      cache: "no-store",
    });
    const payload = await responseJson<AssetRow | AssetRow[]>(
      response,
      "UPLOAD_PROCESSING_FAILED",
    );
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (!row) throw codedError("UPLOAD_PROCESSING_FAILED", 422);
    return row;
  }

  async function recoverCompletedAsset(intent: IntentRow) {
    const query = new URLSearchParams({
      id: `eq.${intent.asset_id}`,
      workspace_id: `eq.${intent.workspace_id}`,
      active: "eq.true",
      deleted_at: "is.null",
      select: "*",
      limit: "1",
    });
    const response = await fetcher(`${config.url}/rest/v1/assets?${query}`, {
      headers: headers(),
      cache: "no-store",
    });
    const rows = await responseJson<AssetRow[]>(response, "UPLOAD_PROCESSING_FAILED");
    const row = rows[0];
    if (
      !row ||
      stringValue(row.id) !== intent.asset_id ||
      stringValue(row.workspace_id) !== intent.workspace_id
    ) {
      throw codedError("UPLOAD_PROCESSING_FAILED", 422);
    }
    return normalizeAsset(row, intent);
  }

  async function normalizeAsset(row: AssetRow, intent: IntentRow): Promise<AssetRecord> {
    if (
      stringValue(row.id) !== intent.asset_id ||
      stringValue(row.workspace_id) !== intent.workspace_id
    ) {
      throw codedError("UPLOAD_PROCESSING_FAILED", 422);
    }
    const objectKey = stringValue(row.original_storage_key) ?? intent.object_key;
    if (objectKey !== intent.object_key) {
      throw codedError("UPLOAD_PROCESSING_FAILED", 422);
    }
    const originalUrl = await createSignedReadUrl(objectKey);
    const normalized = snakeToAssetRecord(row, originalUrl);
    return assetRecordSchema.parse(normalized);
  }

  async function createSignedReadUrl(objectKey: string) {
    const response = await fetcher(
      `${storageBase}/object/sign/${STORAGE_BUCKET}/${encodeObjectKey(objectKey)}`,
      {
        method: "POST",
        headers: headers(true),
        body: JSON.stringify({ expiresIn: PREVIEW_URL_TTL_SECONDS }),
        cache: "no-store",
      },
    );
    const payload = await responseJson<{ signedURL?: unknown; signedUrl?: unknown }>(
      response,
      "UPLOAD_PROCESSING_FAILED",
    );
    const relative =
      stringValue(payload.signedURL) ?? stringValue(payload.signedUrl);
    if (!relative) throw codedError("UPLOAD_PROCESSING_FAILED", 422);
    return /^https?:\/\//i.test(relative)
      ? relative
      : `${storageBase}${relative.startsWith("/") ? "" : "/"}${relative}`;
  }

  return {
    assertOwnedSite,
    createSignedUploadUrl,
    insertIntent,
    readIntent,
    downloadObject,
    finalizeAsset,
    recoverCompletedAsset,
    normalizeAsset,
  };
}

export function inspectUploadedImage(
  bytes: Uint8Array,
  contentType: string,
): { width: number; height: number } {
  let dimensions: { width: number; height: number } | undefined;
  if (contentType === "image/png") dimensions = inspectPng(bytes);
  else if (contentType === "image/jpeg") dimensions = inspectJpeg(bytes);
  else if (contentType === "image/webp") dimensions = inspectWebp(bytes);
  else if (contentType === "image/svg+xml") dimensions = inspectSvg(bytes);
  if (!dimensions) throw codedError("UPLOAD_PROCESSING_FAILED", 422);
  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    dimensions.width > 20_000 ||
    dimensions.height > 20_000 ||
    dimensions.width * dimensions.height > 100_000_000
  ) {
    throw codedError("UPLOAD_PROCESSING_FAILED", 422);
  }
  return {
    width: Math.round(dimensions.width),
    height: Math.round(dimensions.height),
  };
}

function inspectPng(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 24 ||
    !signature.every((value, index) => bytes[index] === value) ||
    ascii(bytes, 12, 4) !== "IHDR"
  ) {
    return undefined;
  }
  return { width: readUint32(bytes, 16), height: readUint32(bytes, 20) };
}

function inspectJpeg(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    const length = (byteAt(bytes, offset) << 8) | byteAt(bytes, offset + 1);
    if (length < 2 || offset + length > bytes.length) break;
    if (marker !== undefined && sof.has(marker)) {
      return {
        height:
          (byteAt(bytes, offset + 3) << 8) | byteAt(bytes, offset + 4),
        width:
          (byteAt(bytes, offset + 5) << 8) | byteAt(bytes, offset + 6),
      };
    }
    offset += length;
  }
  return undefined;
}

function inspectWebp(bytes: Uint8Array) {
  if (
    bytes.length < 30 ||
    ascii(bytes, 0, 4) !== "RIFF" ||
    ascii(bytes, 8, 4) !== "WEBP"
  ) {
    return undefined;
  }
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8X") {
    return {
      width: 1 + readUint24LittleEndian(bytes, 24),
      height: 1 + readUint24LittleEndian(bytes, 27),
    };
  }
  if (
    chunk === "VP8 " &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      width: ((byteAt(bytes, 27) << 8) | byteAt(bytes, 26)) & 0x3fff,
      height: ((byteAt(bytes, 29) << 8) | byteAt(bytes, 28)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes[20] === 0x2f) {
    return {
      width: 1 + (((byteAt(bytes, 22) & 0x3f) << 8) | byteAt(bytes, 21)),
      height:
        1 +
        ((byteAt(bytes, 24) & 0x0f) << 10) +
        (byteAt(bytes, 23) << 2) +
        (byteAt(bytes, 22) >> 6),
    };
  }
  return undefined;
}

function inspectSvg(bytes: Uint8Array) {
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (
    /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source) ||
    /<\s*(script|foreignObject|iframe|object|embed|audio|video)\b/i.test(source) ||
    /\son[a-z]+\s*=/i.test(source) ||
    /(?:javascript|vbscript)\s*:/i.test(source) ||
    /(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:text\/html)/i.test(source)
  ) {
    throw codedError("UPLOAD_PROCESSING_FAILED", 422);
  }
  const root = source.match(/<svg\b([^>]*)>/i)?.[1];
  if (!root) return undefined;
  const width = svgLength(root, "width");
  const height = svgLength(root, "height");
  if (width && height) return { width, height };
  const viewBox = root.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite)) return undefined;
  const viewWidth = viewBox[2];
  const viewHeight = viewBox[3];
  if (!viewWidth || !viewHeight) return undefined;
  if (width) return { width, height: width * (viewHeight / viewWidth) };
  if (height) return { width: height * (viewWidth / viewHeight), height };
  return { width: viewWidth, height: viewHeight };
}

function svgLength(attributes: string, name: string) {
  const value = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*["']([0-9]+(?:\\.[0-9]+)?)(?:px)?["']`, "i"),
  )?.[1];
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function snakeToAssetRecord(row: AssetRow, originalUrl: string) {
  return {
    id: row.id,
    ...(stringValue(row.workspace_id) ? { workspaceId: row.workspace_id } : {}),
    source: row.source,
    kind: row.kind,
    name: row.name,
    alt: row.alt ?? "",
    width: Number(row.width),
    height: Number(row.height),
    orientation: row.orientation,
    aspectRatio: Number(row.aspect_ratio),
    focalPoint: {
      x: Number(row.focal_x ?? 0.5),
      y: Number(row.focal_y ?? 0.5),
    },
    ...(stringValue(row.dominant_tone) ? { dominantTone: row.dominant_tone } : {}),
    domains: row.domains ?? [],
    subtypes: row.subtypes ?? [],
    sectionFamilies: row.section_families ?? [],
    themes: row.themes ?? [],
    tags: row.tags ?? [],
    license: row.license,
    ...(stringValue(row.source_reference) ? { sourceReference: row.source_reference } : {}),
    originalUrl,
    variants: Array.isArray(row.variants) ? row.variants : [],
    active: row.active,
    createdAt: row.created_at,
  };
}

function uploadConfig(request: NextRequest): SupabaseUploadConfig | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  return { url, key, token: bearerToken(request) };
}

function assertUploadMetadata(
  contentType: string,
  bytes: number,
  kind: "image" | "logo",
) {
  const type = normalizeContentType(contentType);
  const allowed = kind === "logo" ? LOGO_UPLOAD_TYPES : IMAGE_UPLOAD_TYPES;
  if (!(allowed as readonly string[]).includes(type)) {
    throw codedError("UPLOAD_NOT_IMAGE", 415);
  }
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > MAX_WORKSPACE_UPLOAD_BYTES) {
    throw codedError("UPLOAD_SIZE_INVALID", bytes > MAX_WORKSPACE_UPLOAD_BYTES ? 413 : 400);
  }
}

function normalizeContentType(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
  return cleaned && cleaned !== "." && cleaned !== ".."
    ? cleaned
    : "upload-image";
}

function safeSegment(value: string) {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]/g, "-");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw codedError("UPLOAD_INVALID_REQUEST", 400);
  }
  return cleaned;
}

function requireUuid(value: string | undefined, label: string) {
  const normalized = value?.trim() ?? "";
  if (!UUID_PATTERN.test(normalized)) {
    throw codedError("UPLOAD_INVALID_REQUEST", 400, `Invalid ${label} ID.`);
  }
  return normalized;
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function responseJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) await responseFailure(response, fallback);
  try {
    return (await response.json()) as T;
  } catch {
    throw codedError(fallback, 502);
  }
}

async function responseEmpty(response: Response, fallback: string) {
  if (!response.ok) await responseFailure(response, fallback);
}

async function responseFailure(response: Response, fallback: string): Promise<never> {
  const detail = await response.text().catch(() => "");
  const normalized = detail.toLowerCase();
  if (normalized.includes("upload_already_completed")) {
    throw codedError("UPLOAD_ALREADY_COMPLETED", 409);
  }
  if (normalized.includes("upload_expired")) {
    throw codedError("UPLOAD_INTENT_EXPIRED", 409);
  }
  if (normalized.includes("upload_not_found")) {
    throw codedError("UPLOAD_INTENT_NOT_FOUND", 409);
  }
  if (response.status === 401) throw codedError("AUTH_REQUIRED", 401);
  if (response.status === 403) throw codedError("UPLOAD_NOT_AUTHORIZED", 403);
  if (response.status === 404) {
    throw codedError("ASSET_UPLOAD_GATEWAY_NOT_CONFIGURED", 503);
  }
  if (response.status === 413) throw codedError("UPLOAD_SIZE_INVALID", 413);
  if (response.status === 415) throw codedError("UPLOAD_NOT_IMAGE", 415);
  throw codedError(fallback, response.status >= 500 ? 503 : 422);
}

function codedError(code: string, status: number, message = code) {
  const error = new Error(message) as Error & { code?: string; status?: number };
  error.code = code;
  error.status = status;
  return error;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readUint32(bytes: Uint8Array, offset: number) {
  return (
    byteAt(bytes, offset) * 0x1000000 +
    (byteAt(bytes, offset + 1) << 16) +
    (byteAt(bytes, offset + 2) << 8) +
    byteAt(bytes, offset + 3)
  );
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
  return (
    byteAt(bytes, offset) |
    (byteAt(bytes, offset + 1) << 8) |
    (byteAt(bytes, offset + 2) << 16)
  );
}

function byteAt(bytes: Uint8Array, offset: number) {
  return bytes[offset] ?? 0;
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
