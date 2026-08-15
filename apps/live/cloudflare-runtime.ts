import { createCloudflareEdgeCache, createSqlLiveSiteStore, type CloudflareCacheLike, type LiveQueryDriver, type LiveRuntimeDependencies } from "@micirql/live-runtime";
import type { FunctionBindingResolver, PreparedPage, RendererRegistry } from "@micirql/renderer";
import { configureLiveHostRuntime } from "./live-runtime";

export type CloudflareLiveBindings = {
  sql: LiveQueryDriver;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  cache: CloudflareCacheLike;
  renderPage: (page: PreparedPage) => Promise<string> | string;
  cacheTtlSeconds?: number;
};

export function configureCloudflareLiveRuntime(bindings: CloudflareLiveBindings) {
  const dependencies: LiveRuntimeDependencies = {
    store: createSqlLiveSiteStore(bindings.sql),
    registry: bindings.registry,
    functions: bindings.functions,
    renderPage: bindings.renderPage,
    cache: createCloudflareEdgeCache(bindings.cache),
    cacheTtlSeconds: bindings.cacheTtlSeconds ?? 300,
  };
  configureLiveHostRuntime(dependencies);
  return dependencies;
}
