import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { createFunctionBindingResolver } from "@micirql/renderer";
import { handleLiveRequest } from "@micirql/live-runtime";
import { createLiveProductionRegistry } from "../apps/live/production-registry";
import {
  LIVE_SITE_SCRIPT,
  LIVE_SITE_STYLES,
} from "../apps/live/live-site-assets";

const site: Site = {
  schemaVersion: "1.0.0",
  siteId: "site-live-test",
  workspaceId: "workspace-live-test",
  name: "Pearl Dental",
  domain: "clinic",
  subtype: "dental",
  theme: {
    family: "minimalist",
    modifiers: ["light"],
    brand: {
      colors: {
        primary: "#155e75",
        secondary: "#0f172a",
        accent: "#14b8a6",
        background: "#ffffff",
        surface: "#f8fafc",
        textPrimary: "#0f172a",
        textSecondary: "#475569",
        border: "#cbd5e1",
        success: "#15803d",
        warning: "#a16207",
        error: "#b91c1c",
      },
      typography: { display: "Arial", body: "Arial", ui: "Arial" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle",
    },
  },
  seoBlueprint: {
    primaryGoal: "Book dental appointments",
    targetLocations: [],
    priorityTopics: ["dentistry"],
    audiences: ["families"],
    languages: ["en"],
    localSeo: true,
    servicePages: true,
    locationPages: false,
    blog: false,
  },
  pages: [
    {
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        {
          id: "hero",
          component: { componentId: "MIN-HERO-001", version: "1.0.0" },
          props: { title: "Thoughtful dentistry" },
          bindings: {},
          hidden: false,
        },
      ],
      seo: {
        title: "Pearl Dental",
        description: "Dental care from Pearl Dental.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: ["Dentist"],
      },
    },
  ],
  navigation: [{ label: "Home", href: "/" }],
  integrations: [],
  domains: [],
};

test("live registry resolves only approved production sections", async () => {
  const registry = createLiveProductionRegistry();
  await expect(registry.resolve("MIN-HERO-001", "1.0.0")).resolves.toBeDefined();
  await expect(registry.resolve("MIN-HERO-003", "1.0.0")).resolves.toBeUndefined();
});

test("live response carries immutable identity and generated-site assets", async () => {
  const response = await handleLiveRequest(
    new Request("https://pearl.micirql.com/"),
    {
      store: {
        async resolveHostname() {
          return { siteId: site.siteId };
        },
        async getPublishedSite() {
          return { siteId: site.siteId, versionId: "version-7", snapshot: site };
        },
      },
      registry: createLiveProductionRegistry(),
      functions: createFunctionBindingResolver({ actionIds: [] }),
      renderPage() {
        return '<main data-test="rendered">Rendered</main>';
      },
      documentStyles: LIVE_SITE_STYLES,
      documentScript: LIVE_SITE_SCRIPT,
    },
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("x-micirql-version")).toBe("version-7");
  const html = await response.text();
  expect(html).toContain('name="micirql-version" content="version-7"');
  expect(html).toContain(".mi-section--hero");
  expect(html).toContain("mi-nav-menu__toggle");
  expect(html).toContain('data-test="rendered"');
});
