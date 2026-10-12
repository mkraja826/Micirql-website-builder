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

test("static export keeps the responsive navigation accessible and above page content", async () => {
  const withNavigation = structuredClone(site);
  withNavigation.pages[0]!.sections[0]!.component.componentId = "MIN-NAV-001";
  withNavigation.pages[0]!.sections[0]!.props = {
    title: "Pearl Dental Studio",
    items: [
      { title: "Treatments", href: "/services" },
      { title: "Contact", href: "/contact" },
    ],
    primaryAction: { label: "Request appointment", href: "/contact" },
  };

  const files = await buildStaticProject({
    published: { ...published, snapshot: withNavigation },
    requestOrigin: "https://builder.micirql.com",
  });
  const decode = (path: string) =>
    new TextDecoder().decode(files.find((file) => file.path === path)!.bytes);
  const home = decode("index.html");
  const css = decode("assets/site.css");
  const script = decode("assets/site.js");

  expect(home).toContain('aria-label="Open primary navigation"');
  expect(home).toContain('class="mi-menu-icon" aria-hidden="true"');
  expect(css).toContain("z-index:100;overflow:visible");
  expect(css).toContain("top:calc(100% + .5rem);left:1rem");
  expect(css).toContain('grid-template-areas:"toggle cta brand"');
  expect(script).toContain('event.key!=="Escape"');
  expect(script).toContain('window.matchMedia("(min-width: 64rem)")');
  expect(script).toContain('"Close":"Open"');
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
  expect(css).toContain(
    '.mi-section-theme[data-section-family="contact"] .mi-section__composition',
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

test("static forms target only the registered public MiCirql gateway", async () => {
  const withForm = structuredClone(site);
  withForm.pages[0]!.sections[0]!.component.componentId = "MIN-CONT-001";
  withForm.pages[0]!.sections[0]!.bindings = {
    appointment: { actionId: "appointment.request", inputMap: {} },
  };
  await expect(
    buildStaticProject({
      published: { ...published, snapshot: withForm },
      requestOrigin: "https://builder.micirql.com",
      publicFunctionsOrigin: "https://unregistered.micirql.com",
    }),
  ).rejects.toMatchObject({ code: "PUBLIC_FUNCTION_GATEWAY_INVALID" });
  const files = await buildStaticProject({
    published: { ...published, snapshot: withForm },
    requestOrigin: "https://builder.micirql.com",
    publicFunctionsOrigin: "https://forms.micirql.com",
  });
  const home = new TextDecoder().decode(
    files.find((file) => file.path === "index.html")!.bytes,
  );
  const script = new TextDecoder().decode(
    files.find((file) => file.path === "assets/site.js")!.bytes,
  );
  expect(home).toContain(
    "https://forms.micirql.com/api/functions/appointment.request?siteId=site-export-test",
  );
  expect(home).toContain('name="_website"');
  expect(home).toContain('id="contact-form"');
  expect(home).toContain('name="_idempotencyKey"');
  expect(home).toContain('name="service"');
  expect(home).toContain('name="preferredDate"');
  expect(home).toContain('name="consent"');
  expect(home).toContain('minlength="6"');
  expect(home).toContain("Request appointment");
  expect(script).toContain("micirqlSubmissionKey");
  expect(script).toContain("button.disabled=true");
  expect(script).toContain('window.addEventListener("pageshow"');
  expect(script).toContain("button.disabled=false");
  expect(home).not.toContain("MICIRQL_SUPABASE_SECRET_KEY");
});

test("static forms render the fields required by every registered request action", async () => {
  const requiredFields: Record<string, string[]> = {
    "lead.create": ["name", "email", "message", "consent"],
    "appointment.request": ["name", "email", "service", "consent"],
    "reservation.request": [
      "name",
      "email",
      "requestedDate",
      "requestedTime",
      "partySize",
      "consent",
    ],
    "quote.request": ["name", "email", "service", "consent"],
    "newsletter.subscribe": ["email", "consent"],
    "property.enquiry": [
      "name",
      "email",
      "propertyId",
      "enquiryType",
      "consent",
    ],
    "demo.request": ["name", "email", "company", "consent"],
    "booking.request": [
      "name",
      "email",
      "checkIn",
      "checkOut",
      "guests",
      "consent",
    ],
    "enrollment.enquiry": [
      "name",
      "email",
      "course",
      "deliveryMode",
      "consent",
    ],
  };

  for (const [actionId, fields] of Object.entries(requiredFields)) {
    const withForm = structuredClone(site);
    withForm.pages[0]!.sections[0]!.component.componentId = "MIN-CONT-001";
    withForm.pages[0]!.sections[0]!.bindings = {
      submit: { actionId, inputMap: {} },
    };
    const files = await buildStaticProject({
      published: { ...published, snapshot: withForm },
      requestOrigin: "https://builder.micirql.com",
      publicFunctionsOrigin: "https://forms.micirql.com",
    });
    const home = new TextDecoder().decode(
      files.find((file) => file.path === "index.html")!.bytes,
    );
    for (const field of fields) {
      expect(home, `${actionId} must render ${field}`).toContain(
        `name="${field}"`,
      );
    }
    if (actionId === "newsletter.subscribe") {
      expect(home).not.toContain('name="name"');
      expect(home).not.toContain('name="message"');
      expect(home).toContain("I agree to receive email updates");
    }
  }
});

test("static forms use the same deterministic binding selection as live rendering", async () => {
  const withForm = structuredClone(site);
  withForm.pages[0]!.sections[0]!.component.componentId = "MIN-CONT-001";
  withForm.pages[0]!.sections[0]!.bindings = {
    action1: { actionId: "analytics.track", inputMap: {} },
    submit: { actionId: "lead.create", inputMap: {} },
    appointment2: { actionId: "appointment.request", inputMap: {} },
  };
  withForm.pages[0]!.sections[0]!.props.formBindingKey = "appointment2";
  const files = await buildStaticProject({
    published: { ...published, snapshot: withForm },
    requestOrigin: "https://builder.micirql.com",
    publicFunctionsOrigin: "https://forms.micirql.com",
  });
  const home = new TextDecoder().decode(
    files.find((file) => file.path === "index.html")!.bytes,
  );
  expect(home).toContain("/api/functions/appointment.request?");
  expect(home).not.toContain("/api/functions/lead.create?");
  expect(home).not.toContain("/api/functions/analytics.track?");
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
