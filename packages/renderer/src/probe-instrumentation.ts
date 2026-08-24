import type { PreparedSection } from "./types";

export type RuntimeProbeCapability =
  | "primary"
  | "booking"
  | "auth"
  | "admin"
  | "upload"
  | "payment"
  | "search";

export type RuntimeProbeAttributes = {
  "data-micirql-probe-section": string;
  "data-micirql-probe-capabilities"?: string;
  "data-micirql-action-ids"?: string;
};

const CAPABILITY_PATTERNS: Array<[RuntimeProbeCapability, RegExp]> = [
  ["booking", /book|booking|appointment|schedule|reserve/i],
  ["auth", /auth|login|log-in|sign-in|signin|signup|sign-up|register|account/i],
  ["admin", /admin|manage|dashboard|backoffice|back-office/i],
  ["upload", /upload|asset|file|document|photo|image/i],
  ["payment", /payment|checkout|purchase|pay|billing|invoice/i],
  ["search", /search|filter|find|lookup|query/i],
];

/**
 * Adds inert, styling-independent runtime metadata to generated sections.
 *
 * The metadata is intentionally derived from the immutable section/component
 * contract and registered action bindings, never from visible copy or CSS.
 * Browser certification can therefore locate functional surfaces even after a
 * visual redesign without coupling QA to class names.
 */
export function runtimeProbeAttributesForSection(
  prepared: Pick<PreparedSection, "section" | "component" | "props">,
): RuntimeProbeAttributes {
  const actionIds = Object.values(prepared.section.bindings)
    .map((binding) => binding.actionId.trim())
    .filter(Boolean);

  const searchable = [
    prepared.section.id,
    prepared.section.component.componentId,
    prepared.component.registry.id,
    ...actionIds,
    ...bindingPropSignals(prepared.props),
  ].join(" ");

  const capabilities = new Set<RuntimeProbeCapability>();
  if (actionIds.length > 0 || hasFormSignals(prepared.props)) capabilities.add("primary");
  for (const [capability, pattern] of CAPABILITY_PATTERNS) {
    if (pattern.test(searchable)) capabilities.add(capability);
  }

  const ordered = [...capabilities].sort((a, b) => capabilityOrder(a) - capabilityOrder(b));
  return {
    "data-micirql-probe-section": prepared.section.id,
    ...(ordered.length ? { "data-micirql-probe-capabilities": ordered.join(",") } : {}),
    ...(actionIds.length ? { "data-micirql-action-ids": [...new Set(actionIds)].join(",") } : {}),
  };
}

export function hasRuntimeProbeCapability(
  attributes: RuntimeProbeAttributes,
  capability: RuntimeProbeCapability,
) {
  return (attributes["data-micirql-probe-capabilities"] ?? "")
    .split(",")
    .includes(capability);
}

function bindingPropSignals(props: Record<string, unknown>) {
  const signals: string[] = [];
  for (const [key, value] of Object.entries(props)) {
    if (!/(action|endpoint|form|route|capabil|workflow|intent)/i.test(key)) continue;
    if (typeof value === "string") signals.push(`${key}:${value}`);
  }
  return signals;
}

function hasFormSignals(props: Record<string, unknown>) {
  return Object.keys(props).some((key) => /formAction|ActionEndpoint|ActionId/i.test(key));
}

function capabilityOrder(value: RuntimeProbeCapability) {
  return ["primary", "booking", "auth", "admin", "upload", "payment", "search"].indexOf(value);
}
