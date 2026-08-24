import type { APIRequestContext, Browser, BrowserContext, Locator, Page } from "@playwright/test";
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

type ProbeCapability = "primary" | "booking" | "auth" | "admin" | "upload" | "payment" | "search";

const hook = (name: string) => `[data-micirql-probe="${name}"]`;
const capabilitySection = (capability: ProbeCapability) =>
  `[data-micirql-probe-capabilities*="${capability}"]`;

export const semanticProbeSelectorCandidates = {
  primarySubmit: ["button[type=submit]", "input[type=submit]", "button"],
  authEmail: ["input[type=email]", "input[name*=email i]", "input[autocomplete=email]"],
  authPassword: ["input[type=password]", "input[name*=password i]", "input[autocomplete=current-password]"],
  authSubmit: ["button[type=submit]", "input[type=submit]", "button"],
  adminLink: ["a[href*=admin i]", "a[href*=dashboard i]", "button"],
  adminMutation: ["button[type=submit]", "input[type=submit]", "button"],
  uploadInput: ["input[type=file]"],
  paymentTrigger: ["button[type=submit]", "input[type=submit]", "button", "a[href*=checkout i]"],
  searchInput: ["input[type=search]", "input[name=q]", "input[name*=search i]", "input[placeholder*=search i]"],
} as const;

/** Browser/API adapter for generated preview applications.
 * Explicit data-micirql-probe hooks remain supported, while generated sections
 * can now be driven through renderer-owned capability metadata plus semantic
 * HTML controls. Visual classes and visible copy are never used for QA.
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
      const submit = await control(page, "primary-submit", "primary", semanticProbeSelectorCandidates.primarySubmit);
      if (!submit) return fail("Generated app exposes neither a primary-submit hook nor a semantic submit control in a primary section.");
      const responsePromise = page.waitForResponse(
        (response) => response.request().method() !== "GET" && response.url().startsWith(target.appBaseUrl),
        { timeout: 10_000 },
      ).catch(() => undefined);
      await submit.click();
      const response = await responsePromise;
      const record = page.locator(hook("record-id"));
      if (await record.count()) {
        const attribute = await record.first().getAttribute("data-record-id");
        const text = (await record.first().textContent())?.trim();
        state.recordId = attribute ?? text ?? undefined;
      }
      const success = page.locator(hook("primary-success"));
      if ((await success.count()) && !(await success.first().isVisible())) return fail("Primary workflow success marker exists but is not visible.");
      if (response && !response.ok()) return fail(`Primary write returned HTTP ${response.status()}.`);
      if (!response && !(await success.count())) return fail("Primary workflow produced neither a write response nor an explicit success marker.");
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
      await navigate(page, "admin-link", "admin", semanticProbeSelectorCandidates.adminLink);
      return (await page.locator(`[data-micirql-record-id="${cssEscape(state.recordId)}"]`).count()) > 0
        ? pass()
        : fail("Admin UI cannot see the newly persisted record.");
    },

    async verifyAdminMutation(target) {
      if (!options.admin) return fail("Admin probe identity is required.");
      const page = await pageFor(target, options.admin);
      await navigate(page, "admin-link", "admin", semanticProbeSelectorCandidates.adminLink);
      const mutation = await control(page, "admin-mutate", "admin", semanticProbeSelectorCandidates.adminMutation);
      if (!mutation) return fail("Admin mutation control could not be discovered.");
      await mutation.click();
      return visible(page, "admin-mutation-success") ? pass() : fail("Admin mutation did not persist successfully.");
    },

    async verifyBookingRoundTrip(target) {
      if (await visible(await pageFor(target, options.userA), "booking-roundtrip-success")) return pass();
      const page = await pageFor(target, options.userA);
      const bookingSection = page.locator(capabilitySection("booking"));
      if (!(await bookingSection.count())) return fail("Generated app has no instrumented booking section.");
      const submit = await firstSemanticControl(bookingSection.first(), semanticProbeSelectorCandidates.primarySubmit);
      if (!submit) return fail("Booking section has no semantic submit control.");
      const responsePromise = page.waitForResponse(
        (response) => response.request().method() !== "GET" && response.url().startsWith(target.appBaseUrl),
        { timeout: 10_000 },
      ).catch(() => undefined);
      await submit.click();
      const response = await responsePromise;
      if (await visible(page, "booking-roundtrip-success")) return pass();
      return response?.ok() ? pass() : fail("Booking round trip did not produce a successful write response.");
    },

    async verifyUploadRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = await control(page, "upload-input", "upload", semanticProbeSelectorCandidates.uploadInput);
      if (!input) return fail("Upload input could not be discovered in the generated app.");
      await input.setInputFiles({ name: "micirql-probe.txt", mimeType: "text/plain", buffer: Buffer.from("MiCirql probe") });
      return visible(page, "upload-success") ? pass() : fail("Upload did not complete through the generated app.");
    },

    async verifyPaymentRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const trigger = await control(page, "payment-probe", "payment", semanticProbeSelectorCandidates.paymentTrigger);
      if (!trigger) return fail("Payment control could not be discovered in the generated app.");
      await trigger.click();
      return visible(page, "payment-success") ? pass() : fail("Payment round trip did not reach a verified success state.");
    },

    async verifySearchRoundTrip(target) {
      const page = await pageFor(target, options.userA);
      const input = await control(page, "search-input", "search", semanticProbeSelectorCandidates.searchInput);
      if (!input) return fail("Search input could not be discovered in the generated app.");
      await input.fill("micirql-probe");
      const explicitResult = page.locator(hook("search-result"));
      if (await explicitResult.count()) return pass();
      const searchSection = page.locator(capabilitySection("search")).first();
      const result = searchSection.locator("[role=listitem], article, li, tbody tr");
      return (await result.count()) > 0 ? pass() : fail("Search did not return a generated backend result.");
    },

    async cleanup() {
      await Promise.allSettled([...contexts].map((context) => context.close()));
      contexts.clear();
    },
  };
}

async function signIn(page: Page, identity: FullStackProbeIdentity) {
  const email = await control(page, "auth-email", "auth", semanticProbeSelectorCandidates.authEmail);
  const password = await control(page, "auth-password", "auth", semanticProbeSelectorCandidates.authPassword);
  const submit = await control(page, "auth-submit", "auth", semanticProbeSelectorCandidates.authSubmit);
  if (!email || !password || !submit) throw new Error("Generated authenticated app is missing a discoverable auth form.");
  await email.fill(identity.email);
  await password.fill(identity.password);
  await submit.click();
  const explicitSuccess = page.locator(hook("auth-success"));
  if (await explicitSuccess.count()) {
    await explicitSuccess.first().waitFor({ state: "visible", timeout: 10_000 });
  } else {
    await page.waitForLoadState("domcontentloaded");
  }
}

async function navigate(page: Page, name: string, capability: ProbeCapability, selectors: readonly string[]) {
  const link = await control(page, name, capability, selectors);
  if (!link) throw new Error(`Missing ${name} hook and no semantic ${capability} navigation control was found.`);
  await link.click();
  await page.waitForLoadState("domcontentloaded");
}

async function control(page: Page, explicitHook: string, capability: ProbeCapability, selectors: readonly string[]): Promise<Locator | undefined> {
  const explicit = page.locator(hook(explicitHook));
  if (await explicit.count()) return explicit.first();
  const sections = page.locator(capabilitySection(capability));
  for (let index = 0; index < await sections.count(); index += 1) {
    const found = await firstSemanticControl(sections.nth(index), selectors);
    if (found) return found;
  }
  return undefined;
}

async function firstSemanticControl(scope: Locator, selectors: readonly string[]): Promise<Locator | undefined> {
  for (const selector of selectors) {
    const candidate = scope.locator(selector);
    if (await candidate.count()) return candidate.first();
  }
  return undefined;
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
