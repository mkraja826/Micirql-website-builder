import { siteSchema } from "@micirql/schema";
import { getPublishRuntime } from "../../publish-runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { site?: unknown; createdBy?: string };
    const parsed = siteSchema.safeParse(body.site);
    if (!parsed.success) {
      return Response.json({ ok: false, issues: [{ code: "INVALID_DRAFT", message: "The draft failed Site Schema validation." }] }, { status: 400 });
    }

    const runtime = getPublishRuntime();
    if (!runtime) {
      return Response.json({
        ok: false,
        issues: [{ code: "PUBLISH_RUNTIME_NOT_CONFIGURED", message: "Production publishing adapters are not configured yet." }],
      }, { status: 503 });
    }

    const result = await runtime.publish({ site: parsed.data, createdBy: body.createdBy?.trim() || "workspace-user" });
    return Response.json(result, { status: result.ok ? 201 : 422 });
  } catch (error) {
    return Response.json({ ok: false, issues: [{ code: "PUBLISH_FAILED", message: error instanceof Error ? error.message : "Publish failed." }] }, { status: 500 });
  }
}
