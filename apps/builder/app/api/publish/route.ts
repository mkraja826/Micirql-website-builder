import { NextRequest } from "next/server";
import { siteSchema, type Site } from "@micirql/schema";
import { getPublishRuntime } from "../../publish-runtime";
import {
  assertExactSavedRevision,
  assertPremiumGate,
  authorizeSavedSite,
  PublishApiError,
  publishErrorResponse,
} from "./authorization";

type PublishRequest = {
  workspaceId?: unknown;
  siteId?: unknown;
  expectedRevision?: unknown;
  site?: unknown;
  // Kept in the input type only so older clients remain parse-compatible.
  // The server intentionally never reads this value.
  createdBy?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PublishRequest;
    let clientSite: Site | undefined;
    if (body.site !== undefined) {
      const parsed = siteSchema.safeParse(body.site);
      if (!parsed.success) {
        throw new PublishApiError(
          400,
          "INVALID_DRAFT",
          "The draft failed Site Schema validation.",
        );
      }
      clientSite = parsed.data;
    }

    const workspaceId =
      stringValue(body.workspaceId) ?? clientSite?.workspaceId;
    const siteId = stringValue(body.siteId) ?? clientSite?.siteId;
    if (!workspaceId || !siteId) {
      throw new PublishApiError(
        400,
        "INVALID_PUBLISH_REQUEST",
        "workspaceId and siteId are required.",
      );
    }

    const authorization = await authorizeSavedSite(request, {
      workspaceId,
      siteId,
    });
    assertExactSavedRevision(authorization.draft, {
      expectedRevision: body.expectedRevision,
      ...(clientSite ? { clientSite } : {}),
    });
    assertPremiumGate(authorization.draft.snapshot);

    const runtime = getPublishRuntime();
    if (!runtime) {
      throw new PublishApiError(
        503,
        "PUBLISH_RUNTIME_NOT_CONFIGURED",
        "Configure the production publisher with a server-only Supabase secret/service-role credential authorized to execute public.publish_site_version(text, uuid, jsonb, text, text). The authenticated browser role is intentionally not authorized for this RPC.",
      );
    }

    const result = await runtime.publish({
      site: authorization.draft.snapshot,
      createdBy: authorization.userId,
    });
    return Response.json(result, { status: result.ok ? 201 : 422 });
  } catch (error) {
    return publishErrorResponse(error, "PUBLISH_FAILED", "Publish failed.");
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
