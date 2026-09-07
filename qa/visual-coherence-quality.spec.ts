import { expect, test } from "@playwright/test";
import { evaluateVisualCoherence } from "../apps/builder/app/visual-coherence-quality";

function premiumSite(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-1",
    workspaceId: "workspace-1",
    name: "Pearl Dental",
    domain: "clinic",
    theme: {
      family: "minimalist",
      modifiers: [],
      brand: {
        colors: {
          primary: "#123B4A",
          secondary: "#6B8C94",
          accent: "#C9874B",
          background: "#F7F4EE",
          surface: "#FFFFFF",
          textPrimary: "#162126",
          textSecondary: "#4B5960",
          border: "#D8DDD9",
          success: "#2D7D5D",
          warning: "#A36316",
          error: "#A33A3A",
        },
        typography: { display: "DM Serif Display", body: "Inter", ui: "Inter" },
        density: "spacious",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Book appointments",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      seo: {
        title: "Pearl Dental",
        description: "Pearl Dental",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: [],
      },
      sections: [
        { id: "nav", hidden: false, component: { componentId: "MIN-NAV-001", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "hero", hidden: false, component: { componentId: "MIN-HERO-002", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "services", hidden: false, component: { componentId: "MIN-SERV-003", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "about", hidden: false, component: { componentId: "MIN-ABOUT-002", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "proof", hidden: false, component: { componentId: "MIN-TEST-004", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "cta", hidden: false, component: { componentId: "MIN-CTA-003", version: "1.0.0" }, props: {}, bindings: {} },
        { id: "footer", hidden: false, component: { componentId: "MIN-FOOT-002", version: "1.0.0" }, props: {}, bindings: {} },
      ],
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
    ...overrides,
  } as any;
}

test("premium high-contrast tokens and varied sections pass", () => {
  const result = evaluateVisualCoherence(premiumSite());
  expect(result.ready).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(88);
  expect(result.metrics.textPrimaryBackgroundContrast).toBeGreaterThanOrEqual(4.5);
  expect(result.metrics.textSecondarySurfaceContrast).toBeGreaterThanOrEqual(4.5);
});

test("low text/background contrast is a blocking error", () => {
  const value = premiumSite();
  value.theme.brand.colors.textPrimary = "#E8E4DC";
  const result = evaluateVisualCoherence(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "TEXT_PRIMARY_BACKGROUND_LOW_CONTRAST" && issue.severity === "error")).toBe(true);
});

test("low text/surface contrast is a blocking error", () => {
  const value = premiumSite();
  value.theme.brand.colors.textSecondary = "#DADADA";
  const result = evaluateVisualCoherence(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "TEXT_SECONDARY_SURFACE_LOW_CONTRAST" && issue.severity === "error")).toBe(true);
});

test("invalid brand colors fail closed", () => {
  const value = premiumSite();
  value.theme.brand.colors.background = "warm ivory";
  const result = evaluateVisualCoherence(value);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "BRAND_COLOR_INVALID")).toBe(true);
});

test("adjacent identical section variants are penalized", () => {
  const value = premiumSite();
  value.pages[0].sections[3].component.componentId = value.pages[0].sections[2].component.componentId;
  const result = evaluateVisualCoherence(value);
  expect(result.metrics.repeatedAdjacentComponents).toBe(1);
  expect(result.issues.some((issue) => issue.code === "ADJACENT_COMPONENT_REPEAT")).toBe(true);
});

test("long pages dominated by too few variants are penalized", () => {
  const value = premiumSite();
  const repeated = "MIN-SERV-003";
  for (let index = 1; index <= 5; index += 1) {
    value.pages[0].sections[index].component.componentId = repeated;
  }
  const result = evaluateVisualCoherence(value);
  expect(result.metrics.pagesWithMonotony).toBe(1);
  expect(result.issues.some((issue) => issue.code === "PAGE_COMPONENT_MONOTONY")).toBe(true);
});
