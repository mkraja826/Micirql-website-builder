import { getPublishRuntime } from "../../../publish-runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { siteId?: string; targetVersionId?: string };
    if (!body.siteId?.trim() || !body.targetVersionId?.trim()) {
      return Response.json({ ok: false, issues: [{ code: "INVALID_ROLLBACK", message: "siteId and targetVersionId are required." }] }, { status: 400 });
    }
    const runtime = getPublishRuntime();
    if (!runtime) {
      return Response.json({ ok: false, issues: [{ code: "PUBLISH_RUNTIME_NOT_CONFIGURED", message: "Production publishing adapters are not configured yet." }] }, { status: 503 });
    }
    const result = await runtime.rollback({ siteId: body.siteId, targetVersionId: body.targetVersionId });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return Response.json({ ok: false, issues: [{ code: "ROLLBACK_FAILED", message: error instanceof Error ? error.message : "Rollback failed." }] }, { status: 500 });
  }
}
