import { siteSchema, type Site } from "@micirql/schema";
import { supabaseConfig } from "../drafts/supabase-store";
import { PublishApiError } from "./authorization";

export type ExportablePublishedVersion = {
  siteId: string;
  versionId: string;
  snapshot: Site;
  snapshotHash: string;
};

type LivePublishedRow = {
  site_id?: unknown;
  version_id?: unknown;
  snapshot?: unknown;
  snapshot_hash?: unknown;
};

export async function getExportablePublishedVersion(input: {
  workspaceId: string;
  siteId: string;
  versionId: string;
}): Promise<ExportablePublishedVersion> {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/get_live_published_site`, {
    method: "POST",
    headers: {
      apikey: key,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ p_site_id: input.siteId }),
    cache: "no-store",
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new PublishApiError(
        503,
        "PUBLISHED_VERSION_RPC_AUTHORIZATION_REQUIRED",
        "The builder runtime credential must be authorized to execute the existing public.get_live_published_site(uuid) RPC. Keep the RPC read-only and do not expose site_versions directly.",
      );
    }
    if (status === 404) {
      throw new PublishApiError(
        503,
        "PUBLISHED_VERSION_RPC_NOT_CONFIGURED",
        "The existing public.get_live_published_site(uuid) RPC must be deployed before immutable published-version exports can run.",
      );
    }
    throw new PublishApiError(
      502,
      "PUBLISHED_VERSION_LOOKUP_FAILED",
      `Published-version lookup failed (${status}).`,
    );
  }

  const payload = (await response.json()) as
    LivePublishedRow[] | LivePublishedRow;
  const row = Array.isArray(payload) ? payload[0] : payload;
  const siteId = stringValue(row?.site_id);
  const versionId = stringValue(row?.version_id);
  if (!row || !siteId || !versionId) {
    throw new PublishApiError(
      404,
      "PUBLISHED_VERSION_NOT_FOUND",
      "No published version exists for this site.",
    );
  }
  if (siteId !== input.siteId || versionId !== input.versionId) {
    throw new PublishApiError(
      409,
      "PUBLISHED_VERSION_MISMATCH",
      "The requested version is not the site's currently published immutable version.",
    );
  }

  const parsed = siteSchema.safeParse(row.snapshot);
  if (
    !parsed.success ||
    parsed.data.siteId !== input.siteId ||
    parsed.data.workspaceId !== input.workspaceId
  ) {
    throw new PublishApiError(
      500,
      "INVALID_PUBLISHED_SNAPSHOT",
      "The published snapshot failed identity or Site Schema validation.",
    );
  }

  const declaredHash = stringValue(row.snapshot_hash);
  const snapshotHash = declaredHash ?? (await hashSnapshot(parsed.data));
  return { siteId, versionId, snapshot: parsed.data, snapshotHash };
}

async function hashSnapshot(snapshot: Site): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalJson(snapshot)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
