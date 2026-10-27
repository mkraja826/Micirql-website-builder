import { expect, test } from "@playwright/test";
import type { ComponentType } from "react";
import { nativeFunctionCatalog } from "@micirql/functions";
import { handleLiveRequest } from "@micirql/live-runtime";
import {
  createFunctionBindingResolver,
  createStaticRendererRegistry,
  type PreparedPage,
} from "@micirql/renderer";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  seedSectionCatalog,
  seedSectionRegistryEntries,
} from "@micirql/sections";
import { POST as renderEditorPreview } from "../apps/builder/app/api/preview/route";
import {
  buildPortableExport,
  buildStaticProject,
  type StaticProjectFile,
} from "../apps/builder/app/api/publish/export-utils";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  RESTAURANT_DRAFT_PAGE_PATHS,
  applyRestaurantDraftCandidate,
  createRestaurantDraftScaffold,
  type RestaurantDraftBrief,
} from "../apps/builder/app/industry-packs/drafts";
import {
  resolveCertifiedIndustryPackForSite,
  restaurantIndustryPack,
} from "../apps/builder/app/industry-packs";

const PUBLIC_FUNCTIONS_ORIGIN = "https://forms.micirql.com";
const GENERATED_AT = "2026-10-26T00:00:00.000Z";
const SNAPSHOT_HASH = "e".repeat(64);

const registry = createStaticRendererRegistry({
  entries: seedSectionRegistryEntries,
  components: Object.fromEntries(
    seedSectionCatalog.map((entry) => {
      const Component: ComponentType<Record<string, unknown>> = () => null;
      return [entry.id, Component];
    }),
  ),
});

const liveFunctions = createFunctionBindingResolver({
  actionIds: nativeFunctionCatalog.map((definition) => definition.id),
  gatewayBasePath: `${PUBLIC_FUNCTIONS_ORIGIN}/api/functions`,
});

type EditorPreviewPayload = {
  ok?: boolean;
  pageId?: string;
  siteId?: string;
  subtype?: string;
  candidateId?: string;
  sections?: Array<{
    id: string;
    componentId: string;
    componentVersion: string;
    props: Record<string, unknown>;
  }>;
  seo?: {
    title: string;
    description: string;
    robots: string;
    structuredData: Record<string, unknown>[];
  };
  issues?: Array<{ code?: string; message?: string }>;
};

test.describe("archived Restaurant cross-surface parity audit", () => {
  test("all 20 candidates preserve content and action identity from editor preview through live preparation and portable export", async () => {
    test.setTimeout(180_000);
    expect(RESTAURANT_DRAFT_CANDIDATES).toHaveLength(20);
    expect(RESTAURANT_DRAFT_PAGE_PATHS).toHaveLength(6);

    for (const candidate of RESTAURANT_DRAFT_CANDIDATES) {
      const site = candidateSite(candidate.id, candidate.recipeId);
      expect(site.generation?.packStatus, candidate.id).toBe("unavailable");
      expect(site.generation?.premiumGate.passed, candidate.id).toBe(false);
      expect(
        resolveCertifiedIndustryPackForSite(site),
        `${candidate.id} identity must resolve to the certified Restaurant pack`,
      ).toBe(restaurantIndustryPack);

      const portable = buildPortableExport(
        published(site, candidate.recipeId),
        GENERATED_AT,
      );
      expect(portable.site, `${candidate.id} portable snapshot`).toEqual(site);
      expect(portable.site.generation?.selectedCandidateId).toBe(candidate.id);
      expect(portable.manifest.brandProvenance).toEqual(
        site.generation?.brandProvenance ?? null,
      );

      for (const path of RESTAURANT_DRAFT_PAGE_PATHS) {
        const editor = await editorPreview(site, path);
        expect(editor.siteId).toBe(site.siteId);
        expect(editor.subtype).toBe("restaurant");
        expect(editor.candidateId).toBe(candidate.id);

        let livePrepared: PreparedPage | undefined;
        const live = await handleLiveRequest(
          new Request(`https://${candidate.recipeId}.example.test${path}`),
          {
            store: {
              async resolveHostname() {
                return { siteId: site.siteId };
              },
              async getPublishedSite() {
                return {
                  siteId: site.siteId,
                  versionId: `restaurant-${candidate.recipeId}-v1`,
                  snapshot: site,
                };
              },
            },
            registry,
            functions: liveFunctions,
            renderPage(prepared) {
              livePrepared = prepared;
              return `<main data-parity-candidate="${candidate.recipeId}"></main>`;
            },
          },
        );

        expect(live.status, `${candidate.id} ${path} live status`).toBe(200);
        expect(
          livePrepared,
          `${candidate.id} ${path} live preparation`,
        ).toBeDefined();
        expect(editorProjection(editor)).toEqual(
          preparedProjection(livePrepared!),
        );
        expect(editor.seo).toMatchObject({
          title: livePrepared!.seo.title,
          description: livePrepared!.seo.description,
          robots: livePrepared!.seo.robots,
        });
        expect(originNeutralSeo(editor.seo!.structuredData)).toEqual(
          originNeutralSeo(livePrepared!.seo.structuredData),
        );
      }
    }
  });

  test("static export preserves identity, presentation, Restaurant conversion content and both form actions without certifying the pack", async () => {
    test.setTimeout(240_000);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10"><rect width="16" height="10" fill="#e8ddd2"/></svg>',
        {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
        },
      );

    try {
      for (const candidate of RESTAURANT_DRAFT_CANDIDATES) {
        const site = candidateSite(candidate.id, candidate.recipeId);
        const files = await buildStaticProject({
          published: published(site, candidate.recipeId),
          requestOrigin: "https://builder.micirql.com",
          publicFunctionsOrigin: PUBLIC_FUNCTIONS_ORIGIN,
          generatedAt: GENERATED_AT,
        });

        for (const path of RESTAURANT_DRAFT_PAGE_PATHS) {
          const page = site.pages.find((entry) => entry.path === path);
          expect(page, `${candidate.id} ${path} source page`).toBeDefined();
          const html = decodeFile(files, htmlPath(path));

          for (const token of staticVisibleTokens(page!, site.name)) {
            expect(
              html,
              `${candidate.id} ${path} static content token: ${token}`,
            ).toContain(escapeHtml(token));
          }
          for (const action of staticVisibleActions(page!)) {
            expect(
              html,
              `${candidate.id} ${path} action label: ${action.label}`,
            ).toContain(escapeHtml(action.label));
            expect(
              html,
              `${candidate.id} ${path} action target: ${action.href}`,
            ).toContain(`href="${escapeHtml(action.href)}"`);
          }

          const formCount = html.match(/<form id="contact-form"/g)?.length ?? 0;
          expect(formCount, `${candidate.id} ${path} form count`).toBe(
            path === "/reservations" || path === "/contact" ? 1 : 0,
          );
          if (path === "/reservations") {
            expect(html).toContain(
              `action="${escapeHtml(formEndpoint(site, "reservation.request"))}"`,
            );
            expect(html).toContain('name="requestedDate"');
            expect(html).toContain('name="requestedTime"');
            expect(html).toContain('name="partySize"');
            expect(html).toContain("Request a table");
            expect(html).toMatch(/does not confirm|not confirmed/i);
          }
          if (path === "/contact") {
            expect(html).toContain(
              `action="${escapeHtml(formEndpoint(site, "lead.create"))}"`,
            );
            expect(html).not.toContain('name="requestedDate"');
            expect(html).not.toContain('name="requestedTime"');
            expect(html).not.toContain('name="partySize"');
            expect(html).toContain("Send enquiry");
          }
        }

        expect(staticExportBlockers(files, site)).toEqual([]);
        expect(site.generation?.packStatus).toBe("unavailable");
        expect(site.generation?.premiumGate.passed).toBe(false);
        expect(resolveCertifiedIndustryPackForSite(site)).toBe(
          restaurantIndustryPack,
        );
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

function candidateSite(candidateId: string, recipeId: string): Site {
  const scaffold = createRestaurantDraftScaffold(
    baseSite(recipeId),
    PARITY_BRIEF,
  );
  return applyRestaurantDraftCandidate(scaffold, candidateId);
}

const PARITY_BRIEF: RestaurantDraftBrief = {
  businessName: "Parity Supper Room",
  cuisines: ["Contemporary Indian", "Regional Indian"],
  serviceModes: ["Lunch", "Dinner", "Dine-in"],
  menu: {
    suppliedAsCurrent: true,
    categories: [
      {
        name: "Small plates",
        items: [
          {
            name: "Pepper mushroom roast",
            description: "Mushroom, black pepper and curry leaf.",
            price: "340",
            currency: "INR",
          },
          {
            name: "Millet cutlet",
            description: "Millet, vegetables and mint chutney.",
            price: "290",
            currency: "INR",
          },
        ],
      },
      {
        name: "From the kitchen",
        items: [
          {
            name: "Smoked tomato rice",
            description: "Rice, smoked tomato and roasted peanuts.",
            price: "460",
            currency: "INR",
            disclosures: ["Contains peanuts"],
          },
          {
            name: "Pepper chicken curry",
            description: "Chicken, black pepper and curry leaf.",
            price: "560",
            currency: "INR",
          },
        ],
      },
    ],
    notes: ["This current menu was supplied for the parity fixture."],
    disclosureNotes: [
      "Tell the restaurant about allergies or dietary needs before ordering.",
    ],
  },
  address: "Banjara Hills, Hyderabad, Telangana",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Banjara+Hills+Hyderabad",
  directions: ["Use the east entrance beside the public garden."],
  openingHours: [
    "Monday–Thursday, 12:00 PM–10:30 PM",
    "Friday–Sunday, 12:00 PM–11:00 PM",
  ],
  accessibility: ["A step-free entrance is available"],
  parking: ["Paid parking is available in the neighbouring car park"],
  transit: ["The nearest bus stop is on Road No. 12"],
  visitDetails: ["Indoor dining is available during the supplied hours."],
  phone: "+91 40 4000 2026",
  email: "hello@paritysupper.example",
  reservationPolicy: [
    "A submitted request is not a confirmed reservation.",
    "The restaurant responds separately after checking availability.",
  ],
  partyDetails: ["Include the party size and preferred time in the request."],
  specialRequestNotes: [
    "Add seating, dietary or access requests to the message.",
  ],
  story: {
    heading: "A supplied story for the parity fixture",
    paragraphs: [
      "Parity Supper Room uses a short current menu designed for sharing.",
    ],
    principles: [
      "Keep supplied facts readable",
      "Separate request and confirmation",
    ],
    people: [
      {
        name: "Mira Rao",
        role: "Host",
        biography: "Mira coordinates table requests and arrival questions.",
        verified: true,
      },
    ],
  },
  goals: ["Read the menu and request a table"],
  languages: ["en"],
};

function baseSite(recipeId: string): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `restaurant-surface-${recipeId}`,
    workspaceId: "restaurant-surface-parity-workspace",
    name: "Restaurant surface parity",
    domain: "landing-page",
    theme: {
      family: "editorial",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#7A2E1F",
          secondary: "#25180F",
          accent: "#D39A37",
          background: "#FFF9F1",
          surface: "#FFFFFF",
          textPrimary: "#25180F",
          textSecondary: "#6B5A4B",
          border: "#D9C8B6",
          success: "#2F6B45",
          warning: "#8A5A18",
          error: "#B42318",
        },
        typography: {
          display: "Source Serif 4, Georgia, serif",
          body: "Inter, Segoe UI, Arial, sans-serif",
          ui: "Inter, Segoe UI, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Explore the menu and request a table",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: false,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [],
        seo: {
          title: "Restaurant surface parity",
          description: "Restaurant surface parity fixture.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function published(site: Site, recipeId: string) {
  return {
    siteId: site.siteId,
    versionId: `restaurant-${recipeId}-v1`,
    snapshot: site,
    snapshotHash: SNAPSHOT_HASH,
  };
}

async function editorPreview(site: Site, path: string) {
  const response = await renderEditorPreview(
    new Request("https://builder.micirql.test/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ site, path }),
    }),
  );
  const payload = (await response.json()) as EditorPreviewPayload;
  expect(response.status, JSON.stringify(payload.issues ?? [])).toBe(200);
  expect(payload.ok).toBe(true);
  expect(payload.sections).toBeDefined();
  return payload;
}

function editorProjection(payload: EditorPreviewPayload) {
  return {
    pageId: payload.pageId,
    sections: payload.sections!.map((section) => ({
      id: section.id,
      componentId: section.componentId,
      componentVersion: section.componentVersion,
      props: parityProps(section.props),
    })),
  };
}

function preparedProjection(prepared: PreparedPage) {
  return {
    pageId: prepared.page.id,
    sections: prepared.sections.map(({ section, component, props }) => ({
      id: section.id,
      componentId: component.registry.id,
      componentVersion: component.registry.version,
      props: parityProps(props),
    })),
  };
}

function parityProps(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(parityProps);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      if (
        key === "image" ||
        key === "brandMark" ||
        key === "formAction" ||
        key.endsWith("ActionEndpoint")
      ) {
        return [];
      }
      return [[key, parityProps(item)]];
    }),
  );
}

function originNeutralSeo(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(originNeutralSeo);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      key === "url" ? [] : [[key, originNeutralSeo(item)]],
    ),
  );
}

function staticVisibleTokens(page: Site["pages"][number], siteName: string) {
  const tokens: string[] = [];
  for (const section of page.sections.filter((entry) => !entry.hidden)) {
    const family = sectionFamily(section.component.componentId);
    const props = section.props;
    if (family === "navbar") {
      pushText(tokens, props.title, siteName);
      pushItemTokens(tokens, props.items, false);
      pushActionLabel(tokens, props.primaryAction);
      continue;
    }
    if (family === "footer") {
      pushText(tokens, props.title, siteName);
      pushText(tokens, props.description);
      pushItemTokens(tokens, props.footerLinks, false);
      continue;
    }
    pushText(tokens, props.eyebrow);
    pushText(tokens, props.title, props.heading, props.brand, siteName);
    pushText(tokens, props.description, props.body);
    // The portable renderer treats gallery item titles as media metadata and
    // emits the verified image alt instead of visible captions.
    if (family !== "gallery") pushItemTokens(tokens, props.items, true);
    pushActionLabel(tokens, props.primaryAction);
    pushActionLabel(tokens, props.secondaryAction);
  }
  return [...new Set(tokens)];
}

function staticVisibleActions(page: Site["pages"][number]) {
  const actions: Array<{ label: string; href: string }> = [];
  for (const section of page.sections.filter((entry) => !entry.hidden)) {
    const props = section.props;
    for (const value of [props.primaryAction, props.secondaryAction]) {
      const action = actionValue(value);
      if (action) actions.push(action);
    }
    const family = sectionFamily(section.component.componentId);
    const links =
      family === "footer"
        ? props.footerLinks
        : family === "navbar"
          ? props.items
          : undefined;
    if (Array.isArray(links)) {
      for (const value of links) {
        if (!value || typeof value !== "object" || Array.isArray(value))
          continue;
        const item = value as Record<string, unknown>;
        const label = text(item.label) ?? text(item.title);
        const href = text(item.href) ?? text(item.url);
        if (label && href) actions.push({ label, href });
      }
    }
  }
  return actions;
}

function staticExportBlockers(files: StaticProjectFile[], site: Site) {
  const html = files
    .filter((file) => file.path.endsWith(".html"))
    .map((file) => new TextDecoder().decode(file.bytes));
  const css = decodeFile(files, "assets/site.css");
  const candidateId = site.generation?.selectedCandidateId;
  const blockers = new Set<string>();
  if (
    html.some((document) => !document.includes('data-mi-subtype="restaurant"'))
  ) {
    blockers.add("STATIC_SUBTYPE_IDENTITY_MISSING");
  }
  if (
    html.some(
      (document) => !document.includes(`data-mi-candidate="${candidateId}"`),
    )
  ) {
    blockers.add("STATIC_CANDIDATE_IDENTITY_MISSING");
  }
  if (
    !css.includes('[data-mi-subtype="restaurant"]') ||
    !candidateId ||
    !css.includes(
      `[data-mi-subtype="restaurant"][data-mi-candidate="${candidateId}"]`,
    )
  ) {
    blockers.add("STATIC_RESTAURANT_STYLES_MISSING");
  }
  return [...blockers].sort();
}

function formEndpoint(site: Site, actionId: string) {
  const endpoint = new URL(
    `/api/functions/${actionId}`,
    PUBLIC_FUNCTIONS_ORIGIN,
  );
  endpoint.searchParams.set("siteId", site.siteId);
  return endpoint.toString();
}

function pushItemTokens(
  tokens: string[],
  value: unknown,
  includeDescription: boolean,
) {
  if (!Array.isArray(value)) return;
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    pushText(tokens, item.title, item.label, item.name);
    if (includeDescription) pushText(tokens, item.description, item.body);
  }
}

function pushActionLabel(tokens: string[], value: unknown) {
  const action = actionValue(value);
  if (action) tokens.push(action.label);
}

function actionValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const record = value as Record<string, unknown>;
  const label = text(record.label);
  const href = text(record.href);
  return label && href ? { label, href } : undefined;
}

function pushText(tokens: string[], ...values: unknown[]) {
  const value = values.map(text).find(Boolean);
  if (value) tokens.push(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sectionFamily(componentId: string) {
  const code = componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  return {
    NAV: "navbar",
    HERO: "hero",
    ABOUT: "about",
    SERV: "services",
    FEAT: "features",
    PROC: "process",
    TEST: "testimonials",
    GALL: "gallery",
    TEAM: "team",
    CTA: "cta",
    CONT: "contact",
    FOOT: "footer",
  }[code ?? ""];
}

function htmlPath(path: string) {
  return path === "/" ? "index.html" : `${path.slice(1)}/index.html`;
}

function decodeFile(files: StaticProjectFile[], path: string) {
  const file = files.find((entry) => entry.path === path);
  if (!file) throw new Error(`Missing static export file ${path}.`);
  return new TextDecoder().decode(file.bytes);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
