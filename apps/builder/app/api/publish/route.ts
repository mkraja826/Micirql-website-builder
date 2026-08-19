import { evaluateWebsiteContent, validateWebsite } from "@micirql/design-engine";
import { siteSchema, type Site } from "@micirql/schema";
import { getPublishRuntime } from "../../publish-runtime";

const MIN_PUBLISH_CONTENT_SCORE = 82;

export async function POST(request: Request) {
  try {
    const body = await request.json() as { site?: unknown; createdBy?: string; archetypeId?: string };
    const parsed = siteSchema.safeParse(body.site);
    if (!parsed.success) {
      return Response.json({ ok: false, issues: [{ code: "INVALID_DRAFT", message: "The draft failed Site Schema validation." }] }, { status: 400 });
    }

    const contentQuality = evaluateWebsiteContent(parsed.data);
    const contentErrors = contentQuality.issues.filter((issue) => issue.severity === "error");
    if (contentErrors.length || contentQuality.score < MIN_PUBLISH_CONTENT_SCORE) {
      return Response.json({
        ok: false,
        code: "CONTENT_QUALITY_NOT_READY",
        contentQuality,
        issues: contentErrors.length
          ? contentErrors
          : [{
              code: "CONTENT_QUALITY_SCORE_LOW",
              severity: "error",
              message: `Content quality score ${contentQuality.score} is below the publish minimum of ${MIN_PUBLISH_CONTENT_SCORE}.`,
            }],
      }, { status: 422 });
    }

    const archetypeId = body.archetypeId?.trim() || inferArchetype(parsed.data);
    const readiness = validateWebsite(parsed.data, archetypeId);
    if (!readiness.ready) {
      return Response.json({
        ok: false,
        code: "WEBSITE_NOT_READY",
        readiness,
        contentQuality,
        issues: readiness.errors,
      }, { status: 422 });
    }

    const runtime = getPublishRuntime();
    if (!runtime) {
      return Response.json({
        ok: false,
        issues: [{ code: "PUBLISH_RUNTIME_NOT_CONFIGURED", message: "Production publishing adapters are not configured yet." }],
      }, { status: 503 });
    }

    const result = await runtime.publish({ site: parsed.data, createdBy: body.createdBy?.trim() || "workspace-user" });
    return Response.json({ ...result, readiness, contentQuality }, { status: result.ok ? 201 : 422 });
  } catch (error) {
    return Response.json({ ok: false, issues: [{ code: "PUBLISH_FAILED", message: error instanceof Error ? error.message : "Publish failed." }] }, { status: 500 });
  }
}

function inferArchetype(site: Site): string {
  const text = `${site.subtype ?? ""} ${site.name}`.toLowerCase();
  if (/dental|clinic|medical|health|physio|diagnostic/.test(text)) return "healthcare-clinic";
  if (/restaurant|cafe|hotel|resort|hospitality/.test(text)) return "hospitality";
  if (/real estate|property|builder|broker/.test(text)) return "real-estate";
  if (/ecommerce|e-commerce|retail|store|shop|boutique/.test(text)) return "ecommerce";
  if (/saas|software|technology|tech|app|platform/.test(text)) return "saas-technology";
  if (/portfolio|creative|design|architect|photograph|studio/.test(text)) return "portfolio-creative";
  if (/education|training|academy|course|school|tutor/.test(text)) return "education-training";
  if (/manufactur|industrial|enterprise|corporate/.test(text)) return "corporate-company";
  if (/consult|legal|law|account|agency|professional|it service/.test(text)) return "professional-services";
  return "local-service";
}
