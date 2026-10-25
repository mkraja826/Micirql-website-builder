import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import {
  createSupabaseWorkspaceUploadGateway,
  inspectUploadedImage,
} from "../apps/builder/app/supabase-upload-gateway";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const SITE_ID = "22222222-2222-4222-8222-222222222222";
const UPLOAD_ID = "33333333-3333-4333-8333-333333333333";
const ASSET_ID = "44444444-4444-4444-8444-444444444444";
const SUPABASE_URL = "https://project.supabase.co";
const OBJECT_KEY = `${WORKSPACE_ID}/incoming/${UPLOAD_ID}/clinic-logo.png`;

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test.beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qa";
});

test.afterEach(() => {
  restore("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
  restore("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalKey);
});

test("creates an RLS-owned intent and returns a signed multipart transfer without exposing the bearer", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("/rest/v1/sites?")) return Response.json([{ id: SITE_ID }]);
    if (url.includes("/storage/v1/object/upload/sign/")) {
      return Response.json({
        url: `/object/upload/sign/workspace-assets/${OBJECT_KEY}?token=signed-upload`,
      });
    }
    if (url.endsWith("/rest/v1/asset_upload_intents")) {
      return new Response(null, { status: 201 });
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const ids = [UPLOAD_ID, ASSET_ID];
  const gateway = createSupabaseWorkspaceUploadGateway(authenticatedRequest(), {
    fetcher,
    now: () => new Date("2026-10-22T10:00:00.000Z"),
    id: () => ids.shift()!,
  });

  const intent = await gateway!.createIntent({
    principal: { userId: "verified-user", workspaceId: WORKSPACE_ID },
    siteId: SITE_ID,
    fileName: "clinic logo.png",
    contentType: "image/png",
    bytes: 24,
    kind: "logo",
  });

  expect(intent).toMatchObject({
    uploadId: UPLOAD_ID,
    assetId: ASSET_ID,
    bodyFormat: "multipart",
    headers: { apikey: "sb_publishable_qa", "x-upsert": "false" },
    expiresAt: "2026-10-22T10:15:00.000Z",
  });
  expect(intent.uploadUrl).toContain("token=signed-upload");
  expect(JSON.stringify(intent)).not.toContain("verified-token");

  const insert = calls.find(({ url }) =>
    url.endsWith("/rest/v1/asset_upload_intents"),
  );
  expect(new Headers(insert?.init?.headers).get("authorization")).toBe(
    "Bearer verified-token",
  );
  expect(JSON.parse(String(insert?.init?.body))).toMatchObject({
    upload_id: UPLOAD_ID,
    asset_id: ASSET_ID,
    workspace_id: WORKSPACE_ID,
    site_id: SITE_ID,
    object_key: OBJECT_KEY,
    content_type: "image/png",
    byte_size: 24,
  });
  expect(intent.uploadUrl).toContain(
    `/workspace-assets/${WORKSPACE_ID}/incoming/`,
  );
});

test("finalizes only after the stored bytes, MIME and real dimensions match the intent", async () => {
  const png = pngHeader(640, 320);
  let rpcBody: Record<string, unknown> | undefined;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/asset_upload_intents?")) {
      return Response.json([intentRow({ byte_size: png.byteLength })]);
    }
    if (url.includes("/rest/v1/sites?")) return Response.json([{ id: SITE_ID }]);
    if (url.includes("/object/authenticated/workspace-assets/")) {
      return new Response(png, {
        headers: {
          "content-type": "image/png",
          "content-length": String(png.byteLength),
        },
      });
    }
    if (url.endsWith("/rest/v1/rpc/finalize_asset_upload")) {
      rpcBody = JSON.parse(String(init?.body));
      return Response.json(assetRow({ width: 640, height: 320 }));
    }
    if (url.includes("/storage/v1/object/sign/workspace-assets/")) {
      return Response.json({
        signedURL: `/object/sign/workspace-assets/${OBJECT_KEY}?token=signed-read`,
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const gateway = createSupabaseWorkspaceUploadGateway(authenticatedRequest(), {
    fetcher,
    now: () => new Date("2026-10-22T10:00:00.000Z"),
  });

  const asset = await gateway!.finalize({
    principal: { userId: "verified-user", workspaceId: WORKSPACE_ID },
    siteId: SITE_ID,
    uploadId: UPLOAD_ID,
    name: "Clinic logo",
    kind: "logo",
  });

  expect(rpcBody).toMatchObject({
    p_upload_id: UPLOAD_ID,
    p_kind: "logo",
    p_width: 640,
    p_height: 320,
    p_source: "user-upload",
    p_license: "user-owned",
    p_tags: ["upload", "brand", "logo"],
  });
  expect(asset).toMatchObject({
    id: ASSET_ID,
    workspaceId: WORKSPACE_ID,
    kind: "logo",
    width: 640,
    height: 320,
  });
  expect(asset.originalUrl).toContain("token=signed-read");
});

test("fails closed before the finalize RPC when Storage bytes do not match the intent", async () => {
  const png = pngHeader(640, 320);
  let finalized = false;
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/asset_upload_intents?")) {
      return Response.json([intentRow({ byte_size: png.byteLength + 1 })]);
    }
    if (url.includes("/rest/v1/sites?")) return Response.json([{ id: SITE_ID }]);
    if (url.includes("/object/authenticated/workspace-assets/")) {
      return new Response(png, { headers: { "content-type": "image/png" } });
    }
    if (url.includes("finalize_asset_upload")) finalized = true;
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const gateway = createSupabaseWorkspaceUploadGateway(authenticatedRequest(), {
    fetcher,
    now: () => new Date("2026-10-22T10:00:00.000Z"),
  });

  await expect(
    gateway!.finalize({
      principal: { userId: "verified-user", workspaceId: WORKSPACE_ID },
      siteId: SITE_ID,
      uploadId: UPLOAD_ID,
      kind: "logo",
    }),
  ).rejects.toMatchObject({ code: "UPLOAD_SIZE_MISMATCH", status: 413 });
  expect(finalized).toBe(false);
});

test("a completed intent retries idempotently using only its exact asset ID and workspace", async () => {
  let downloaded = false;
  let finalized = false;
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/asset_upload_intents?")) {
      return Response.json([
        intentRow({ completed_at: "2026-10-22T10:02:00.000Z" }),
      ]);
    }
    if (url.includes("/rest/v1/sites?")) return Response.json([{ id: SITE_ID }]);
    if (url.includes("/rest/v1/assets?")) {
      expect(url).toContain(`id=eq.${ASSET_ID}`);
      return Response.json([assetRow({ width: 640, height: 320 })]);
    }
    if (url.includes("/storage/v1/object/sign/workspace-assets/")) {
      return Response.json({ signedURL: "/object/sign/read?token=retry" });
    }
    if (url.includes("/object/authenticated/")) downloaded = true;
    if (url.includes("finalize_asset_upload")) finalized = true;
    throw new Error(`Unexpected request: ${url}`);
  }) as typeof fetch;
  const gateway = createSupabaseWorkspaceUploadGateway(authenticatedRequest(), {
    fetcher,
  });
  const asset = await gateway!.finalize({
    principal: { userId: "verified-user", workspaceId: WORKSPACE_ID },
    siteId: SITE_ID,
    uploadId: UPLOAD_ID,
    kind: "logo",
  });

  expect(asset.id).toBe(ASSET_ID);
  expect(asset.originalUrl).toContain("token=retry");
  expect(downloaded).toBe(false);
  expect(finalized).toBe(false);
});

test("inspects actual image bytes and rejects active SVG content", () => {
  expect(inspectUploadedImage(pngHeader(1200, 400), "image/png")).toEqual({
    width: 1200,
    height: 400,
  });
  const unsafe = new TextEncoder().encode(
    '<svg viewBox="0 0 100 20"><script>alert(1)</script></svg>',
  );
  expect(() => inspectUploadedImage(unsafe, "image/svg+xml")).toThrow(
    "UPLOAD_PROCESSING_FAILED",
  );
});

function authenticatedRequest() {
  return new NextRequest("https://builder.micirql.test/api/assets/upload/intent", {
    headers: { authorization: "Bearer verified-token" },
  });
}

function intentRow(overrides: Record<string, unknown> = {}) {
  return {
    upload_id: UPLOAD_ID,
    asset_id: ASSET_ID,
    workspace_id: WORKSPACE_ID,
    site_id: SITE_ID,
    file_name: "clinic-logo.png",
    content_type: "image/png",
    byte_size: 24,
    object_key: OBJECT_KEY,
    expires_at: "2026-10-22T10:15:00.000Z",
    completed_at: null,
    ...overrides,
  };
}

function assetRow({ width, height }: { width: number; height: number }) {
  return {
    id: ASSET_ID,
    workspace_id: WORKSPACE_ID,
    source: "user-upload",
    kind: "logo",
    name: "Clinic logo",
    alt: "",
    width,
    height,
    orientation: width / height >= 2 ? "panoramic" : "landscape",
    aspect_ratio: width / height,
    focal_x: 0.5,
    focal_y: 0.5,
    dominant_tone: null,
    domains: [],
    subtypes: [],
    section_families: [],
    themes: [],
    tags: ["upload", "brand", "logo"],
    license: "user-owned",
    source_reference: OBJECT_KEY,
    original_url: "",
    variants: [],
    active: true,
    created_at: "2026-10-22T10:00:00.000Z",
    storage_provider: "supabase",
    original_storage_key: OBJECT_KEY,
    deleted_at: null,
  };
}

function pngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  writeUint32(bytes, 16, width);
  writeUint32(bytes, 20, height);
  return bytes;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
