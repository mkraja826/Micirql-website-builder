import { NextRequest } from "next/server";
import { getPublishRuntime } from "../../../publish-runtime";
import {
  authorizeSavedSite,
  PublishApiError,
  publishErrorResponse,
} from "../authorization";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      workspaceId?: unknown;
      siteId?: unknown;
      targetVersionId?: unknown;
    };
    const workspaceId = stringValue(body.workspaceId);
    const siteId = stringValue(body.siteId);
    const targetVersionId = stringValue(body.targetVersionId);
    if (!workspaceId || !siteId || !targetVersionId) {
      throw new PublishApiError(
        400,
        "INVALID_ROLLBACK",
        "workspaceId, siteId and targetVersionId are required.",
      );
    }

    await authorizeSavedSite(request, { workspaceId, siteId });

    const runtime = getPublishRuntime();
    if (!runtime) {
      throw new PublishApiError(
        503,
        "PUBLISH_RUNTIME_NOT_CONFIGURED",
        "Configure the production publisher with a server-only Supabase secret/service-role credential authorized to execute public.rollback_site_version(uuid, text). The authenticated browser role is intentionally not authorized for this RPC.",
      );
    }
    const result = await runtime.rollback({ siteId, targetVersionId });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return publishErrorResponse(error, "ROLLBACK_FAILED", "Rollback failed.");
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
