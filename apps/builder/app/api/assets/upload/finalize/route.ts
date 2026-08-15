import { productionUploadGateway, requestPrincipal } from "../../../../upload-runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { workspaceId?: string; uploadId?: string; name?: string };
    if (!body.workspaceId || !body.uploadId) {
      return Response.json({ error: "workspaceId and uploadId are required." }, { status: 400 });
    }

    const gateway = productionUploadGateway();
    if (!gateway) return Response.json({ error: "ASSET_UPLOAD_GATEWAY_NOT_CONFIGURED" }, { status: 503 });

    const principal = requestPrincipal(request, body.workspaceId);
    if (!principal) return Response.json({ error: "AUTHENTICATION_REQUIRED" }, { status: 401 });

    const asset = await gateway.finalize({ principal, uploadId: body.uploadId, ...(body.name ? { name: body.name } : {}) });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UPLOAD_FINALIZE_FAILED" }, { status: 400 });
  }
}
