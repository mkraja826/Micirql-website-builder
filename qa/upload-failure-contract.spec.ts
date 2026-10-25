import { expect, test } from "@playwright/test";
import type { UploadGateway } from "@micirql/assets";
import { NextRequest } from "next/server";
import { POST as finalizeUpload } from "../apps/builder/app/api/assets/upload/finalize/route";
import { POST as createUploadIntent } from "../apps/builder/app/api/assets/upload/intent/route";
import {
  MAX_WORKSPACE_UPLOAD_BYTES,
  normalizeWorkspaceUploadFailure,
  validateWorkspaceUpload,
  WorkspaceUploadError,
} from "../apps/builder/app/upload-errors";
import { uploadWorkspaceImage } from "../apps/builder/app/upload-client";
import { configureUploadGateway } from "../apps/builder/app/upload-runtime";

test.describe.configure({ mode: "serial" });

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

test.beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.micirql.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "qa-publishable-key";
});

test.afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", ORIGINAL_SUPABASE_URL);
  restoreEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ORIGINAL_SUPABASE_KEY);
});

test("rejects empty, oversized and unsupported files before any network request", async () => {
  expect(validateWorkspaceUpload(fileLike(0, "image/png"), "logo")?.code).toBe(
    "UPLOAD_FILE_EMPTY",
  );
  expect(
    validateWorkspaceUpload(
      fileLike(MAX_WORKSPACE_UPLOAD_BYTES + 1, "image/png"),
      "logo",
    )?.code,
  ).toBe("UPLOAD_TOO_LARGE");
  expect(
    validateWorkspaceUpload(fileLike(100, "application/pdf"), "logo")?.code,
  ).toBe("UPLOAD_UNSUPPORTED_TYPE");

  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("must not run");
  };
  await expect(
    uploadWorkspaceImage({
      workspaceId: "workspace-qa",
      siteId: "site-qa",
      file: namedFileLike(100, "application/pdf", "clinic-logo.pdf"),
      kind: "logo",
    }),
  ).rejects.toMatchObject({
    code: "UPLOAD_UNSUPPORTED_TYPE",
    retryable: false,
  });
  expect(fetches).toBe(0);
});

test("maps transport and internal gateway failures to stable customer-safe errors", async () => {
  globalThis.fetch = async () => {
    throw new Error("socket details must not reach the customer");
  };
  await expect(
    uploadWorkspaceImage({
      workspaceId: "workspace-qa",
      siteId: "site-qa",
      file: namedFileLike(100, "image/png", "clinic-logo.png"),
      kind: "logo",
    }),
  ).rejects.toEqual(
    expect.objectContaining({
      code: "UPLOAD_NETWORK_FAILED",
      message:
        "We could not reach the upload service. Check your connection and try again.",
      retryable: true,
    }),
  );

  const processing = normalizeWorkspaceUploadFailure(
    new Error(
      "Asset ingestion failed at inspection: private decoder stack trace",
    ),
  );
  expect(processing).toEqual({
    code: "UPLOAD_PROCESSING_FAILED",
    message:
      "We could not process this image. Try another exported copy of the file.",
    retryable: false,
    status: 422,
  });
});

test("intent and finalize use the verified bearer identity and ignore a spoofed user header", async () => {
  const principals: Array<{ userId: string; workspaceId: string }> = [];
  configureUploadGateway(
    gatewayStub({
      onPrincipal: (principal) => principals.push(principal),
    }),
  );
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe("https://auth.micirql.test/auth/v1/user");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer verified-token",
    );
    return Response.json({ id: "verified-user" });
  };

  const intentResponse = await createUploadIntent(
    nextRequest("/api/assets/upload/intent", {
      workspaceId: "workspace-qa",
      siteId: "site-qa",
      fileName: "clinic-logo.png",
      contentType: "image/png",
      bytes: 100,
    }),
  );
  expect(intentResponse.status).toBe(201);
  expect(await intentResponse.json()).toMatchObject({
    uploadId: "upload-qa",
    assetId: "asset-qa",
  });

  const finalizeResponse = await finalizeUpload(
    nextRequest("/api/assets/upload/finalize", {
      workspaceId: "workspace-qa",
      siteId: "site-qa",
      uploadId: "upload-qa",
      name: "clinic-logo.png",
    }),
  );
  expect(finalizeResponse.status).toBe(201);
  expect(principals).toEqual([
    { userId: "verified-user", workspaceId: "workspace-qa" },
    { userId: "verified-user", workspaceId: "workspace-qa" },
  ]);
});

test("invalid sessions fail closed with a stable contract before the gateway runs", async () => {
  let gatewayCalls = 0;
  configureUploadGateway(
    gatewayStub({
      onPrincipal: () => {
        gatewayCalls += 1;
      },
    }),
  );
  globalThis.fetch = async () =>
    Response.json({ message: "invalid jwt details" }, { status: 401 });

  const response = await createUploadIntent(
    nextRequest("/api/assets/upload/intent", {
      workspaceId: "workspace-qa",
      siteId: "site-qa",
      fileName: "clinic-logo.png",
      contentType: "image/png",
      bytes: 100,
    }),
  );
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    ok: false,
    code: "UPLOAD_AUTH_REQUIRED",
    error: "Your session expired. Sign in again before uploading.",
    message: "Your session expired. Sign in again before uploading.",
    retryable: false,
  });
  expect(gatewayCalls).toBe(0);
});

function nextRequest(path: string, body: object) {
  return new NextRequest(`http://builder.micirql.test${path}`, {
    method: "POST",
    headers: {
      authorization: "Bearer verified-token",
      "content-type": "application/json",
      "x-micirql-user-id": "spoofed-browser-user",
    },
    body: JSON.stringify(body),
  });
}

function gatewayStub({
  onPrincipal,
}: {
  onPrincipal(principal: { userId: string; workspaceId: string }): void;
}): UploadGateway {
  return {
    async createIntent({ principal }) {
      onPrincipal(principal);
      return {
        uploadId: "upload-qa",
        assetId: "asset-qa",
        uploadUrl: "https://uploads.micirql.test/upload-qa",
        headers: { "content-type": "image/png" },
        expiresAt: "2026-10-22T12:00:00.000Z",
      };
    },
    async finalize({ principal }) {
      onPrincipal(principal);
      return {
        id: "asset-qa",
        workspaceId: principal.workspaceId,
        source: "user-upload",
        kind: "logo",
        name: "clinic-logo.png",
        alt: "",
        width: 400,
        height: 120,
        orientation: "panoramic",
        aspectRatio: 10 / 3,
        focalPoint: { x: 0.5, y: 0.5 },
        domains: [],
        subtypes: [],
        sectionFamilies: [],
        themes: [],
        tags: ["upload"],
        license: "user-owned",
        originalUrl: "https://cdn.micirql.test/asset-qa.png",
        variants: [],
        active: true,
        createdAt: "2026-10-22T10:00:00.000Z",
      };
    },
  };
}

function fileLike(size: number, type: string) {
  return { size, type } as Pick<File, "size" | "type">;
}

function namedFileLike(size: number, type: string, name: string) {
  return { size, type, name } as File;
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
