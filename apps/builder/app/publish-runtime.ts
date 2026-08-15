import { createProductionPublishRuntime, defaultLiveUrl, type LiveUrlResolver, type PublishingQueryDriver, type PublishDraft, type PublishResult } from "@micirql/publisher";
import type { DomainActivator, PublishCache } from "@micirql/publisher";
import type { FunctionBindingResolver, RendererRegistry } from "@micirql/renderer";

export type PublishRuntime = {
  publish(draft: PublishDraft): Promise<PublishResult & { liveUrl?: string }>;
  rollback(args: { siteId: string; targetVersionId: string }): Promise<PublishResult & { liveUrl?: string }>;
};

export type ProductionPublishBindings = {
  db: PublishingQueryDriver;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  domains?: DomainActivator;
  cache?: PublishCache;
  liveUrls?: LiveUrlResolver;
};

let runtime: PublishRuntime | undefined;

export function configurePublishRuntime(next: PublishRuntime) {
  runtime = next;
}

export function configureProductionPublishRuntime(bindings: ProductionPublishBindings) {
  const liveUrls = bindings.liveUrls ?? {
    forSite: defaultLiveUrl,
    async forSiteId(siteId: string) {
      const row = await bindings.db.one<{ snapshot: Parameters<typeof defaultLiveUrl>[0] }>(
        `select snapshot from site_versions where site_id = $1 and status = 'published' order by version_number desc limit 1`,
        [siteId],
      );
      return row ? defaultLiveUrl(row.snapshot) : undefined;
    },
  };

  runtime = createProductionPublishRuntime({
    db: bindings.db,
    registry: bindings.registry,
    functions: bindings.functions,
    liveUrls,
    ...(bindings.domains ? { domains: bindings.domains } : {}),
    ...(bindings.cache ? { cache: bindings.cache } : {}),
  });
  return runtime;
}

export function getPublishRuntime(): PublishRuntime | undefined {
  return runtime;
}
