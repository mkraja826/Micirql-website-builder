import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expectProductBrand } from "./support/builder-product-brand";

const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "builder-product-chrome",
);

const DASHBOARD_OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "builder-project-dashboard",
);

const DASHBOARD_SESSION = {
  access_token: "dashboard-access-token",
  refresh_token: "dashboard-refresh-token",
  expires_in: 3600,
  expires_at: 4_102_444_800,
  token_type: "bearer",
  user: {
    id: "00000000-0000-4000-8000-000000000021",
    email: "dashboard@micirql.test",
  },
};

type DashboardProject = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  published_version_id: string | null;
  updated_at: string;
  draft: { revision: number; updated_at: string } | null;
  hostname: {
    hostname: string;
    status: string;
    ssl_status: string;
  } | null;
};

type DashboardHarness = {
  projects: DashboardProject[];
  requests: Array<{
    method: string;
    path: string;
    body?: Record<string, unknown>;
  }>;
  unexpected: string[];
  failNextLoad: boolean;
  holdInitialLoad?: Promise<void>;
};
const CANONICAL_MARK_SHA256 =
  "7B7B1D2DEBAC2BA38D1EAD35CEC3CD6CDBC3315BA5BF5633857DCEDD6397C136";

test.beforeAll(async () => {
  await Promise.all([
    mkdir(OUTPUT_DIRECTORY, { recursive: true }),
    mkdir(DASHBOARD_OUTPUT_DIRECTORY, { recursive: true }),
  ]);
});

test("uses the exact recovered official MiCirql mark", async () => {
  const mark = await readFile(
    path.resolve(
      process.cwd(),
      "apps",
      "builder",
      "public",
      "micirql-mark.svg",
    ),
  );
  expect(createHash("sha256").update(mark).digest("hex").toUpperCase()).toBe(
    CANONICAL_MARK_SHA256,
  );
});

test.describe("Builder product chrome: unauthenticated shell baseline", () => {
  for (const viewport of VIEWPORTS) {
    test(`sign-in and account-creation shell at ${viewport.width}px`, async ({
      page,
    }) => {
      const runtimeFailures: string[] = [];
      page.on("pageerror", (error) => runtimeFailures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeFailures.push(message.text());
      });

      await page.setViewportSize(viewport);
      await page.addInitScript(() => {
        window.localStorage.removeItem("micirql.supabase.session");
      });

      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(response?.ok(), "the Builder auth shell must render").toBeTruthy();
      await expect(page).toHaveTitle("MiCirql Builder");

      const shell = page.locator("main.auth-shell");
      const form = shell.locator("form.auth-card");
      const heading = form.getByRole("heading", { level: 1 });
      const email = form.getByLabel("Email");
      const password = form.getByLabel("Password");
      const submit = form.getByRole("button", { name: "Sign in", exact: true });
      const modeToggle = form.getByRole("button", {
        name: "Create an account",
        exact: true,
      });

      await expect(shell).toBeVisible();
      await expect(form).toBeVisible();
      await expectProductBrand(page);
      await expect(heading).toHaveText("Sign in to your builder");
      await expect(email).toHaveAttribute("autocomplete", "email");
      await expect(password).toHaveAttribute(
        "autocomplete",
        "current-password",
      );
      await expect(submit).toBeEnabled();
      await expect(modeToggle).toBeEnabled();
      expect(await page.locator("main").count()).toBe(1);
      expect(await page.locator("h1").count()).toBe(1);

      await settlePage(page);
      await expectResponsiveShell(page, viewport.width);
      await expectAccessible(page, `sign-in/${viewport.width}`);
      await capture(page, `sign-in-${viewport.width}`);
      await expectKeyboardPath(page, [email, password, submit, modeToggle]);

      await modeToggle.press("Enter");
      await expect(heading).toHaveText("Create your MiCirql account");
      await expect(password).toHaveAttribute("autocomplete", "new-password");
      await expect(
        form.getByRole("button", { name: "Create account", exact: true }),
      ).toBeEnabled();
      await expect(
        form.getByRole("button", {
          name: "Already have an account? Sign in",
          exact: true,
        }),
      ).toBeEnabled();

      await settlePage(page);
      await expectResponsiveShell(page, viewport.width);
      await expectAccessible(page, `account-creation/${viewport.width}`);
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
      await capture(page, `account-creation-${viewport.width}`);

      await page.emulateMedia({ reducedMotion: "reduce" });
      const animatedElements = await page
        .locator(".auth-shell *")
        .evaluateAll((elements) =>
          elements
            .map((element) => {
              const style = getComputedStyle(element);
              const hasMotion =
                style.animationName !== "none" ||
                style.transitionDuration
                  .split(",")
                  .some((duration) => Number.parseFloat(duration) > 0);
              return hasMotion
                ? `${element.tagName.toLowerCase()}.${element.className}`
                : null;
            })
            .filter((value): value is string => Boolean(value)),
        );
      expect(
        animatedElements,
        "the auth shell must honor reduced-motion preferences",
      ).toEqual([]);
      expect(
        runtimeFailures,
        "the auth shell must not log runtime errors",
      ).toEqual([]);
    });
  }
});

test.describe("Builder product chrome: authenticated project dashboard", () => {
  for (const viewport of VIEWPORTS) {
    test(`project dashboard at ${viewport.width}px`, async ({ page }) => {
      const state = createDashboardHarness();
      const runtimeFailures: string[] = [];
      page.on("pageerror", (error) => runtimeFailures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeFailures.push(message.text());
      });

      await page.setViewportSize(viewport);
      await installDashboardHarness(page, state);
      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(
        response?.ok(),
        "the authenticated dashboard must render",
      ).toBeTruthy();

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Build and manage your websites.",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: "All websites" }),
      ).toBeVisible();
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.getByLabel("MiCirql Website builder")).toBeVisible();
      const projectCards = page.getByRole("article");
      await expect(projectCards).toHaveCount(3);
      await expect(
        projectCards.getByText("Published", { exact: true }),
      ).toHaveCount(1);
      await expect(
        projectCards.getByText("Draft", { exact: true }),
      ).toHaveCount(2);
      await expect(
        projectCards.getByRole("group", { name: /project facts$/ }),
      ).toHaveCount(3);
      await expect(projectCards.first()).toContainText(
        "Saved draft · Revision 18",
      );
      await expect(projectCards.first()).toContainText(
        "Real preview in editor",
      );

      const radhikaFacts = page.getByRole("group", {
        name: "Radhika Dental project facts",
      });
      await expect(radhikaFacts).toContainText("MiCirql website project");
      await expect(radhikaFacts).toContainText("radhikadental.in");
      await expect(radhikaFacts).toContainText("Saved draft · Revision 18");

      const gentleFacts = page.getByRole("group", {
        name: "Gentle Smile project facts",
      });
      await expect(gentleFacts).toContainText("Domain not connected");
      await expect(gentleFacts).toContainText("Saved draft · Revision 6");

      const pearlFacts = page.getByRole("group", {
        name: "Pearl Orthodontics project facts",
      });
      await expect(pearlFacts).toContainText("pearlortho.in · setup pending");
      await expect(pearlFacts).toContainText("Saved draft · Revision 3");
      await expect(
        projectCards.getByText(/Real preview in editor/),
      ).toHaveCount(3);

      const summary = page.locator('dl[aria-label="Workspace summary"]');
      await expect(summary).toContainText("Websites3");
      await expect(summary).toContainText("Published1");
      await expect(summary).toContainText("In progress2");

      await settlePage(page);
      await expectResponsiveShell(page, viewport.width);
      await expectAccessible(page, `project-dashboard/${viewport.width}`);
      await expectVisibleFocus(
        page,
        page.getByRole("button", { name: "New website", exact: true }),
      );
      await expectVisibleFocus(
        page,
        page.getByRole("button", {
          name: "Open Radhika Dental in editor",
        }),
      );
      await expectReducedMotion(page, "project dashboard");
      await captureDashboard(page, `project-dashboard-${viewport.width}`);

      expect(
        state.unexpected,
        "all dashboard API requests must be mocked",
      ).toEqual([]);
      expect(
        state.requests.map(({ method, path }) => `${method} ${path}`),
      ).toEqual(["GET /api/projects"]);
      expect(
        runtimeFailures,
        "the dashboard must not log runtime errors",
      ).toEqual([]);
    });
  }

  test("project actions preserve API contracts and accessible dialog behavior", async ({
    page,
  }) => {
    const state = createDashboardHarness();
    await page.setViewportSize({ width: 1024, height: 768 });
    await installDashboardHarness(page, state);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("article")).toHaveCount(3);

    const renameTrigger = page.getByRole("button", {
      name: "Rename Radhika Dental",
    });
    await renameTrigger.click();
    const renameDialog = page.getByRole("dialog", { name: "Rename website" });
    const nameInput = renameDialog.getByLabel("Website name");
    await expect(nameInput).toBeFocused();
    await expect(page.locator("main")).toHaveAttribute("inert", "");
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(renameDialog).toBeHidden();
    await expect(renameTrigger).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe("");

    await renameTrigger.click();
    await nameInput.fill("Radhika Dental Studio");
    await renameDialog.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Renamed website to Radhika Dental Studio.",
    );
    await expect(
      page.getByRole("heading", { level: 3, name: "Radhika Dental Studio" }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Duplicate Radhika Dental Studio" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Radhika Dental Studio was duplicated.",
    );
    await expect(page.getByRole("article")).toHaveCount(4);

    const archiveTrigger = page.getByRole("button", {
      name: "Archive Gentle Smile",
    });
    await archiveTrigger.click();
    const archiveDialog = page.getByRole("dialog", {
      name: "Archive Gentle Smile?",
    });
    const archiveCancel = archiveDialog.getByRole("button", { name: "Cancel" });
    await expect(archiveCancel).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      archiveDialog.getByRole("button", { name: "Archive website" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(archiveDialog).toBeHidden();
    await expect(archiveTrigger).toBeFocused();

    await archiveTrigger.click();
    await archiveDialog
      .getByRole("button", { name: "Archive website" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Gentle Smile was archived.",
    );
    await expect(
      page.getByRole("heading", { level: 3, name: "Gentle Smile" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: "New website", exact: true })
      .click();
    const createDialog = page.getByRole("dialog", { name: "Create a website" });
    await createDialog.getByLabel("Website name").fill("Lakshmi Dental");
    await createDialog.getByRole("button", { name: "Create website" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Start with the business. We’ll shape the website.",
      }),
    ).toBeVisible();

    expect(
      state.requests.filter(({ method }) => method !== "GET"),
      "dashboard mutations must keep the established request bodies",
    ).toEqual([
      {
        method: "PATCH",
        path: "/api/projects",
        body: {
          siteId: "site-radhika",
          name: "Radhika Dental Studio",
        },
      },
      {
        method: "POST",
        path: "/api/projects",
        body: {
          action: "duplicate",
          workspaceId: "workspace-dashboard",
          siteId: "site-radhika",
          name: "Radhika Dental Studio Copy",
        },
      },
      {
        method: "PATCH",
        path: "/api/projects",
        body: { siteId: "site-gentle", archived: true },
      },
      {
        method: "POST",
        path: "/api/projects",
        body: { action: "create", name: "Lakshmi Dental" },
      },
    ]);
    expect(state.unexpected).toEqual([]);
  });

  test("loading, empty and recoverable error states remain truthful", async ({
    page,
  }) => {
    let releaseInitialLoad = () => {};
    const state = createDashboardHarness([]);
    state.holdInitialLoad = new Promise<void>((resolve) => {
      releaseInitialLoad = resolve;
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await installDashboardHarness(page, state);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("status", { name: "Loading websites" }),
    ).toBeVisible();
    releaseInitialLoad();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Create your first business website.",
      }),
    ).toBeVisible();
    await expectResponsiveShell(page, 390);
    await expectAccessible(page, "project-dashboard/empty");
    await captureDashboard(page, "project-dashboard-empty-390");

    state.failNextLoad = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Your websites could not be loaded.",
      }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Temporary project service failure." }),
    ).toContainText("Temporary project service failure.");
    await expectResponsiveShell(page, 390);
    await expectAccessible(page, "project-dashboard/error");
    await captureDashboard(page, "project-dashboard-error-390");

    await page.getByRole("button", { name: "Reload projects" }).click();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Create your first business website.",
      }),
    ).toBeVisible();
    expect(state.unexpected).toEqual([]);
  });
});

function createDashboardHarness(
  projects: DashboardProject[] = dashboardProjects(),
): DashboardHarness {
  return {
    projects: structuredClone(projects),
    requests: [],
    unexpected: [],
    failNextLoad: false,
  };
}

function dashboardProjects(): DashboardProject[] {
  return [
    {
      id: "site-radhika",
      workspace_id: "workspace-dashboard",
      name: "Radhika Dental",
      status: "published",
      published_version_id: "version-radhika-live",
      updated_at: "2026-10-20T11:30:00.000Z",
      draft: {
        revision: 18,
        updated_at: "2026-10-20T11:30:00.000Z",
      },
      hostname: {
        hostname: "radhikadental.in",
        status: "active",
        ssl_status: "active",
      },
    },
    {
      id: "site-gentle",
      workspace_id: "workspace-dashboard",
      name: "Gentle Smile",
      status: "draft",
      published_version_id: null,
      updated_at: "2026-10-19T09:15:00.000Z",
      draft: {
        revision: 6,
        updated_at: "2026-10-19T09:15:00.000Z",
      },
      hostname: null,
    },
    {
      id: "site-pearl",
      workspace_id: "workspace-dashboard",
      name: "Pearl Orthodontics",
      status: "draft",
      published_version_id: null,
      updated_at: "2026-10-18T14:45:00.000Z",
      draft: {
        revision: 3,
        updated_at: "2026-10-18T14:45:00.000Z",
      },
      hostname: {
        hostname: "pearlortho.in",
        status: "pending",
        ssl_status: "pending",
      },
    },
  ];
}

async function installDashboardHarness(page: Page, state: DashboardHarness) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "micirql.supabase.session",
      JSON.stringify(session),
    );
  }, DASHBOARD_SESSION);

  await page.route("**/api/**", async (route) => {
    await handleDashboardApi(route, state);
  });
}

async function handleDashboardApi(route: Route, state: DashboardHarness) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  const body = request.postData()
    ? (request.postDataJSON() as Record<string, unknown>)
    : undefined;

  if (request.headers()["authorization"] !== "Bearer dashboard-access-token") {
    state.unexpected.push(`${method} ${url.pathname} missing authorization`);
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Missing QA authorization" }),
    });
    return;
  }

  state.requests.push({
    method,
    path: url.pathname,
    ...(body ? { body } : {}),
  });

  if (method === "GET" && url.pathname === "/api/projects") {
    if (state.holdInitialLoad) {
      const hold = state.holdInitialLoad;
      state.holdInitialLoad = undefined;
      await hold;
    }
    if (state.failNextLoad) {
      state.failNextLoad = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary project service failure." }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ projects: state.projects }),
    });
    return;
  }

  if (method === "PATCH" && url.pathname === "/api/projects") {
    const siteId = String(body?.siteId ?? "");
    const project = state.projects.find((item) => item.id === siteId);
    if (!project) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Project not found." }),
      });
      return;
    }
    if (typeof body?.name === "string") project.name = body.name;
    if (body?.archived === true) {
      state.projects = state.projects.filter((item) => item.id !== siteId);
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ project }),
    });
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/projects" &&
    body?.action === "duplicate"
  ) {
    const source = state.projects.find(
      (project) => project.id === String(body.siteId ?? ""),
    );
    const project: DashboardProject = {
      ...(source ?? dashboardProjects()[0]!),
      id: "site-radhika-copy",
      name: String(body.name ?? "Website Copy"),
      status: "draft",
      published_version_id: null,
      updated_at: "2026-10-21T08:00:00.000Z",
      draft: {
        revision: 1,
        updated_at: "2026-10-21T08:00:00.000Z",
      },
      hostname: null,
    };
    state.projects = [...state.projects, project];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ project }),
    });
    return;
  }

  if (
    method === "POST" &&
    url.pathname === "/api/projects" &&
    body?.action === "create"
  ) {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        project: {
          id: "site-created",
          workspace_id: "workspace-dashboard",
          name: String(body.name ?? "Untitled website"),
        },
      }),
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/drafts") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        found: true,
        draft: {
          workspaceId: "workspace-dashboard",
          siteId: "site-created",
          revision: 0,
          snapshot: { name: "Lakshmi Dental" },
          updatedAt: "2026-10-21T08:00:00.000Z",
          updatedBy: DASHBOARD_SESSION.user.id,
        },
      }),
    });
    return;
  }

  if (method === "GET" && url.pathname === "/api/onboarding") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        completed: false,
        reviewPending: false,
        packStatus: null,
        catalogVersion: null,
        candidateCount: 0,
        profile: null,
      }),
    });
    return;
  }

  state.unexpected.push(`${method} ${url.pathname}`);
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unexpected dashboard QA request." }),
  });
}

async function captureDashboard(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    maxDiffPixelRatio: 0.002,
  });
  await page.screenshot({
    path: path.join(DASHBOARD_OUTPUT_DIRECTORY, `${name}.png`),
    animations: "disabled",
    fullPage: true,
  });
}

async function expectVisibleFocus(
  page: Page,
  control: ReturnType<Page["locator"]>,
) {
  await control.focus();
  await expect(control).toBeFocused();
  const focusVisible = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      (style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none"
    );
  });
  expect(focusVisible, "focused controls must show a visible indicator").toBe(
    true,
  );
}

async function expectReducedMotion(page: Page, surface: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animatedElements = await page
    .locator("main *")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const style = getComputedStyle(element);
          const hasMotion =
            style.animationName !== "none" ||
            style.transitionDuration
              .split(",")
              .some((duration) => Number.parseFloat(duration) > 0.01);
          return hasMotion
            ? `${element.tagName.toLowerCase()}.${element.className}`
            : null;
        })
        .filter((value): value is string => Boolean(value)),
    );
  expect(animatedElements, `${surface} must honor reduced motion`).toEqual([]);
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    maxDiffPixelRatio: 0.002,
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIRECTORY, `${name}.png`),
    animations: "disabled",
    fullPage: true,
  });
}

async function expectAccessible(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    results.violations,
    `${state} must have no automated WCAG A/AA violations`,
  ).toEqual([]);
}

async function expectKeyboardPath(
  page: Page,
  controls: ReturnType<Page["locator"]>[],
) {
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  for (const control of controls) {
    await page.keyboard.press("Tab");
    await expect(control).toBeFocused();
    const focusIndicator = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      const outlineVisible =
        style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0;
      return outlineVisible || style.boxShadow !== "none";
    });
    expect(
      focusIndicator,
      `${await control.getAttribute("type")} control must show visible focus`,
    ).toBe(true);
  }
}

async function expectResponsiveShell(page: Page, viewportWidth: number) {
  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    const visible = [
      ...document.body.querySelectorAll<HTMLElement>("*"),
    ].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
    const escapedElements = visible
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > viewport + 1;
      })
      .map(
        (element) => `${element.tagName.toLowerCase()}.${element.className}`,
      );
    const clippedText = visible
      .filter((element) => {
        if (!element.textContent?.trim() || element.children.length > 0)
          return false;
        const style = getComputedStyle(element);
        return (
          style.overflow !== "visible" &&
          (element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1)
        );
      })
      .map((element) => element.textContent?.trim() ?? element.tagName);
    const controls = visible
      .filter((element) =>
        element.matches("button, input, select, textarea, a[href]"),
      )
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name:
            element.getAttribute("aria-label") ||
            element.textContent?.trim() ||
            element.getAttribute("name") ||
            element.tagName,
          width: rect.width,
          height: rect.height,
        };
      });
    return {
      overflow: root.scrollWidth - root.clientWidth,
      escapedElements,
      clippedText,
      controls,
    };
  });

  expect(
    audit.overflow,
    `${viewportWidth}px shell must not overflow`,
  ).toBeLessThanOrEqual(1);
  expect(
    audit.escapedElements,
    `${viewportWidth}px shell must stay inside the viewport`,
  ).toEqual([]);
  expect(
    audit.clippedText,
    `${viewportWidth}px shell must not clip text`,
  ).toEqual([]);

  if (viewportWidth <= 768) {
    const undersized = audit.controls.filter(
      ({ width, height }) => width < 44 || height < 44,
    );
    expect(
      undersized,
      `${viewportWidth}px interactive targets must be at least 44 by 44 CSS pixels`,
    ).toEqual([]);
  }
}
