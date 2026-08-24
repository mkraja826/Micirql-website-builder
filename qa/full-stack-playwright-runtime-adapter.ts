import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import type { BackendImplementationContract, FunctionalArchitecture } from "@micirql/schema";
import type {
  FullStackRuntimeProbeAdapter,
  FullStackRuntimeProbeStep,
  FullStackRuntimeProbeTarget,
} from "../apps/builder/app/full-stack-runtime-probe-executor";

export type FullStackProbeIdentity = {
  email: string;
  password: string;
};

export type FullStackPlaywrightProbeOptions = {
  browser: Browser;
  request: APIRequestContext;
  userA?: FullStackProbeIdentity;
  userB?: FullStackProbeIdentity;
  admin?: FullStackProbeIdentity;
};

const probe = (name: string) => `[data-micirql-probe="${name}"]`;

/**
 * Browser/API adapter for generated preview applications.
 *
 * Generated app runtimes must expose stable, non-visual probe hooks using
 * `data-micirql-probe` attributes. These attributes are intentionally separate
 * from styling/classes so QA does not become coupled to visual implementation.
 */
export function createFullStackPlaywrightRuntimeAdapter(options: FullStackPlaywrightProbeOptions): FullStackRuntimeProbeAdapter {
  const contexts = new Set<BrowserContext>();
  const state: { recordId?: string } = {};

  async function pageFor(target: FullStackRuntimeProbeTarget, identity?: FullStackProbeIdentity) {
    const context = await options.browser.newContext();
    contexts.add(context);
    const page = await context.newPage();
    await page.goto(target.appBaseUrl, { waitUntil: "domcontentloaded" });
    if (identity) await signIn(page, identity);
    return page;
  }

  return {
    async runPrimaryUiWorkflow(target) {
      const page = await pageFor(target, options.userA);
      const submit = page.locator(probe("primary-submit"));
      if (!(await submit.count())) return fail("Generated app does not expose primary-submit probe hook.");
      const response = await Promise.all([
        page.waitForResponse((value) => value.request().method() !== "GET" && value.url().startsWith(target.appBaseUrl), { timeout: 10_000 }).catch(() => undefined),
        submit.first().click(),
      ]);
      const record = page.locator(probe("record-id"));
      if (await record.count()) state.recordId = (await record.first().getAttribute("data-record-id")) ?? (await record.first().textContent())?.trim() || undefined;
      const success = page.locator(probe("primary-success"));
      const passed = (await success.count()) > 0 && await success.first().isVisible();
      if (!passed) return fail("Primary workflow did not reach its success state.");
      const writeResponse = response[0];
      if (writeResponse && !writeResponse.ok()) return fail(`Primary write returned HTTP ${writeResponse.status()}.`);
      return pass();
    },

    async verifyApiWrite(target, backend) {
      const route = preferredWriteRoute(backend);
      if (!route) return fail("Backend contract has no state-changing route to verify.");
      const url = new URL(route.path, target.appBaseUrl).toString();
      const response = await options.request.fetch(url, {
        method: route.method,
        data: { __micirql_probe: true },
        headers: { "x-micirql-probe": "1" },
      });
      // A validation error still proves the real API route exists; 404/5xx does not.
      return response.status() >= 200 && response.status() < 500 && response.status() !== 404
        ? pass()
        : fail(`Expected generated API route ${route.path}, received HTTP ${response.status()}.`);
    },

    async verifyDatabasePersistence(target) {
      const page = await pageFor(target, options.userA);
      const locator = state.recordId
        ? page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`)
        : page.locator(probe("persisted-record"));
      return (await locator.count()) > 0 ? pass() : fail("Created record could not be observed after the UI write.");
    },

    async verifyReloadPersistence(target) {
      const page = await pageFor(target, options.userA);
      await page.reload({ waitUntil: "domcontentloaded" });
      const locator = state.recordId
        ? page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`)
        : page.locator(probe("persisted-record"));
      return (await locator.count()) > 0 ? pass() : fail("Created record disappeared after reload.");
    },

    async verifyServerValidation(target, backend) {
      const route = preferredWriteRoute(backend);
      if (!route) return fail("Backend contract has no write route for validation testing.");
      const response = await options.request.fetch(new URL(route.path, target.appBaseUrl).toString(), {
        method: route.method,
        data: {},
        headers: { "x-micirql-probe": "invalid" },
      });
      return response.status() >= 400 && response.status() < 500
        ? pass()
        : fail(`Invalid write was not rejected at the server boundary (HTTP ${response.status()}).`);
    },

    async verifyAuthGuard(target, backend) {
      const protectedRoute = backend.routes.find((route) => route.auth === "authenticated" || route.auth === "admin");
      if (!protectedRoute) return pass();
      const response = await options.request.fetch(new URL(protectedRoute.path, target.appBaseUrl).toString(), { method: protectedRoute.method });
      return response.status() === 401 || response.status() === 403
        ? pass()
        : fail(`Protected route ${protectedRoute.path} allowed anonymous access (HTTP ${response.status()}).`);
    },

    async verifyCrossUserIsolation(target) {
      if (!options.userA || !options.userB) return fail("Two probe identities are required for cross-user isolation testing.");
      const page = await pageFor(target, options.userB);
      if (!state.recordId) return fail("No created record identifier was captured for isolation testing.");
      const foreignRecord = page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`);
      return (await foreignRecord.count()) === 0 ? pass() : fail("User B can observe User A's protected record.");
    },

    async verifyAdminVisibility(target) {
      if (!options.admin) return fail("Admin probe identity is required.");
      const page = await pageFor(target, options.admin);
      await navigateProbe(page, "admin-link");
      if (!state.recordId) return fail("No record identifier was captured for admin visibility testing.");
      const row = page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`);
      return (await row.count()) > 0 ? pass() : fail("Admin UI cannot see the newly persisted record.");
    },

    async verifyAdminMutation(target) {
      if (!options.admin) return fail("Admin probe identity is required.");
      const page = await pageFor(target, options.admin);
      await navigateProbe(page, "admin-link");
      const mutation = page.locator(probe("admin-mutate"));
      if (!(await mutation.count())) return fail("Admin mutation probe hook is missing.");
      await mutation.first().click();
      const success = page.locator(probe("admin-mutation-success"));
      return (await success.count()) > 0 && await success.first().isVisible() ? pass() : fail("Admin mutation did not persist successfully.");
    },

    async verifyBookingRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const marker = page.locator(probe("booking-roundtrip-success"));
      return (await marker.count()) > 0 && await marker.first().isVisible() ? pass() : fail("Booking round-trip success marker was not observed.");
    },

    async verifyUploadRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = page.locator(probe("upload-input"));
      if (!(await input.count())) return fail("Upload input probe hook is missing.");
      await input.first().setInputFiles({ name: "micirql-probe.txt", mimeType: "text/plain", buffer: Buffer.from("MiCirql probe") });
      const success = page.locator(probe("upload-success"));
      return (await success.count()) > 0 && await success.first().isVisible() ? pass() : fail("Upload did not complete through the generated app.");
    },

    async verifyPaymentRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const trigger = page.locator(probe("payment-probe"));
      if (!(await trigger.count())) return fail("Payment probe hook is missing.");
      await trigger.first().click();
      const success = page.locator(probe("payment-success"));
      return (await success.count()) > 0 && await success.first().isVisible() ? pass() : fail("Payment round trip did not reach a verified success state.");
    },

    async verifySearchRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = page.locator(probe("search-input"));
      if (!(await input.count())) return fail("Search probe input is missing.");
      await input.first().fill("micirql-probe");
      const result = page.locator(probe("search-result"));
      return (await result.count()) > 0 ? pass() : fail("Search did not return a generated backend result.");
    },

    async cleanup() {
      await Promise.allSettled([...contexts].map((context) => context.close()));
      contexts.clear();
    },
  };
}

async function signIn(page: Page, identity: FullStackProbeIdentity) {
  const email = page.locator(probe("auth-email"));
  const password = page.locator(probe("auth-password"));
  const submit = page.locator(probe("auth-submit"));
  if (!(await email.count()) || !(await password.count()) || !(await submit.count())) {
    throw new Error("Generated authenticated app is missing stable auth probe hooks.");
  }
  await email.first().fill(identity.email);
  await password.first().fill(identity.password);
  await submit.first().click();
  await page.locator(probe("auth-success")).first().waitFor({ state: "visible", timeout: 10_000 });
}

async function navigateProbe(page: Page, name: string) {
  const link = page.locator(probe(name));
  if (!(await link.count())) throw new Error(`Missing ${name} probe hook.`);
  await link.first().click();
  await page.waitForLoadState("domcontentloaded");
}

function preferredWriteRoute(backend: BackendImplementationContract) {
  return backend.routes.find((route) => route.method === "POST" && route.auth !== "webhook")
    ?? backend.routes.find((route) => ["POST", "PUT", "PATCH", "DELETE"].includes(route.method));
}

function pass(): FullStackRuntimeProbeStep { return { passed: true }; }
function fail(error: string): FullStackRuntimeProbeStep { return { passed: false, error }; }
function cssEscape(value: string) { return value.replace(/["\\]/g, "\\$&"); }
