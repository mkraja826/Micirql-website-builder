import { expect, test } from "@playwright/test";
import type { FunctionalArchitecture, Site } from "@micirql/schema";
import { evaluateFunctionalPublishGate } from "../apps/builder/app/functional-publish-gate";

function siteWithSections(componentIds: string[], actions: Array<{ label: string; href: string }> = []): Site {
  return {
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [
          ...componentIds.map((componentId, index) => ({
            id: `section-${index}`,
            component: { componentId },
            props: index === 0 ? { actions } : {},
            bindings: {},
            hidden: false,
          })),
        ],
        seo: { title: "Home", description: "Home" },
      },
    ],
    navigation: [],
  } as unknown as Site;
}

function architecture(capabilities: Array<{ id: string; name: string; category: FunctionalArchitecture["capabilities"][number]["category"] }>): FunctionalArchitecture {
  return {
    version: "1.0",
    productType: "test-product",
    surfaces: ["marketing-site"],
    roles: [],
    entities: [],
    capabilities: capabilities.map((capability) => ({
      ...capability,
      description: `${capability.name} capability`,
      required: true,
      roles: [],
      entityIds: [],
    })),
    workflows: [],
    policies: [],
    integrations: [],
    acceptanceTests: [],
    backendRequired: capabilities.length > 0,
    multiTenant: false,
    requiresAuth: capabilities.some((item) => item.id === "auth"),
    requiresPayments: capabilities.some((item) => item.id === "payments"),
    requiresFileStorage: capabilities.some((item) => item.id === "storage"),
    requiresBackgroundJobs: false,
    notes: [],
  };
}

test("rejects generated output that omits a required planned capability", () => {
  const site = siteWithSections(["hero-premium"], [{ label: "Contact us", href: "mailto:hello@example.com" }]);
  const plan = architecture([
    { id: "auth", name: "Authentication", category: "auth" },
    { id: "booking", name: "Booking workflow", category: "booking" },
  ]);

  const result = evaluateFunctionalPublishGate(site, plan);

  expect(result.ready).toBe(false);
  expect(result.issues.filter((issue) => issue.code === "MISSING_REQUIRED_CAPABILITY").map((issue) => issue.capabilityId).sort()).toEqual(["auth", "booking"]);
});

test("verifies planned capabilities when the generated surface exposes them", () => {
  const site = siteWithSections(
    ["auth-login-panel", "appointment-booking", "admin-dashboard", "payment-checkout", "file-upload", "search-filter"],
    [
      { label: "Book appointment", href: "/appointment" },
      { label: "Call clinic", href: "tel:+919000000000" },
    ],
  );
  site.pages.push({ id: "appointment", path: "/appointment", name: "Appointment", sections: [], seo: { title: "Appointment", description: "Appointment" } } as Site["pages"][number]);
  const plan = architecture([
    { id: "auth", name: "Authentication", category: "auth" },
    { id: "booking", name: "Booking workflow", category: "booking" },
    { id: "payments", name: "Payments", category: "payment" },
    { id: "storage", name: "File storage", category: "storage" },
    { id: "search", name: "Search and filtering", category: "search" },
    { id: "admin", name: "Administration", category: "admin" },
  ]);

  const result = evaluateFunctionalPublishGate(site, plan);

  expect(result.ready).toBe(true);
  expect(new Set(result.verifiedCapabilities)).toEqual(new Set(["auth", "booking", "payments", "storage", "search", "admin"]));
});

test("continues to reject unsafe or broken actions alongside architecture checks", () => {
  const site = siteWithSections(["auth-login-panel"], [
    { label: "Contact", href: "javascript:alert(1)" },
    { label: "Book now", href: "/missing-booking" },
  ]);
  const plan = architecture([{ id: "auth", name: "Authentication", category: "auth" }]);

  const result = evaluateFunctionalPublishGate(site, plan);

  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "INVALID_ACTION")).toBe(true);
  expect(result.issues.some((issue) => issue.code === "BROKEN_INTERNAL_LINK")).toBe(true);
  expect(result.verifiedCapabilities).toContain("auth");
});
