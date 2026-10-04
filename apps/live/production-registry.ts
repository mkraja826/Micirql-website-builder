import { createElement, type ComponentType } from "react";
import {
  createStaticRendererRegistry,
  type RendererRegistry,
} from "@micirql/renderer";
import {
  SeedSection,
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type UniversalSectionProps,
} from "@micirql/sections";

export function createLiveProductionRegistry(): RendererRegistry {
  const entries = seedSectionRegistryEntries.filter(
    (entry) => entry.status === "production" && entry.protocol.passed,
  );
  const approvedIds = new Set(
    entries.map((entry) => `${entry.id}@${entry.version}`),
  );
  const components: Record<
    string,
    ComponentType<Record<string, unknown>> | undefined
  > = {};

  for (const seed of seedSectionCatalog) {
    if (!approvedIds.has(`${seed.id}@${seed.version}`)) continue;
    components[seed.id] = function LiveSeedSection(
      props: Record<string, unknown>,
    ) {
      return createElement(SeedSection, {
        family: seed.family,
        variant: seed.variant,
        props: props as unknown as UniversalSectionProps,
      });
    };
  }

  return createStaticRendererRegistry({ entries, components });
}
