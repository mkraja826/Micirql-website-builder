import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  generatedLiveHostname,
  generatedLiveSiteId,
  liveResolverHostname,
  type Site,
} from "@micirql/schema";
import {
  createFunctionBindingResolver,
  registeredPublicFunctionsOrigin,
  selectPublicFormBinding,
} from "@micirql/renderer";
import { handleLiveRequest } from "@micirql/live-runtime";
import { defaultLiveUrl } from "@micirql/publisher";
import { createLiveProductionRegistry } from "../apps/live/production-registry";
import {
  createSupabaseFunctionRecord,
  handleProductionPublicFunctionRequest,
  handlePublicFunctionRequest,
  type PublicFunctionDependencies,
} from "../apps/live/function-gateway";
import {
  LIVE_SITE_SCRIPT,
  LIVE_SITE_STYLES,
} from "../apps/live/live-site-assets";

const PUBLIC_SITE_ID = "f9145920-ece1-4230-b90c-4d2b93f1e8f0";

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

test("generated live hostnames use a scoped route-safe suffix", () => {
  expect(defaultLiveUrl(site)).toBe("https://site-live-test-site.micirql.com");
  expect(generatedLiveSiteId("site-live-test-site.micirql.com")).toBe(
    "site-live-test",
  );
  expect(generatedLiveSiteId("builder.micirql.com")).toBeUndefined();
  expect(generatedLiveSiteId("news.micirql.com")).toBeUndefined();
  expect(
    generatedLiveSiteId("nested.example-site.micirql.com"),
  ).toBeUndefined();
  expect(generatedLiveSiteId("-site.micirql.com")).toBeUndefined();
  expect(generatedLiveHostname("f9145920-ece1-4230-b90c-4d2b93f1e8f0")).toBe(
    "f9145920-ece1-4230-b90c-4d2b93f1e8f0-site.micirql.com",
  );
  expect(
    liveResolverHostname(
      "f9145920-ece1-4230-b90c-4d2b93f1e8f0-site.micirql.com",
    ),
  ).toBe("f9145920-ece1-4230-b90c-4d2b93f1e8f0.micirql.com");
  expect(liveResolverHostname("clinic.example.com")).toBe("clinic.example.com");
});

test("absolute public function endpoints carry the immutable site identity", () => {
  expect(registeredPublicFunctionsOrigin("https://forms.micirql.com")).toBe(
    "https://forms.micirql.com",
  );
  expect(
    registeredPublicFunctionsOrigin("https://unregistered.micirql.com"),
  ).toBeUndefined();
  expect(
    registeredPublicFunctionsOrigin("https://forms.micirql.com/other"),
  ).toBeUndefined();
  const resolver = createFunctionBindingResolver({
    actionIds: ["appointment.request"],
    gatewayBasePath: "https://forms.micirql.com/api/functions/",
  });
  expect(
    resolver.endpointFor({
      siteId: "f9145920-ece1-4230-b90c-4d2b93f1e8f0",
      actionId: "appointment.request",
    }),
  ).toBe(
    "https://forms.micirql.com/api/functions/appointment.request?siteId=f9145920-ece1-4230-b90c-4d2b93f1e8f0",
  );
  const localResolver = createFunctionBindingResolver({
    actionIds: ["appointment.request"],
  });
  expect(
    localResolver.endpointFor({
      siteId: "ignored-for-relative-routes",
      actionId: "appointment.request",
    }),
  ).toBe("/api/functions/appointment.request");
});

test("public forms select the first supported binding deterministically", () => {
  const bindings = {
    action1: { actionId: "analytics.track", inputMap: {} },
    appointment2: { actionId: "appointment.request", inputMap: {} },
    submit: { actionId: "lead.create", inputMap: {} },
  };
  expect(selectPublicFormBinding(bindings)).toMatchObject({
    bindingName: "appointment2",
    binding: { actionId: "appointment.request" },
  });
  expect(selectPublicFormBinding(bindings, "submit")).toMatchObject({
    bindingName: "submit",
    binding: { actionId: "lead.create" },
  });
});

test("Cloudflare routes stay scoped away from existing MiCirql services", () => {
  const builderConfig = readFileSync("apps/builder/wrangler.jsonc", "utf8");
  const liveConfig = readFileSync("apps/live/wrangler.jsonc", "utf8");
  expect(builderConfig).toContain('"name": "micirql-website-builder"');
  expect(builderConfig).toContain('"pattern": "builder.micirql.com"');
  expect(builderConfig).toContain('"custom_domain": true');
  expect(builderConfig).toContain(
    '"MICIRQL_PUBLIC_FUNCTIONS_ORIGIN": "https://forms.micirql.com"',
  );
  expect(liveConfig).toContain('"pattern": "*-site.micirql.com/*"');
  expect(liveConfig).toContain('"pattern": "forms.micirql.com/*"');
  expect(liveConfig.match(/"zone_name": "micirql\.com"/g)).toHaveLength(2);
  expect(liveConfig).not.toContain('"pattern": "*.micirql.com/*"');
  expect(liveConfig).not.toContain('"pattern": "micirql.com/*"');
  expect(liveConfig).toContain(
    '"MICIRQL_PUBLIC_FUNCTIONS_ORIGIN": "https://forms.micirql.com"',
  );
  expect(liveConfig).toContain(
    '"name": "MICIRQL_PUBLIC_FUNCTION_RATE_LIMITER"',
  );
  expect(liveConfig).toContain('"name": "MICIRQL_NEWSLETTER_RATE_LIMITER"');
  expect(liveConfig).toContain('"name": "MICIRQL_PREFLIGHT_RATE_LIMITER"');
  const namespaceIds = [...liveConfig.matchAll(/"namespace_id": "(\d+)"/g)].map(
    (match) => match[1],
  );
  expect(namespaceIds).toHaveLength(3);
  expect(new Set(namespaceIds).size).toBe(3);
});

test("live registry resolves only approved production sections", async () => {
  const registry = createLiveProductionRegistry();
  await expect(
    registry.resolve("MIN-HERO-001", "1.0.0"),
  ).resolves.toBeDefined();
  await expect(
    registry.resolve("MIN-HERO-003", "1.0.0"),
  ).resolves.toBeUndefined();
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
          return {
            siteId: site.siteId,
            versionId: "version-7",
            snapshot: site,
          };
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
  expect(html).toContain("micirqlSubmissionKey");
  expect(html).toContain("white-space:normal");
  expect(html).toContain("@media(min-width:48rem) and (max-width:63.99rem)");
  expect(html).toContain('window.addEventListener("pageshow"');
  expect(html).toContain("button.disabled=false");
  expect(html).toContain('data-test="rendered"');
});

test("public function gateway accepts only actions bound to the published site", async () => {
  const publishedSite = structuredClone(site);
  publishedSite.siteId = PUBLIC_SITE_ID;
  publishedSite.pages[0]!.sections[0]!.bindings = {
    appointment: { actionId: "appointment.request", inputMap: {} },
  };
  const records: Array<Record<string, unknown>> = [];
  const dependencies: PublicFunctionDependencies = {
    ipHashSalt: "test-only-salt",
    async getPublishedSite(siteId) {
      return siteId === publishedSite.siteId
        ? { siteId, snapshot: publishedSite }
        : undefined;
    },
    async createRecord(input) {
      records.push(input);
      return {
        ...input,
        id: "record-1",
        createdAt: "2026-10-06T00:00:00.000Z",
      };
    },
    async writeAudit() {},
    async rateLimit() {
      return true;
    },
  };

  const response = await handlePublicFunctionRequest(
    new Request(
      `https://forms.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
          "cf-connecting-ip": "203.0.113.20",
        },
        body: new URLSearchParams({
          name: "Test Visitor",
          email: "visitor@example.com",
          message: "Please call me.",
          consent: "true",
          _idempotencyKey: "form-key-basic",
        }),
      },
    ),
    "appointment.request",
    dependencies,
  );
  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    data: { recordId: "record-1", status: "received" },
  });
  expect(records).toHaveLength(1);
  expect(records[0]?.idempotencyKey).toBe("form-key-basic");

  const unbound = await handlePublicFunctionRequest(
    new Request(
      `https://forms.micirql.com/api/functions/lead.create?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: "Test Visitor",
          email: "visitor@example.com",
        }),
      },
    ),
    "lead.create",
    dependencies,
  );
  expect(unbound.status).toBe(404);
  expect(records).toHaveLength(1);
});

test("public HTML forms normalize optional empty fields for every native request action", async () => {
  const cases: Array<{
    actionId: string;
    payload: Record<string, string>;
    omitted: string[];
  }> = [
    {
      actionId: "lead.create",
      payload: { message: "Please contact me.", phone: "" },
      omitted: ["phone"],
    },
    {
      actionId: "appointment.request",
      payload: { message: "Please contact me.", preferredDate: "" },
      omitted: ["preferredDate"],
    },
    {
      actionId: "reservation.request",
      payload: {
        requestedDate: "2026-11-01",
        requestedTime: "19:00",
        partySize: "2",
        phone: "",
      },
      omitted: ["phone"],
    },
    {
      actionId: "quote.request",
      payload: { service: "Kitchen renovation", budgetRange: "" },
      omitted: ["budgetRange"],
    },
    {
      actionId: "property.enquiry",
      payload: { propertyId: "LOT-42", enquiryType: "details", phone: "" },
      omitted: ["phone"],
    },
    {
      actionId: "demo.request",
      payload: { company: "", role: "" },
      omitted: ["company", "role"],
    },
    {
      actionId: "booking.request",
      payload: {
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
        guests: "2",
        roomPreference: "",
      },
      omitted: ["roomPreference"],
    },
    {
      actionId: "enrollment.enquiry",
      payload: { course: "", deliveryMode: "" },
      omitted: ["course", "deliveryMode"],
    },
  ];

  for (const testCase of cases) {
    const publishedSite = structuredClone(site);
    publishedSite.siteId = PUBLIC_SITE_ID;
    publishedSite.pages[0]!.sections[0]!.bindings = {
      submit: { actionId: testCase.actionId, inputMap: {} },
    };
    const records: Array<Record<string, unknown>> = [];
    const response = await handlePublicFunctionRequest(
      new Request(
        `https://forms.micirql.com/api/functions/${testCase.actionId}?siteId=${PUBLIC_SITE_ID}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            name: "Test Visitor",
            email: "visitor@example.com",
            consent: "true",
            ...testCase.payload,
          }),
        },
      ),
      testCase.actionId,
      {
        ipHashSalt: "test-only-salt",
        async getPublishedSite(siteId) {
          return { siteId, snapshot: publishedSite };
        },
        async createRecord(input) {
          records.push(input);
          return {
            ...input,
            id: `record-${testCase.actionId}`,
            createdAt: "2026-10-06T00:00:00.000Z",
          };
        },
        async writeAudit() {},
        async rateLimit() {
          return true;
        },
      },
    );
    expect(response.status, testCase.actionId).toBe(201);
    expect(records, testCase.actionId).toHaveLength(1);
    for (const field of testCase.omitted) {
      expect(
        records[0]?.payload,
        `${testCase.actionId} omits ${field}`,
      ).not.toHaveProperty(field);
    }
  }
});

test("public request actions reject submissions without explicit consent", async () => {
  const publishedSite = structuredClone(site);
  publishedSite.siteId = PUBLIC_SITE_ID;
  publishedSite.pages[0]!.sections[0]!.bindings = {
    submit: { actionId: "lead.create", inputMap: {} },
  };
  let writes = 0;
  const response = await handlePublicFunctionRequest(
    new Request(
      `https://forms.micirql.com/api/functions/lead.create?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: "Test Visitor",
          email: "visitor@example.com",
          message: "Please contact me.",
        }),
      },
    ),
    "lead.create",
    {
      ipHashSalt: "test-only-salt",
      async getPublishedSite(siteId) {
        return { siteId, snapshot: publishedSite };
      },
      async createRecord(input) {
        writes += 1;
        return {
          ...input,
          id: "should-not-write",
          createdAt: "2026-10-06T00:00:00.000Z",
        };
      },
      async writeAudit() {},
      async rateLimit() {
        return true;
      },
    },
  );
  expect(response.status).toBe(400);
  expect(writes).toBe(0);
});

test("public function gateway rate-limits before persisting", async () => {
  const publishedSite = structuredClone(site);
  publishedSite.siteId = PUBLIC_SITE_ID;
  publishedSite.pages[0]!.sections[0]!.bindings = {
    appointment: { actionId: "appointment.request", inputMap: {} },
  };
  let writes = 0;
  let publishedReads = 0;
  const response = await handlePublicFunctionRequest(
    new Request(
      `https://forms.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: "Test Visitor",
          email: "visitor@example.com",
        }),
      },
    ),
    "appointment.request",
    {
      ipHashSalt: "test-only-salt",
      async getPublishedSite(siteId) {
        publishedReads += 1;
        return { siteId, snapshot: publishedSite };
      },
      async createRecord(input) {
        writes += 1;
        return {
          ...input,
          id: "should-not-write",
          createdAt: "2026-10-06T00:00:00.000Z",
        };
      },
      async writeAudit() {},
      async rateLimit() {
        return false;
      },
    },
  );
  expect(response.status).toBe(429);
  expect(writes).toBe(0);
  expect(publishedReads).toBe(0);
});

test("public function gateway challenges on the forms host before persisting", async () => {
  const publishedSite = structuredClone(site);
  publishedSite.siteId = PUBLIC_SITE_ID;
  publishedSite.pages[0]!.sections[0]!.bindings = {
    appointment: { actionId: "appointment.request", inputMap: {} },
  };
  const records: Array<Record<string, unknown>> = [];
  const rateLimits: Array<{
    key: string;
    kind: string;
    limit: number;
    windowSeconds: number;
  }> = [];
  let verifiedToken: string | undefined;
  let verifyCalls = 0;
  const dependencies: PublicFunctionDependencies = {
    ipHashSalt: "turnstile-test-salt",
    turnstileSiteKey: "1x00000000000000000000AA",
    async verifyTurnstile(token, ip) {
      verifyCalls += 1;
      verifiedToken = token;
      return token === "verified-token" && ip === "203.0.113.20";
    },
    async getPublishedSite(siteId) {
      return siteId === publishedSite.siteId
        ? { siteId, snapshot: publishedSite }
        : undefined;
    },
    async createRecord(input) {
      records.push(input);
      return {
        ...input,
        id: "record-turnstile",
        createdAt: "2026-10-06T00:00:00.000Z",
      };
    },
    async writeAudit() {},
    async rateLimit(input) {
      rateLimits.push(input);
      return true;
    },
  };
  const endpoint = `https://forms.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}`;
  const challenge = await handlePublicFunctionRequest(
    new Request(endpoint, {
      method: "POST",
      headers: {
        accept: "text/html",
        "content-type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": "203.0.113.20",
        referer:
          "https://f9145920-ece1-4230-b90c-4d2b93f1e8f0-site.micirql.com/contact",
      },
      body: new URLSearchParams({
        name: "Test Visitor",
        email: "visitor@example.com",
        message: '\"><script>alert(1)</script>',
        consent: "true",
        _idempotencyKey: "form-key-turnstile",
      }),
    }),
    "appointment.request",
    dependencies,
  );
  expect(challenge.status).toBe(200);
  expect(challenge.headers.get("cache-control")).toBe("no-store");
  const challengeHtml = await challenge.text();
  expect(challengeHtml).toContain(
    "https://challenges.cloudflare.com/turnstile/v0/api.js",
  );
  expect(challengeHtml).toContain('name="email"');
  expect(challengeHtml).toContain('name="_idempotencyKey"');
  expect(challengeHtml).toContain('value="form-key-turnstile"');
  expect(challengeHtml).toContain('value="visitor@example.com"');
  expect(challengeHtml).not.toContain('name="sourcePage"');
  expect(challengeHtml).toContain(
    `action="https://forms.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}"`,
  );
  expect(challengeHtml).not.toContain("<script>alert(1)</script>");
  expect(challengeHtml).toContain(
    "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
  );
  expect(challengeHtml).not.toContain("turnstile-test-salt");
  expect(records).toHaveLength(0);
  expect(verifyCalls).toBe(0);
  expect(rateLimits[0]?.key).not.toContain("203.0.113.20");
  expect(rateLimits[0]?.key).toBe(
    `preflight:${await sha256("turnstile-test-salt:preflight:203.0.113.20")}`,
  );
  expect(rateLimits[0]).toMatchObject({
    kind: "preflight",
    limit: 20,
    windowSeconds: 60,
  });

  const accepted = await handlePublicFunctionRequest(
    new Request(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": "203.0.113.20",
      },
      body: new URLSearchParams({
        name: "Test Visitor",
        email: "visitor@example.com",
        message: "Please call me.",
        consent: "true",
        _idempotencyKey: "form-key-turnstile",
        sourcePage: "/contact",
        "cf-turnstile-response": "verified-token",
      }),
    }),
    "appointment.request",
    dependencies,
  );
  expect(accepted.status).toBe(201);
  expect(verifiedToken).toBe("verified-token");
  expect(verifyCalls).toBe(1);
  expect(records).toHaveLength(1);
  expect(records[0]?.idempotencyKey).toBe("form-key-turnstile");
  expect(records[0]?.payload).not.toHaveProperty("cf-turnstile-response");
  expect(records[0]?.payload).not.toHaveProperty("sourcePage");
  expect(rateLimits).toHaveLength(3);
  expect(rateLimits[1]).toMatchObject({
    kind: "preflight",
    limit: 20,
    windowSeconds: 60,
  });
  expect(rateLimits[2]).toMatchObject({
    kind: "action",
    limit: 8,
    windowSeconds: 60,
  });

  const missingToken = await handlePublicFunctionRequest(
    new Request(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": "203.0.113.20",
      },
      body: new URLSearchParams({
        name: "Test Visitor",
        email: "visitor@example.com",
      }),
    }),
    "appointment.request",
    dependencies,
  );
  expect(missingToken.status).toBe(403);
  expect(verifyCalls).toBe(1);
  expect(records).toHaveLength(1);

  const invalidToken = await handlePublicFunctionRequest(
    new Request(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": "203.0.113.20",
      },
      body: new URLSearchParams({
        name: "Test Visitor",
        email: "visitor@example.com",
        "cf-turnstile-response": "invalid-token",
      }),
    }),
    "appointment.request",
    dependencies,
  );
  expect(invalidToken.status).toBe(403);
  expect(verifyCalls).toBe(2);
  expect(records).toHaveLength(1);

  const wrongHost = await handlePublicFunctionRequest(
    new Request(
      `https://${PUBLIC_SITE_ID}-site.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          name: "Test Visitor",
          email: "visitor@example.com",
        }),
      },
    ),
    "appointment.request",
    dependencies,
  );
  expect(wrongHost.status).toBe(404);
  expect(records).toHaveLength(1);
});

test("production function gateway hides missing configuration details", async () => {
  const response = await handleProductionPublicFunctionRequest(
    new Request(
      `https://forms.micirql.com/api/functions/appointment.request?siteId=${PUBLIC_SITE_ID}`,
      {
        method: "POST",
        headers: { accept: "application/json" },
      },
    ),
    "appointment.request",
  );
  expect(response.status).toBe(503);
  const body = await response.text();
  expect(body).toContain("SERVICE_UNAVAILABLE");
  expect(body).not.toContain("MICIRQL_");
  expect(body).not.toContain("SUPABASE");
});

test("Supabase record persistence replays the existing row after an idempotency conflict", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    new Response(JSON.stringify({ code: "23505" }), { status: 409 }),
    Response.json([
      {
        id: "record-existing",
        created_at: "2026-10-06T00:00:00.000Z",
        status: "queued",
      },
    ]),
  ];
  const input = {
    workspaceId: "workspace-live-test",
    siteId: PUBLIC_SITE_ID,
    actionId: "appointment.request",
    actionVersion: "1.0.0",
    idempotencyKey: "appointment-123",
    payload: { name: "Test Visitor", consent: true },
    contactName: "Test Visitor",
    status: "received" as const,
  };

  const record = await createSupabaseFunctionRecord(
    "https://example.supabase.co",
    "test-secret-key",
    input,
    async (resource, init) => {
      requests.push({ url: resource.toString(), init });
      const response = responses.shift();
      if (!response) throw new Error("Unexpected request.");
      return response;
    },
  );

  expect(record).toEqual({
    ...input,
    id: "record-existing",
    createdAt: "2026-10-06T00:00:00.000Z",
    status: "queued",
  });
  expect(requests).toHaveLength(2);
  expect(requests[0]).toMatchObject({
    url: "https://example.supabase.co/rest/v1/site_function_records",
    init: {
      method: "POST",
      cache: "no-store",
    },
  });
  expect(JSON.parse(String(requests[0]!.init?.body))).toMatchObject({
    workspace_id: input.workspaceId,
    site_id: input.siteId,
    action_id: input.actionId,
    action_version: input.actionVersion,
    idempotency_key: input.idempotencyKey,
    payload: input.payload,
    status: "received",
  });
  const replayUrl = new URL(requests[1]!.url);
  expect(replayUrl.pathname).toBe("/rest/v1/site_function_records");
  expect(replayUrl.searchParams.get("site_id")).toBe(`eq.${input.siteId}`);
  expect(replayUrl.searchParams.get("action_id")).toBe(`eq.${input.actionId}`);
  expect(replayUrl.searchParams.get("idempotency_key")).toBe(
    `eq.${input.idempotencyKey}`,
  );
  expect(replayUrl.searchParams.get("select")).toBe("id,created_at,status");
  expect(replayUrl.searchParams.get("limit")).toBe("1");
  expect(requests[1]!.init).toMatchObject({ cache: "no-store" });
});

test("Supabase record persistence fails closed when an idempotency replay cannot be verified", async () => {
  const input = {
    workspaceId: "workspace-live-test",
    siteId: PUBLIC_SITE_ID,
    actionId: "appointment.request",
    actionVersion: "1.0.0",
    idempotencyKey: "appointment-123",
    payload: { name: "Test Visitor", consent: true },
    status: "received" as const,
  };
  let calls = 0;

  await expect(
    createSupabaseFunctionRecord(
      "https://example.supabase.co",
      "test-secret-key",
      input,
      async () => {
        calls += 1;
        return calls === 1
          ? new Response(null, { status: 409 })
          : Response.json([
              {
                id: "record-existing",
                created_at: "2026-10-06T00:00:00.000Z",
                status: "unexpected",
              },
            ]);
      },
    ),
  ).rejects.toThrow("Function record insert failed with 409.");
  expect(calls).toBe(2);
});

test("Supabase record persistence never performs a replay lookup without an idempotency key", async () => {
  let calls = 0;
  await expect(
    createSupabaseFunctionRecord(
      "https://example.supabase.co",
      "test-secret-key",
      {
        workspaceId: "workspace-live-test",
        siteId: PUBLIC_SITE_ID,
        actionId: "appointment.request",
        actionVersion: "1.0.0",
        payload: { name: "Test Visitor", consent: true },
        status: "received",
      },
      async () => {
        calls += 1;
        return new Response(null, { status: 409 });
      },
    ),
  ).rejects.toThrow("Function record insert failed with 409.");
  expect(calls).toBe(1);
});

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
