import { expect, test } from "@playwright/test";
import type { ComponentType } from "react";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  preparePage,
  type ResolvedBrandMark,
} from "@micirql/renderer";
import { handleLiveRequest } from "@micirql/live-runtime";
import { resolveLiveBrandMarkForSite } from "../apps/live/runtime-bootstrap";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  seedSectionCatalog,
  seedSectionRegistryEntries,
  type BrandMarkReference,
  type SectionFamily,
} from "@micirql/sections";
import {
  buildPortableExport,
  buildStaticProject,
} from "../apps/builder/app/api/publish/export-utils";
import {
  resolveBrandMarkForSite,
  resolvePersistedBrandMarkForSite,
} from "../apps/builder/app/render-brand-mark";
import { POST as renderPreview } from "../apps/builder/app/api/preview/route";

const BUSINESS_NAME = "Radhika Dental";
const EXACT_LOGO_ASSET_ID = "UserLogo/Case-Sensitive_%2F_01";

const navbarCatalogEntry = requiredCatalogEntry("navbar");
const footerCatalogEntry = requiredCatalogEntry("footer");

const registry = createStaticRendererRegistry({
  entries: seedSectionRegistryEntries,
  components: Object.fromEntries(
    [navbarCatalogEntry, footerCatalogEntry].map((entry) => {
      const Component: ComponentType<Record<string, unknown>> = () => null;
      return [entry.id, Component];
    }),
  ),
});

const functions = createFunctionBindingResolver({ actionIds: [] });

const shapeCases = [
  { id: "square", width: 120, height: 120 },
  { id: "wide", width: 320, height: 96 },
  { id: "ultra-wide", width: 600, height: 100 },
  { id: "tall", width: 120, height: 240 },
] as const;

test.describe("brand logo pipeline contracts", () => {
  test("uses the business name in header and footer when no logo was supplied", async ({
    page,
  }) => {
    await page.goto("/brand-logo-contract");

    const specimen = page.locator('[data-logo-shape="none"]');
    const navbarBrand = specimen.locator(
      '[data-section-family="navbar"] .mi-navbar__brand',
    );
    const footerBrand = specimen.locator(
      '[data-section-family="footer"] .mi-footer__brand',
    );

    await expect(navbarBrand).toContainText(BUSINESS_NAME);
    await expect(footerBrand).toContainText(BUSINESS_NAME);
    await expect(specimen.locator(".mi-brand-mark")).toHaveCount(0);
  });

  test("renders square, wide, ultra-wide and tall logos in both header and footer without distortion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/brand-logo-contract");

    for (const shape of shapeCases) {
      const specimen = page.locator(`[data-logo-shape="${shape.id}"]`);
      const logos = specimen.locator(".mi-brand-mark");
      await expect(logos).toHaveCount(2);

      for (const logo of await logos.all()) {
        const metrics = await logo.evaluate((element) => {
          const image = element as HTMLImageElement;
          const rect = image.getBoundingClientRect();
          const style = getComputedStyle(image);
          return {
            assetId: image.dataset.miLogoAssetId,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            renderedWidth: rect.width,
            renderedHeight: rect.height,
            objectFit: style.objectFit,
          };
        });

        expect(metrics.assetId).toBe(`${EXACT_LOGO_ASSET_ID}:${shape.id}`);
        expect(metrics.naturalWidth).toBe(shape.width);
        expect(metrics.naturalHeight).toBe(shape.height);
        expect(metrics.objectFit).toBe("contain");
        expect(metrics.renderedWidth).toBeGreaterThan(0);
        expect(metrics.renderedHeight).toBeGreaterThan(0);
        expect(metrics.renderedWidth / metrics.renderedHeight).toBeCloseTo(
          shape.width / shape.height,
          1,
        );
      }

      const headerLogo = specimen.locator(
        '[data-section-family="navbar"] .mi-brand-mark',
      );
      const footerLogo = specimen.locator(
        '[data-section-family="footer"] .mi-brand-mark',
      );
      await expect(headerLogo).toHaveAttribute(
        "alt",
        `${BUSINESS_NAME} ${shape.id} logo`,
      );
      await expect(footerLogo).toHaveAttribute(
        "alt",
        `${BUSINESS_NAME} ${shape.id} logo`,
      );
    }
  });

  test("keeps every logo shape within a 320px mobile viewport and preserves a 44px header touch target", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/brand-logo-contract");

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    for (const shape of shapeCases) {
      const specimen = page.locator(`[data-logo-shape="${shape.id}"]`);
      for (const logo of await specimen.locator(".mi-brand-mark").all()) {
        const box = await logo.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(320.5);
      }

      const headerLogoLink = specimen
        .locator('[data-section-family="navbar"] .mi-brand-mark')
        .locator("xpath=ancestor::a[1]");
      await expect(headerLogoLink).toHaveAttribute(
        "aria-label",
        `${BUSINESS_NAME} home`,
      );
      const touchTarget = await headerLogoLink.boundingBox();
      expect(touchTarget).not.toBeNull();
      expect(touchTarget!.width).toBeGreaterThanOrEqual(44);
      expect(touchTarget!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("injects the same resolved brand mark into header and footer and preserves the exact opaque asset ID", async () => {
    const resolved = resolvedBrandMark(EXACT_LOGO_ASSET_ID, 600, 100);
    const site = siteFixture(EXACT_LOGO_ASSET_ID);

    const prepared = await preparePage({
      site,
      path: "/",
      origin: "https://radhika-dental.example",
      registry,
      functions,
      mode: "production",
      brandMark: resolved,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.site.theme.brand.logoAssetId).toBe(
      EXACT_LOGO_ASSET_ID,
    );
    expect(prepared.value.site.generation?.brandInput?.logoAssetId).toBe(
      EXACT_LOGO_ASSET_ID,
    );
    expect(prepared.value.sections).toHaveLength(2);
    for (const section of prepared.value.sections) {
      expect(section.props.brandMark).toEqual(resolved);
      expect((section.props.brandMark as BrandMarkReference).assetId).toBe(
        EXACT_LOGO_ASSET_ID,
      );
    }
    expect(site.theme.brand.logoAssetId).toBe(EXACT_LOGO_ASSET_ID);
  });

  test("keeps text fallback valid when the site has no supplied logo", async () => {
    const prepared = await preparePage({
      site: siteFixture(),
      path: "/",
      origin: "https://radhika-dental.example",
      registry,
      functions,
      mode: "production",
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    for (const section of prepared.value.sections) {
      expect(section.props.brandMark).toBeUndefined();
      expect(section.props.title).toBe(BUSINESS_NAME);
    }
  });

  test("reports an explicit issue instead of silently replacing an unresolved supplied logo with text", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);

    for (const brandMark of [
      undefined,
      resolvedBrandMark("different-logo-id", 120, 120),
      { ...resolvedBrandMark(EXACT_LOGO_ASSET_ID, 120, 120), src: "" },
    ]) {
      const prepared = await preparePage({
        site,
        path: "/",
        origin: "https://radhika-dental.example",
        registry,
        functions,
        mode: "production",
        ...(brandMark === undefined ? {} : { brandMark }),
      });

      expect(prepared.ok).toBe(false);
      if (prepared.ok) continue;
      expect(prepared.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "BRAND_LOGO_UNRESOLVED" }),
        ]),
      );
    }
  });

  test("static export renders the resolved logo in header and footer with contain sizing", async () => {
    const exportLogoId = "mi-dental-calm-clinic";
    const site = siteFixture(exportLogoId);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100"></svg>',
        { status: 200, headers: { "content-type": "image/svg+xml" } },
      );

    try {
      const files = await buildStaticProject({
        published: {
          siteId: site.siteId,
          versionId: "brand-logo-version-1",
          snapshot: site,
          snapshotHash: "b".repeat(64),
        },
        requestOrigin: "https://builder.micirql.com",
        generatedAt: "2026-10-17T00:00:00.000Z",
      });
      const html = decodeFile(files, "index.html");
      const css = decodeFile(files, "assets/site.css");

      expect(html.match(/class="mi-brand__logo"/g)).toHaveLength(2);
      expect(html).toContain('src="assets/media/mi-dental-calm-clinic-1.svg"');
      expect(html).toContain(`alt="${BUSINESS_NAME} logo"`);
      expect(html).toContain(`aria-label="${BUSINESS_NAME} home"`);
      expect(css).toMatch(
        /\.mi-brand__logo\{[^}]*width:auto;[^}]*height:auto;[^}]*object-fit:contain/,
      );
      expect(css).toContain(".mi-brand--footer .mi-brand__logo");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("static export hydrates only the exact authenticated uploaded logo", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      expect(String(input)).toBe("https://cdn.example.test/radhika-logo.svg");
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="100"></svg>',
        { status: 200, headers: { "content-type": "image/svg+xml" } },
      );
    };

    try {
      const files = await buildStaticProject({
        published: {
          siteId: site.siteId,
          versionId: "brand-logo-version-uploaded",
          snapshot: site,
          snapshotHash: "d".repeat(64),
        },
        requestOrigin: "https://builder.micirql.com",
        allowedAssetHosts: ["cdn.example.test"],
        brandMark: {
          assetId: EXACT_LOGO_ASSET_ID,
          src: "https://cdn.example.test/radhika-logo.svg",
          alt: "Radhika Dental identity",
          width: 600,
          height: 100,
        },
        generatedAt: "2026-10-18T00:00:00.000Z",
      });
      const html = decodeFile(files, "index.html");
      const manifest = decodeFile(files, "assets/manifest.json");

      expect(html).toContain(
        'src="assets/media/userlogo-case-sensitive_-2f_01-1.svg"',
      );
      expect(html).toContain('alt="Radhika Dental identity"');
      expect(html.match(/data-mi-logo-asset-id=/g)).toHaveLength(2);
      expect(html).toContain('width="600" height="100"');
      expect(html).toContain('style="aspect-ratio:600 / 100"');
      expect(html).toContain('loading="eager" decoding="async"');
      expect(html).toContain('loading="lazy" decoding="async"');
      expect(manifest).toContain("https://cdn.example.test/radhika-logo.svg");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("portable export preserves the exact opaque logo ID in snapshot and manifest", () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const portable = buildPortableExport(
      {
        siteId: site.siteId,
        versionId: "brand-logo-version-opaque-id",
        snapshot: site,
        snapshotHash: "c".repeat(64),
      },
      "2026-10-17T00:00:00.000Z",
    );

    expect(portable.site.theme.brand.logoAssetId).toBe(EXACT_LOGO_ASSET_ID);
    expect(portable.site.generation?.brandInput?.logoAssetId).toBe(
      EXACT_LOGO_ASSET_ID,
    );
    expect(portable.manifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `asset:${EXACT_LOGO_ASSET_ID}`,
          assetId: EXACT_LOGO_ASSET_ID,
          path: "site.theme.brand.logoAssetId",
        }),
      ]),
    );
  });

  test("resolves a workspace-owned uploaded logo without changing its opaque asset ID", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const oldUrl = process.env.MICIRQL_SUPABASE_URL;
    const oldSecret = process.env.MICIRQL_SUPABASE_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    process.env.MICIRQL_SUPABASE_URL = "https://assets.example.test";
    process.env.MICIRQL_SUPABASE_SECRET_KEY = "test-secret";
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      expect(url.searchParams.get("id")).toBe(`eq.${EXACT_LOGO_ASSET_ID}`);
      return Response.json([
        {
          id: EXACT_LOGO_ASSET_ID,
          workspace_id: site.workspaceId,
          source: "user-upload",
          kind: "logo",
          alt: "Radhika Dental identity",
          width: 600,
          height: 100,
          original_url: "https://cdn.example.test/radhika-logo.svg",
          active: true,
          deleted_at: null,
        },
      ]);
    };

    try {
      await expect(resolveBrandMarkForSite(site)).resolves.toBeUndefined();
      await expect(resolvePersistedBrandMarkForSite(site)).resolves.toEqual({
        assetId: EXACT_LOGO_ASSET_ID,
        src: "https://cdn.example.test/radhika-logo.svg",
        alt: "Radhika Dental identity",
        width: 600,
        height: 100,
      });
    } finally {
      restoreEnvironment("MICIRQL_SUPABASE_URL", oldUrl);
      restoreEnvironment("MICIRQL_SUPABASE_SECRET_KEY", oldSecret);
      globalThis.fetch = originalFetch;
    }
  });

  test("re-signs a durable private uploaded logo for authenticated preview and export", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const objectKey = `${site.workspaceId}/incoming/upload-1/Radhika Logo.svg`;
    const oldUrl = process.env.MICIRQL_SUPABASE_URL;
    const oldSecret = process.env.MICIRQL_SUPABASE_SECRET_KEY;
    const originalFetch = globalThis.fetch;
    process.env.MICIRQL_SUPABASE_URL = "https://assets.example.test";
    process.env.MICIRQL_SUPABASE_SECRET_KEY = "sb_secret_test";
    let signed = false;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === "/rest/v1/assets") {
        expect(url.searchParams.get("id")).toBe(`eq.${EXACT_LOGO_ASSET_ID}`);
        expect(url.searchParams.get("select")).toContain(
          "original_storage_key",
        );
        return Response.json([
          {
            id: EXACT_LOGO_ASSET_ID,
            workspace_id: site.workspaceId,
            source: "user-upload",
            kind: "logo",
            alt: "Radhika Dental identity",
            width: 600,
            height: 100,
            original_url: "",
            storage_provider: "supabase",
            original_storage_key: objectKey,
            active: true,
            deleted_at: null,
          },
        ]);
      }
      expect(url.pathname).toBe(
        `/storage/v1/object/sign/workspace-assets/${objectKey.replace(" ", "%20")}`,
      );
      expect(init?.method).toBe("POST");
      expect(new Headers(init?.headers).get("apikey")).toBe("sb_secret_test");
      expect(new Headers(init?.headers).get("authorization")).toBeNull();
      expect(JSON.parse(String(init?.body))).toEqual({ expiresIn: 3600 });
      signed = true;
      return Response.json({
        signedURL:
          "/object/sign/workspace-assets/private-logo.svg?token=durable",
      });
    };

    try {
      await expect(resolvePersistedBrandMarkForSite(site)).resolves.toEqual({
        assetId: EXACT_LOGO_ASSET_ID,
        src: "https://assets.example.test/storage/v1/object/sign/workspace-assets/private-logo.svg?token=durable",
        alt: "Radhika Dental identity",
        width: 600,
        height: 100,
      });
      expect(signed).toBe(true);
    } finally {
      restoreEnvironment("MICIRQL_SUPABASE_URL", oldUrl);
      restoreEnvironment("MICIRQL_SUPABASE_SECRET_KEY", oldSecret);
      globalThis.fetch = originalFetch;
    }
  });

  test("live rendering signs the exact published workspace logo without exposing the private key through its public RPC", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const objectKey = `${site.workspaceId}/incoming/upload-2/logo.svg`;
    const rpc = async <T>(name: string, body: Record<string, unknown>) => {
      expect(name).toBe("get_live_brand_mark");
      expect(body).toEqual({
        p_site_id: site.siteId,
        p_asset_id: EXACT_LOGO_ASSET_ID,
      });
      return [
        {
          asset_id: EXACT_LOGO_ASSET_ID,
          src: "",
          alt: "Radhika Dental identity",
          width: 600,
          height: 100,
        },
      ] as T;
    };
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/rest/v1/assets") {
        expect(url.searchParams.get("workspace_id")).toBe(
          `eq.${site.workspaceId}`,
        );
        return Response.json([
          {
            id: EXACT_LOGO_ASSET_ID,
            workspace_id: site.workspaceId,
            source: "user-upload",
            kind: "logo",
            storage_provider: "supabase",
            original_storage_key: objectKey,
          },
        ]);
      }
      expect(url.pathname).toBe(
        `/storage/v1/object/sign/workspace-assets/${objectKey}`,
      );
      expect(new Headers(init?.headers).get("apikey")).toBe(
        "sb_secret_live_test",
      );
      return Response.json({
        signedUrl: "/object/sign/workspace-assets/logo.svg?token=live",
      });
    };

    await expect(
      resolveLiveBrandMarkForSite(site, {
        rpc,
        supabaseUrl: "https://assets.example.test",
        secretKey: "sb_secret_live_test",
        fetcher,
      }),
    ).resolves.toEqual({
      assetId: EXACT_LOGO_ASSET_ID,
      src: "https://assets.example.test/storage/v1/object/sign/workspace-assets/logo.svg?token=live",
      alt: "Radhika Dental identity",
      width: 600,
      height: 100,
    });
  });

  test("never uses the private asset reader for an unauthenticated preview", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const oldUrl = process.env.MICIRQL_SUPABASE_URL;
    const oldSecret = process.env.MICIRQL_SUPABASE_SECRET_KEY;
    const oldDraftStore = process.env.MICIRQL_DRAFT_STORE;
    const originalFetch = globalThis.fetch;
    let privateAssetReads = 0;
    process.env.MICIRQL_SUPABASE_URL = "https://assets.example.test";
    process.env.MICIRQL_SUPABASE_SECRET_KEY = "test-secret";
    process.env.MICIRQL_DRAFT_STORE = "memory";
    globalThis.fetch = async () => {
      privateAssetReads += 1;
      return Response.json([]);
    };

    try {
      const response = await renderPreview(
        new Request("https://builder.micirql.test/api/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site, path: "/" }),
        }),
      );
      const payload = (await response.json()) as {
        issues?: Array<{ code?: string }>;
      };

      expect(response.status).toBe(503);
      expect(payload.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "PUBLISH_SUPABASE_DRAFT_STORE_REQUIRED",
          }),
        ]),
      );
      expect(privateAssetReads).toBe(0);
    } finally {
      restoreEnvironment("MICIRQL_SUPABASE_URL", oldUrl);
      restoreEnvironment("MICIRQL_SUPABASE_SECRET_KEY", oldSecret);
      restoreEnvironment("MICIRQL_DRAFT_STORE", oldDraftStore);
      globalThis.fetch = originalFetch;
    }
  });

  test("live runtime renders the exact resolved logo and fails closed when it cannot resolve", async () => {
    const site = siteFixture(EXACT_LOGO_ASSET_ID);
    const resolved = resolvedBrandMark(EXACT_LOGO_ASSET_ID, 600, 100);
    const store = {
      async resolveHostname() {
        return { siteId: site.siteId };
      },
      async getPublishedSite() {
        return {
          siteId: site.siteId,
          versionId: "brand-logo-live-version",
          snapshot: site,
        };
      },
    };

    const response = await handleLiveRequest(
      new Request("https://radhika-dental.example/"),
      {
        store,
        registry,
        functions,
        brandMarks: {
          async resolve() {
            return resolved;
          },
        },
        renderPage(page) {
          return page.sections
            .map((section) => JSON.stringify(section.props.brandMark ?? null))
            .join("\n");
        },
      },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(EXACT_LOGO_ASSET_ID);

    const unresolved = await handleLiveRequest(
      new Request("https://radhika-dental.example/"),
      {
        store,
        registry,
        functions,
        brandMarks: {
          async resolve() {
            return undefined;
          },
        },
        renderPage() {
          throw new Error("Unresolved logos must never reach rendering.");
        },
      },
    );
    expect(unresolved.status).toBe(500);
    expect(unresolved.headers.get("cache-control")).toBe("no-store");
  });
});

function requiredCatalogEntry(family: SectionFamily) {
  const entry = seedSectionCatalog.find(
    (candidate) =>
      candidate.family === family &&
      candidate.theme === "minimalist" &&
      candidate.variant === 1,
  );
  if (!entry) throw new Error(`Missing ${family} contract fixture.`);
  return entry;
}

function resolvedBrandMark(
  assetId: string,
  width: number,
  height: number,
): ResolvedBrandMark {
  return {
    assetId,
    src: svgDataUrl(width, height, "resolved"),
    alt: `${BUSINESS_NAME} logo`,
    width,
    height,
  };
}

function svgDataUrl(width: number, height: number, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#155e75"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="20">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function siteFixture(logoAssetId?: string): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "site-brand-logo-contract",
    workspaceId: "workspace-brand-logo-contract",
    name: BUSINESS_NAME,
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        ...(logoAssetId ? { logoAssetId } : {}),
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
        typography: {
          display: "Arial",
          body: "Arial",
          ui: "Arial",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Request a dental appointment",
      targetLocations: ["Haliya, Telangana"],
      priorityTopics: ["dentistry"],
      audiences: ["local patients"],
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
            id: "navbar",
            component: {
              componentId: navbarCatalogEntry.id,
              version: navbarCatalogEntry.version,
            },
            props: { title: BUSINESS_NAME, items: [] },
            bindings: {},
            hidden: false,
          },
          {
            id: "footer",
            component: {
              componentId: footerCatalogEntry.id,
              version: footerCatalogEntry.version,
            },
            props: { title: BUSINESS_NAME, footerLinks: [] },
            bindings: {},
            hidden: false,
          },
        ],
        seo: {
          title: BUSINESS_NAME,
          description: "Dental care in Haliya, Telangana.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: ["Dentist"],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
    generation: {
      catalogVersion: "brand-logo-contract-v1",
      packStatus: "certified",
      candidateIds: [],
      ...(logoAssetId
        ? {
            brandInput: { logoAssetId, colors: {} },
            brandProvenance: { logo: "user-upload", colors: {} },
          }
        : {}),
    },
  });
}

function decodeFile(
  files: Awaited<ReturnType<typeof buildStaticProject>>,
  path: string,
) {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`Missing static export file ${path}.`);
  return new TextDecoder().decode(file.bytes);
}

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
