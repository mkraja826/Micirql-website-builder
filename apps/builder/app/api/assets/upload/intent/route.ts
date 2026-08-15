import { productionUploadGateway, requestPrincipal } from "../../../../upload-runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { workspaceId?: string; siteId?: string; fileName?: string; contentType?: string; bytes?: number };
    if (!body.workspaceId || !body.fileName || !body.contentType || !body.bytes) {
      return Response.json({ error: "workspaceId, fileName, contentType and bytes are required." }, { status: 400 });
    }

    const gateway = productionUploadGateway();
    if (!gateway) {
      if (process.env.NODE_ENV !== "production") {
        return Response.json({ error: "Production object storage is not configured in development.", developmentFallback: true }, { status: 503 });
      }
      return Response.json({ error: "ASSET_UPLOAD_GATEWAY_NOT_CONFIGURED" }, { status: 503 });
    }

    const principal = requestPrincipal(request, body.workspaceId);
    if (!principal) return Response.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const intent = await gateway.createIntent({
      principal,
      ...(body.siteId ? { siteId: body.siteId } : {}),
      fileName: body.fileName,
      contentType: body.contentType,
      bytes: body.bytes,
    });
    return Response.json(intent, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UPLOAD_INTENT_FAILED" }, { status: 400 });
  }
}
