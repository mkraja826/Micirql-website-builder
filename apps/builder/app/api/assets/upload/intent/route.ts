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
      fileName?: string;
      contentType?: string;
      bytes?: number;
      kind?: "image" | "logo";
    };
    if (
      !body.workspaceId ||
      !body.siteId ||
      !body.fileName ||
      !body.contentType ||
      !body.bytes
    ) {
      const failure = workspaceUploadFailure("UPLOAD_INVALID_REQUEST");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const gateway =
      productionUploadGateway() ??
      createSupabaseWorkspaceUploadGateway(request);
    if (!gateway) {
      if (process.env.NODE_ENV !== "production") {
        const failure = workspaceUploadFailure("UPLOAD_SERVICE_UNAVAILABLE");
        return Response.json(
          { ...uploadErrorPayload(failure), developmentFallback: true },
          { status: failure.status },
        );
      }
      const failure = workspaceUploadFailure("UPLOAD_SERVICE_UNAVAILABLE");
      return Response.json(uploadErrorPayload(failure), {
        status: failure.status,
      });
    }

    const userId = await verifiedAuthenticatedUserId(request);
    const principal = { userId, workspaceId: body.workspaceId };

    const intent = await gateway.createIntent({
      principal,
      siteId: body.siteId,
      fileName: body.fileName,
      contentType: body.contentType,
      bytes: body.bytes,
      kind: body.kind === "logo" ? "logo" : "image",
    });
    return Response.json(intent, { status: 201 });
  } catch (error) {
    const failure = normalizeWorkspaceUploadFailure(error);
    return Response.json(uploadErrorPayload(failure), {
      status: failure.status,
    });
  }
}
