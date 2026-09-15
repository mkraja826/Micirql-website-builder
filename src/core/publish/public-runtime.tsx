import type { ReactNode } from "react";
import type { SitePersistenceRepository } from "../persistence/repository";
import type { PublishedDurableSiteRecord } from "../persistence/schema";
import { renderPublishedSnapshot } from "./renderer";
import type { PublishedSiteRuntime } from "./runtime";

export type PublicSiteRenderInput = {
  siteId: string;
  pageSlug?: string;
};

export type PublicSiteRenderResult = {
  site: PublishedDurableSiteRecord;
  runtime: PublishedSiteRuntime;
  pageSlug: string;
  node: ReactNode;
};

function normalizePageSlug(value: string | undefined) {
  const slug = (value ?? "home").trim().replace(/^\/+|\/+$/g, "");
  return slug || "home";
}

function buildRuntime(site: PublishedDurableSiteRecord): PublishedSiteRuntime {
  if (site.versionId !== site.publishedVersionId) {
    throw new Error("Public runtime refused a revision that is not the active published version.");
  }

  return {
    dbSiteId: site.dbSiteId,
    status: "published",
    publishedVersionId: site.publishedVersionId,
    renderedVersionId: site.versionId,
    capabilities: site.snapshot.snapshot.capabilities.map((capability) => ({
      id: capability.id,
      state: capability.state,
    })),
  };
}

/**
 * Canonical public-site boundary.
 *
 * Visitor requests may only load the active immutable published revision and
 * pass its persisted snapshot directly to the canonical snapshot renderer.
 * No generation, candidate ranking, AI provider, media provider, or repair
 * service belongs on this path.
 */
export async function renderPublicSite(
  repository: SitePersistenceRepository,
  input: PublicSiteRenderInput,
): Promise<PublicSiteRenderResult | null> {
  const siteId = input.siteId.trim();
  if (!siteId) return null;

  const site = await repository.loadPublished({ siteId });
  if (!site) return null;

  const runtime = buildRuntime(site);
  const pageSlug = normalizePageSlug(input.pageSlug);
  const node = renderPublishedSnapshot({
    snapshot: site.snapshot,
    runtime,
    pageSlug,
  });

  return { site, runtime, pageSlug, node };
}
