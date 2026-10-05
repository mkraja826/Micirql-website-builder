import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import {
  buildPortableExport,
  buildStaticProject,
  createStoredZip,
} from "../apps/builder/app/api/publish/export-utils";
import { demoAssetById } from "../apps/builder/app/demo-assets";

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
  expect(home).toContain('data-mi-theme="minimalist"');
  expect(home).toContain('data-mi-density="comfortable"');
  expect(home).toContain('data-section-theme="minimalist"');
  expect(home).toContain("mi-section-theme--minimalist");
  expect(home).not.toContain("must-not-export");
  const zip = createStoredZip(files);
  expect([...zip.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(new TextDecoder().decode(zip)).toContain("site.schema.json");
});

test("static export preserves palette, typography and the selected composition identity", async () => {
  const themedSite = structuredClone(site);
  themedSite.theme.family = "glass";
  themedSite.theme.modifiers = ["rounded"];
  themedSite.theme.brand.colors.primary = "#8a2be2";
  themedSite.theme.brand.colors.secondary = "#14213d";
  themedSite.theme.brand.colors.accent = "#fca311";
  themedSite.theme.brand.typography = {
    display: "Charter",
    body: "Candara",
    ui: "Segoe UI",
  };
  themedSite.theme.brand.density = "compact";
  themedSite.theme.brand.shape = "soft";
  themedSite.theme.brand.motion = "rich";
  themedSite.pages[0]!.sections[0]!.component.componentId = "GLS-HERO-002";

  const files = await buildStaticProject({
    published: { ...published, snapshot: themedSite },
    requestOrigin: "https://builder.micirql.com",
  });
  const decode = (path: string) =>
    new TextDecoder().decode(files.find((file) => file.path === path)!.bytes);
  const home = decode("index.html");
  const css = decode("assets/site.css");

  expect(home).toContain('data-mi-theme="glass"');
  expect(home).toContain('data-mi-density="compact"');
  expect(home).toContain('data-mi-shape="soft"');
  expect(home).toContain('data-mi-motion="rich"');
  expect(home).toContain('data-section-variant="2"');
  expect(home).toContain("mi-section-theme--glass");
  expect(home).toContain("mi-section-variant--2");
  expect(home).toContain("mi-section__composition mi-split");
  expect(css).toContain("--mi-color-primary:#8a2be2;");
  expect(css).toContain("--mi-color-secondary:#14213d;");
  expect(css).toContain("--mi-color-accent:#fca311;");
  expect(css).toContain("--mi-font-display:Charter;");
  expect(css).toContain("--mi-font-body:Candara;");
  expect(css).toContain("--mi-section-space:clamp(3rem,6vw,5rem);");
  expect(css).toContain("--mi-radius-card:1.75rem;");
  expect(css).toContain("--mi-motion-standard:360ms;");
  expect(css).toContain(
    '.mi-section-variant--2[data-section-family="hero"] .mi-section__composition',
  );
  for (const family of [
    "minimalist",
    "corporate",
    "luxury",
    "editorial",
    "glass",
    "maximalist",
    "organic",
    "futuristic",
    "playful",
    "cinematic",
  ]) {
    expect(css).toContain(`.mi-section-theme--${family}`);
  }
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

test("certified Pexels media keeps licensing provenance and exports without a broad host exception", async () => {
  const asset = demoAssetById("mi-dental-calm-clinic");
  expect(asset).toBeDefined();
  const withLicensedMedia = structuredClone(site);
  withLicensedMedia.pages[0]!.sections[0]!.props.image = {
    assetId: asset!.id,
    src: asset!.originalUrl,
    alt: asset!.alt,
    focalPoint: asset!.focalPoint,
    license: asset!.license,
    sourceReference: asset!.sourceReference,
  };

  const portable = buildPortableExport({
    ...published,
    snapshot: withLicensedMedia,
  });
  expect(portable.manifest.assets[0]).toMatchObject({
    assetId: asset!.id,
    source: "micirql-placeholder",
    license: "licensed",
    sourceReference: asset!.sourceReference,
  });

  const originalFetch = globalThis.fetch;
  let fetchedUrl = "";
  globalThis.fetch = async (input) => {
    fetchedUrl = String(input);
    return new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
      status: 200,
      headers: { "content-type": "image/jpeg", "content-length": "4" },
    });
  };
  try {
    const files = await buildStaticProject({
      published: { ...published, snapshot: withLicensedMedia },
      requestOrigin: "https://builder.micirql.com",
    });
    expect(fetchedUrl).toBe(asset!.originalUrl);
    expect(files.map((file) => file.path)).toContain(
      "assets/media/mi-dental-calm-clinic-1.jpg",
    );
    const manifest = JSON.parse(
      new TextDecoder().decode(
        files.find((file) => file.path === "assets/manifest.json")!.bytes,
      ),
    ) as { assets: Array<Record<string, unknown>> };
    expect(manifest.assets[0]).toMatchObject({
      license: "licensed",
      sourceReference: asset!.sourceReference,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
