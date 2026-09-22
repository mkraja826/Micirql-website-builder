import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { emitOperationalEvent, getOperationalRequestId } from "../../../../src/core/observability/operational-events";
import { createPublishedSiteRepository } from "../../../../src/core/persistence/server";
import { renderPublicSite } from "../../../../src/core/publish/public-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublishedSitePageProps = {
  params: Promise<{
    siteId: string;
    slug?: string[];
  }>;
};

export default async function PublishedSitePage({ params }: PublishedSitePageProps) {
  const { siteId, slug } = await params;
  const requestHeaders = await headers();
  const requestId = getOperationalRequestId(requestHeaders);
  const startedAt = Date.now();
  const pageSlug = slug?.join("/") || "home";

  let rendered: Awaited<ReturnType<typeof renderPublicSite>>;
  try {
    const repository = createPublishedSiteRepository();
    rendered = await renderPublicSite(repository, { siteId, pageSlug });
  } catch {
    emitOperationalEvent({
      requestId,
      operation: "published_site.render",
      outcome: "failure",
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      siteId,
      failureCode: "published_site_load_failed",
    });
    throw new Error("Published site could not be rendered.");
  }

  if (!rendered || rendered.node == null) {
    emitOperationalEvent({
      requestId,
      operation: "published_site.render",
      outcome: "not_found",
      statusCode: 404,
      durationMs: Date.now() - startedAt,
      siteId,
      failureCode: "published_site_not_found",
    });
    notFound();
  }

  emitOperationalEvent({
    requestId,
    operation: "published_site.render",
    outcome: "success",
    statusCode: 200,
    durationMs: Date.now() - startedAt,
    siteId: rendered.site.dbSiteId,
    versionId: rendered.site.publishedVersionId,
  });
  return rendered.node;
}
