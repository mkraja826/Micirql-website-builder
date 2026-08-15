import { createCloudflareEdgeCache, createSqlLiveSiteStore, type CloudflareCacheLike, type LiveRuntimeDependencies, type LiveSqlDriver } from "@micirql/live-runtime";
import type { FunctionBindingResolver, RendererRegistry } from "@micirql/renderer";
import { configureLiveRuntime } from "./runtime";

export type CloudflareLiveBindings = {
  sql: LiveSqlDriver;
  registry: RendererRegistry;
  functions: FunctionBindingResolver;
  cache: CloudflareCacheLike;
  cacheTtlSeconds?: number;
};

export function configureCloudflareLiveRuntime(bindings: CloudflareLiveBindings) {
  const dependencies: LiveRuntimeDependencies = {
    store: createSqlLiveSiteStore(bindings.sql),
    registry: bindings.registry,
    functions: bindings.functions,
    cache: createCloudflareEdgeCache(bindings.cache),
    cacheTtlSeconds: bindings.cacheTtlSeconds ?? 300,
  };
  configureLiveRuntime(dependencies);
  return dependencies;
}
