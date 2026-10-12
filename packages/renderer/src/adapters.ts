import type { ComponentType } from "react";
import type { DesignRegistryEntry } from "@micirql/registry";
import type { FunctionBindingResolver, RendererRegistry } from "./types";

export const REGISTERED_PUBLIC_FUNCTIONS_ORIGIN = "https://forms.micirql.com";

export function registeredPublicFunctionsOrigin(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.origin === REGISTERED_PUBLIC_FUNCTIONS_ORIGIN &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
      ? REGISTERED_PUBLIC_FUNCTIONS_ORIGIN
      : undefined;
  } catch {
    return undefined;
  }
}

export function createStaticRendererRegistry(args: {
  entries: DesignRegistryEntry[];
  components: Record<
    string,
    ComponentType<Record<string, unknown>> | undefined
  >;
}): RendererRegistry {
  const entryMap = new Map(
    args.entries.map((entry) => [`${entry.id}@${entry.version}`, entry]),
  );

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
    endpointFor({ siteId, actionId }) {
      const endpoint = `${base}/${encodeURIComponent(actionId)}`;
      if (!/^https?:\/\//i.test(endpoint)) return endpoint;
      const url = new URL(endpoint);
      url.searchParams.set("siteId", siteId);
      return url.toString();
    },
  };
}

function normalizeBasePath(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, "");
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}
