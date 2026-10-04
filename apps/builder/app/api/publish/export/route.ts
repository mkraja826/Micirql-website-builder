import { NextRequest } from "next/server";
import {
  authorizeSavedSite,
  PublishApiError,
  publishErrorResponse,
} from "../authorization";
import {
  buildPortableExport,
  buildStaticProject,
  createStoredZip,
} from "../export-utils";
import { getExportablePublishedVersion } from "../published-version";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const workspaceId = value(request.nextUrl.searchParams.get("workspaceId"));
    const siteId = value(request.nextUrl.searchParams.get("siteId"));
    const versionId = value(request.nextUrl.searchParams.get("versionId"));
    const format =
      value(request.nextUrl.searchParams.get("format")) ?? "portable";
    if (!workspaceId || !siteId || !versionId) {
      throw new PublishApiError(
        400,
        "INVALID_EXPORT_REQUEST",
        "workspaceId, siteId and versionId are required.",
      );
    }
    if (format !== "portable" && format !== "static") {
      throw new PublishApiError(
        400,
        "INVALID_EXPORT_FORMAT",
        "format must be portable or static.",
      );
    }

    await authorizeSavedSite(request, { workspaceId, siteId });
    const published = await getExportablePublishedVersion({
      workspaceId,
      siteId,
      versionId,
    });
    const fileStem = safeFileStem(published.snapshot.name);

    if (format === "portable") {
      const body = JSON.stringify(buildPortableExport(published), null, 2);
      return new Response(body, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${fileStem}-${safeFileStem(versionId)}.micirql.json"`,
          "cache-control": "private, no-store",
          "x-content-type-options": "nosniff",
          "x-micirql-version": versionId,
          "x-micirql-snapshot-sha256": published.snapshotHash,
        },
      });
    }

    const files = await buildStaticProject({
      published,
      requestOrigin: request.nextUrl.origin,
      ...(process.env.MICIRQL_PUBLIC_FUNCTIONS_ORIGIN
        ? { publicFunctionsOrigin: process.env.MICIRQL_PUBLIC_FUNCTIONS_ORIGIN }
        : {}),
      allowedAssetHosts: (process.env.MICIRQL_ASSET_EXPORT_HOSTS ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
    });
    const zip = createStoredZip(files);
    const body = zip.buffer.slice(
      zip.byteOffset,
      zip.byteOffset + zip.byteLength,
    ) as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${fileStem}-${safeFileStem(versionId)}-static.zip"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-micirql-version": versionId,
        "x-micirql-snapshot-sha256": published.snapshotHash,
      },
    });
  } catch (error) {
    return publishErrorResponse(error, "EXPORT_FAILED", "Export failed.");
  }
}

function value(input: string | null): string | undefined {
  return input?.trim() || undefined;
}

function safeFileStem(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "micirql-site"
  );
}
