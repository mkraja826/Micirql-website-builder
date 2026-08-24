import type { APIRequestContext, Browser, BrowserContext, Page } from "@playwright/test";
import type { BackendImplementationContract } from "@micirql/schema";
import type {
  FullStackRuntimeProbeAdapter,
  FullStackRuntimeProbeStep,
  FullStackRuntimeProbeTarget,
} from "../apps/builder/app/full-stack-runtime-probe-executor";

export type FullStackProbeIdentity = { email: string; password: string };
export type FullStackPlaywrightProbeOptions = {
  browser: Browser;
  request: APIRequestContext;
  userA?: FullStackProbeIdentity;
  userB?: FullStackProbeIdentity;
  admin?: FullStackProbeIdentity;
};

const hook = (name: string) => `[data-micirql-probe="${name}"]`;

/** Browser/API adapter for generated preview applications.
 * Generated runtimes expose stable data-micirql-probe hooks; visual classes are never used for QA.
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

  async function marker(target: FullStackRuntimeProbeTarget, name: string, identity?: FullStackProbeIdentity) {
    const page = await pageFor(target, identity);
    const item = page.locator(hook(name));
    return (await item.count()) > 0 && await item.first().isVisible() ? pass() : fail(`${name} probe marker was not observed.`);
  }

  return {
    async runPrimaryUiWorkflow(target) {
      const page = await pageFor(target, options.userA);
      const submit = page.locator(hook("primary-submit"));
      if (!(await submit.count())) return fail("Generated app does not expose primary-submit probe hook.");
      const responsePromise = page.waitForResponse(
        (response) => response.request().method() !== "GET" && response.url().startsWith(target.appBaseUrl),
        { timeout: 10_000 },
      ).catch(() => undefined);
      await submit.first().click();
      const response = await responsePromise;
      const record = page.locator(hook("record-id"));
      if (await record.count()) {
        const attribute = await record.first().getAttribute("data-record-id");
        const text = (await record.first().textContent())?.trim();
        state.recordId = attribute ?? text ?? undefined;
      }
      const success = page.locator(hook("primary-success"));
      if (!(await success.count()) || !(await success.first().isVisible())) return fail("Primary workflow did not reach its success state.");
      if (response && !response.ok()) return fail(`Primary write returned HTTP ${response.status()}.`);
      return pass();
    },

    async verifyApiWrite(target, backend) {
      const route = preferredWriteRoute(backend);
      if (!route) return fail("Backend contract has no state-changing route to verify.");
      const response = await options.request.fetch(new URL(route.path, target.appBaseUrl).toString(), {
        method: route.method,
        data: { __micirql_probe: true },
        headers: { "x-micirql-probe": "1" },
      });
      return response.status() >= 200 && response.status() < 500 && response.status() !== 404
        ? pass()
        : fail(`Expected API route ${route.path}, received HTTP ${response.status()}.`);
    },

    async verifyDatabasePersistence(target) {
      return verifyRecord(await pageFor(target, options.userA), state.recordId, "Created record could not be observed after the UI write.");
    },

    async verifyReloadPersistence(target) {
      const page = await pageFor(target, options.userA);
      await page.reload({ waitUntil: "domcontentloaded" });
      return verifyRecord(page, state.recordId, "Created record disappeared after reload.");
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
      const route = backend.routes.find((candidate) => candidate.auth === "authenticated" || candidate.auth === "admin");
      if (!route) return pass();
      const response = await options.request.fetch(new URL(route.path, target.appBaseUrl).toString(), { method: route.method });
      return response.status() === 401 || response.status() === 403
        ? pass()
        : fail(`Protected route ${route.path} allowed anonymous access (HTTP ${response.status()}).`);
    },

    async verifyCrossUserIsolation(target) {
      if (!options.userA || !options.userB) return fail("Two probe identities are required for cross-user isolation testing.");
      if (!state.recordId) return fail("No created record identifier was captured for isolation testing.");
      const page = await pageFor(target, options.userB);
      const record = page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`);
      return (await record.count()) === 0 ? pass() : fail("User B can observe User A's protected record.");
    },

    async verifyAdminVisibility(target) {
      if (!options.admin) return fail("Admin probe identity is required.");
      if (!state.recordId) return fail("No record identifier was captured for admin visibility testing.");
      const page = await pageFor(target, options.admin);
      await navigate(page, "admin-link");
      return (await page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`).count()) > 0
        ? pass()
        : fail("Admin UI cannot see the newly persisted record.");
    },

    async verifyAdminMutation(target) {
      if (!options.admin) return fail("Admin probe identity is required.");
      const page = await pageFor(target, options.admin);
      await navigate(page, "admin-link");
      const mutation = page.locator(hook("admin-mutate"));
      if (!(await mutation.count())) return fail("Admin mutation probe hook is missing.");
      await mutation.first().click();
      return visible(page, "admin-mutation-success") ? pass() : fail("Admin mutation did not persist successfully.");
    },

    async verifyBookingRoundTrip(target) { return marker(target, "booking-roundtrip-success", options.userA); },

    async verifyUploadRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = page.locator(hook("upload-input"));
      if (!(await input.count())) return fail("Upload input probe hook is missing.");
      await input.first().setInputFiles({ name: "micirql-probe.txt", mimeType: "text/plain", buffer: Buffer.from("MiCirql probe") });
      return visible(page, "upload-success") ? pass() : fail("Upload did not complete through the generated app.");
    },

    async verifyPaymentRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const trigger = page.locator(hook("payment-probe"));
      if (!(await trigger.count())) return fail("Payment probe hook is missing.");
      await trigger.first().click();
      return visible(page, "payment-success") ? pass() : fail("Payment round trip did not reach a verified success state.");
    },

    async verifySearchRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = page.locator(hook("search-input"));
      if (!(await input.count())) return fail("Search probe input is missing.");
      await input.first().fill("micirql-probe");
      return (await page.locator(hook("search-result")).count()) > 0 ? pass() : fail("Search did not return a generated backend result.");
    },

    async cleanup() {
      await Promise.allSettled([...contexts].map((context) => context.close()));
      contexts.clear();
    },
  };
}

async function signIn(page: Page, identity: FullStackProbeIdentity) {
  const email = page.locator(hook("auth-email"));
  const password = page.locator(hook("auth-password"));
  const submit = page.locator(hook("auth-submit"));
  if (!(await email.count()) || !(await password.count()) || !(await submit.count())) throw new Error("Generated authenticated app is missing stable auth probe hooks.");
  await email.first().fill(identity.email);
  await password.first().fill(identity.password);
  await submit.first().click();
  await page.locator(hook("auth-success")).first().waitFor({ state: "visible", timeout: 10_000 });
}

async function navigate(page: Page, name: string) {
  const link = page.locator(hook(name));
  if (!(await link.count())) throw new Error(`Missing ${name} probe hook.`);
  await link.first().click();
  await page.waitForLoadState("domcontentloaded");
}

async function visible(page: Page, name: string) {
  const locator = page.locator(hook(name));
  return (await locator.count()) > 0 && await locator.first().isVisible();
}

async function verifyRecord(page: Page, recordId: string | undefined, message: string) {
  const locator = recordId
    ? page.locator(`[data-micirql-record-id="${cssEscape(recordId)}"]`)
    : page.locator(hook("persisted-record"));
  return (await locator.count()) > 0 ? pass() : fail(message);
}

function preferredWriteRoute(backend: BackendImplementationContract) {
  return backend.routes.find((route) => route.method === "POST" && route.auth !== "webhook")
    ?? backend.routes.find((route) => ["POST", "PUT", "PATCH", "DELETE"].includes(route.method));
}
function pass(): FullStackRuntimeProbeStep { return { passed: true }; }
function fail(error: string): FullStackRuntimeProbeStep { return { passed: false, error }; }
function cssEscape(value: string) { return value.replace(/["\\]/g, "\\$&"); }
