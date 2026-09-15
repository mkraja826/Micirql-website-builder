import { notFound } from "next/navigation";
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
  const repository = createPublishedSiteRepository();
  const pageSlug = slug?.join("/") || "home";
  const rendered = await renderPublicSite(repository, { siteId, pageSlug });

  if (!rendered || rendered.node == null) notFound();

  return rendered.node;
}
