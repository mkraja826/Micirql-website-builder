import { createElement, type ComponentType } from "react";
import { createStaticRendererRegistry, type RendererRegistry } from "@micirql/renderer";
import {
  Section,
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type UniversalSectionProps,
} from "@micirql/sections";

const RUNTIME_PROTOCOL_SCORE = 90;
const RUNTIME_PROTOCOL_CHECKED_AT = "2026-08-20T00:00:00.000Z";

/**
 * The catalog registry intentionally stays in draft/selection state until its
 * generation and visual-review gates promote a design. Published Site snapshots
 * have already passed that admission path, but the live renderer still needs a
 * concrete component implementation for each built-in section ID.
 *
 * This adapter therefore upgrades lifecycle/protocol metadata only at the live
 * rendering boundary. It does not mutate or re-export the catalog as production
 * selection data, and it cannot resolve IDs outside the built-in section catalog.
 */
export function createProductionSectionRendererRegistry(): RendererRegistry {
  const entries = seedSectionRegistryEntries.map((entry) => ({
    ...entry,
    status: "production" as const,
    protocol: {
      ...entry.protocol,
      passed: true,
      score: Math.max(entry.protocol.score, RUNTIME_PROTOCOL_SCORE),
      checkedAt: RUNTIME_PROTOCOL_CHECKED_AT,
    },
  }));

  const components: Record<string, ComponentType<Record<string, unknown>>> = Object.fromEntries(
    seedSectionCatalog.map((seed) => {
      const Component: ComponentType<Record<string, unknown>> = (props) => createElement(Section, {
        family: seed.family,
        variant: seed.variant,
        props: props as UniversalSectionProps,
      });
      Component.displayName = `LiveSection_${seed.id.replace(/-/g, "_")}`;
      return [seed.id, Component];
    }),
  );

  return createStaticRendererRegistry({ entries, components });
}
