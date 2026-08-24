import { expect, test } from "@playwright/test";
import type { PreparedSection } from "@micirql/renderer";
import {
  hasRuntimeProbeCapability,
  runtimeProbeAttributesForSection,
} from "@micirql/renderer";

function preparedSection(input: {
  sectionId: string;
  componentId: string;
  actionIds?: string[];
  props?: Record<string, unknown>;
}) {
  const bindings = Object.fromEntries(
    (input.actionIds ?? []).map((actionId, index) => [`binding${index}`, { actionId, inputMap: {} }]),
  );
  return {
    section: {
      id: input.sectionId,
      component: { componentId: input.componentId, version: "1.0.0" },
      props: input.props ?? {},
      bindings,
      hidden: false,
    },
    component: { registry: { id: input.componentId } },
    props: input.props ?? {},
  } as unknown as PreparedSection;
}

test("instruments booking sections from registered action bindings without using visible copy", () => {
  const attrs = runtimeProbeAttributesForSection(preparedSection({
    sectionId: "appointment-form",
    componentId: "FORM-BOOKING-001",
    actionIds: ["booking.create"],
    props: { formAction: "/__micirql/functions/booking.create" },
  }));

  expect(attrs["data-micirql-probe-section"]).toBe("appointment-form");
  expect(attrs["data-micirql-action-ids"]).toBe("booking.create");
  expect(hasRuntimeProbeCapability(attrs, "primary")).toBe(true);
  expect(hasRuntimeProbeCapability(attrs, "booking")).toBe(true);
});

test("marks payment, upload, auth, admin and search surfaces deterministically", () => {
  const cases = [
    ["CHECKOUT-001", "payment.create", "payment"],
    ["UPLOAD-001", "asset.upload", "upload"],
    ["AUTH-LOGIN-001", "auth.login", "auth"],
    ["ADMIN-DASH-001", "admin.update", "admin"],
    ["SEARCH-001", "search.query", "search"],
  ] as const;

  for (const [componentId, actionId, capability] of cases) {
    const attrs = runtimeProbeAttributesForSection(preparedSection({
      sectionId: `${capability}-section`,
      componentId,
      actionIds: [actionId],
    }));
    expect(hasRuntimeProbeCapability(attrs, capability)).toBe(true);
    expect(hasRuntimeProbeCapability(attrs, "primary")).toBe(true);
  }
});

test("does not invent functional capabilities for a purely presentational section", () => {
  const attrs = runtimeProbeAttributesForSection(preparedSection({
    sectionId: "hero",
    componentId: "HERO-EDITORIAL-001",
  }));

  expect(attrs["data-micirql-probe-section"]).toBe("hero");
  expect(attrs["data-micirql-probe-capabilities"]).toBeUndefined();
  expect(attrs["data-micirql-action-ids"]).toBeUndefined();
});
