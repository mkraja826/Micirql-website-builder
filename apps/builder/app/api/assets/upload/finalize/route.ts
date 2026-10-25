import type { NextRequest } from "next/server";
import { productionUploadGateway } from "../../../../upload-runtime";
import { createSupabaseWorkspaceUploadGateway } from "../../../../supabase-upload-gateway";
import { verifiedAuthenticatedUserId } from "../../../publish/authorization";
import {
  normalizeWorkspaceUploadFailure,
  uploadErrorPayload,
  workspaceUploadFailure,
} from "../../../../upload-errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workspaceId?: string;
      siteId?: string;
      uploadId?: string;
      name?: string;
      alt?: string;
      kind?: "image" | "logo";
    };
    if (!body.workspaceId || !body.siteId || !body.uploadId) {
      const failure = workspaceUploadFailure("UPLOAD_INVALID_REQUEST");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const gateway =
      productionUploadGateway() ??
      createSupabaseWorkspaceUploadGateway(request);
    if (!gateway) {
      const failure = workspaceUploadFailure("UPLOAD_SERVICE_UNAVAILABLE");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const userId = await verifiedAuthenticatedUserId(request);
    const principal = { userId, workspaceId: body.workspaceId };

    const asset = await gateway.finalize({
      principal,
      uploadId: body.uploadId,
      siteId: body.siteId,
      ...(body.name ? { name: body.name } : {}),
      ...(body.alt ? { alt: body.alt } : {}),
      kind: body.kind === "logo" ? "logo" : "image",
    });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    const failure = normalizeWorkspaceUploadFailure(
      error,
      "UPLOAD_PROCESSING_FAILED",
    );
    return Response.json(uploadErrorPayload(failure), {
      status: failure.status,
    });
  }
}
