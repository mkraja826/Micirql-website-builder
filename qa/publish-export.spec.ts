import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import {
  buildPortableExport,
  buildStaticProject,
  createStoredZip,
} from "../apps/builder/app/api/publish/export-utils";

const site: Site = {
  schemaVersion: "1.0.0",
  siteId: "site-export-test",
  workspaceId: "workspace-export-test",
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
    targetLocations: ["Pearl City"],
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
          props: {
            eyebrow: "Pearl Dental",
            title: "Thoughtful dentistry for every stage of life",
            description: "Clear options and comfortable care.",
            secret: "must-not-export",
          },
          bindings: {},
          hidden: false,
        },
      ],
      seo: {
        title: "Pearl Dental",
        description: "Family dental care from Pearl Dental.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: ["Dentist"],
      },
    },
    {
      id: "services",
      path: "/services",
      name: "Services",
      sections: [
        {
          id: "services-list",
          component: { componentId: "MIN-SERV-001", version: "1.0.0" },
          props: {
            title: "Dental services",
            items: [{ title: "Preventive care" }],
          },
          bindings: {},
          hidden: false,
        },
      ],
      seo: {
        title: "Dental services | Pearl Dental",
        description: "Explore preventive and restorative dental care.",
        canonicalPath: "/services",
        indexable: true,
        structuredDataTypes: [],
      },
    },
  ],
  navigation: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
  ],
  integrations: [
    { integrationId: "private-config-ref", provider: "mail", enabled: true },
  ],
  domains: [],
};

const published = {
  siteId: site.siteId,
  versionId: "version-7",
  snapshot: site,
  snapshotHash: "a".repeat(64),
};

test("portable export is immutable-version identified and strips private configuration", () => {
  const result = buildPortableExport(published, "2026-10-03T00:00:00.000Z");
  expect(result.immutableVersion.versionId).toBe("version-7");
  expect(result.immutableVersion.snapshotHash).toBe("a".repeat(64));
  expect(result.site.integrations).toEqual([]);
  expect(result.manifest.strippedIntegrationCount).toBe(1);
  expect(result.site.pages[0]!.sections[0]!.props.secret).toBeUndefined();
  expect(JSON.stringify(result)).not.toContain("must-not-export");
  expect(JSON.stringify(result)).not.toContain("private-config-ref");
});

test("static export contains every page, immutable identity and a valid ZIP envelope", async () => {
  const files = await buildStaticProject({
    published,
    requestOrigin: "https://builder.micirql.com",
    generatedAt: "2026-10-03T00:00:00.000Z",
  });
  expect(files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      "index.html",
      "services/index.html",
      "assets/site.css",
      "assets/site.js",
      "assets/manifest.json",
      "site.schema.json",
    ]),
  );
  const home = new TextDecoder().decode(
    files.find((file) => file.path === "index.html")!.bytes,
  );
  expect(home).toContain('content="version-7"');
  expect(home).not.toContain("must-not-export");
  const zip = createStoredZip(files);
  expect([...zip.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(new TextDecoder().decode(zip)).toContain("site.schema.json");
});

test("static forms block until the public MiCirql function gateway is configured", async () => {
  const withForm = structuredClone(site);
  withForm.pages[0]!.sections[0]!.bindings = {
    appointment: { actionId: "appointment.request", inputMap: {} },
  };
  await expect(
    buildStaticProject({
      published: { ...published, snapshot: withForm },
      requestOrigin: "https://builder.micirql.com",
    }),
  ).rejects.toMatchObject({ code: "PUBLIC_FUNCTION_GATEWAY_NOT_CONFIGURED" });
});
