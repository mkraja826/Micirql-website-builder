import type { ComponentType } from "react";
import type { DesignRegistryEntry } from "@micirql/registry";
import type { FunctionBindingResolver, RendererRegistry } from "./types";

export function createStaticRendererRegistry(args: {
  entries: DesignRegistryEntry[];
  components: Record<string, ComponentType<Record<string, unknown>> | undefined>;
}): RendererRegistry {
  const entryMap = new Map(args.entries.map((entry) => [`${entry.id}@${entry.version}`, entry]));

  return {
    async resolve(componentId, version) {
      const registry = entryMap.get(`${componentId}@${version}`);
      const Component = args.components[componentId];
      if (!registry || !Component) return undefined;
      return { registry, Component };
    },
  };
}

export function createFunctionBindingResolver(args: {
  actionIds: Iterable<string>;
  gatewayBasePath?: string;
}): FunctionBindingResolver {
  const registered = new Set(args.actionIds);
  const base = normalizeBasePath(args.gatewayBasePath ?? "/api/functions");

  return {
    async isRegistered(actionId) {
      return registered.has(actionId);
    },
    endpointFor({ actionId }) {
      return `${base}/${encodeURIComponent(actionId)}`;
    },
  };
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}
