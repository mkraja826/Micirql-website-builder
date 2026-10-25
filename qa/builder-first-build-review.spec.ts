import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { siteSchema, type Site } from "@micirql/schema";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  BUILDER_REVIEW_BRAND_INPUT,
  BUILDER_REVIEW_SESSION,
  BUILDER_REVIEW_SITE_ID,
  BUILDER_REVIEW_WORKSPACE_ID,
  createBuilderReviewFixture,
  type BuilderReviewDraft,
  type BuilderReviewFixture,
} from "./support/builder-review-fixture";
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
  "builder-first-build-review",
);

const STABLE_REVIEW_IMAGE = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#dcecea"/>
    <path d="M0 610L330 330l210 180 245-260 415 360v190H0z" fill="#9fc9c3"/>
    <circle cx="920" cy="180" r="92" fill="#f7fbfa"/>
  </svg>
`);

test.beforeAll(async () => {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
});

test.describe("Builder product chrome: certified design review", () => {
  for (const viewport of VIEWPORTS) {
    test(`Dental review at ${viewport.width}px`, async ({ page }) => {
      const fixture = createBuilderReviewFixture();
      const state = createHarnessState(fixture);
      const runtimeFailures: string[] = [];
      const unexpectedApiRequests: string[] = [];

      page.on("pageerror", (error) => runtimeFailures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeFailures.push(message.text());
      });
      await page.setViewportSize(viewport);
      await installAuthenticatedReviewHarness(
        page,
        fixture,
        state,
        unexpectedApiRequests,
      );

      await openDesignReview(page);
      await expectProductBrand(page);
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Choose the structure that feels right for Radhika Dental.",
        }),
      ).toBeVisible();
      await expect(page.locator("[data-design-review-intro] h1")).toHaveCount(
        1,
      );
      await expect(
        page.getByText("20 certified directions", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("4 directions per group", { exact: true }),
      ).toBeVisible();

      const expectedInitialIds = fixture.candidateIds.slice(0, 4);
      await expectCandidatePage(page, expectedInitialIds);
      await expectFocusedPreview(page, expectedInitialIds[0]!);
      await expectDefaultPreviewViewport(page, viewport.width);
      await expectCanonicalPagination(page, fixture);
      await expectDirectionSwitch(page, expectedInitialIds[1]!);
      await page
        .locator(`[data-candidate-id="${expectedInitialIds[0]}"]`)
        .click();
      await expectFocusedPreview(page, expectedInitialIds[0]!);

      if (viewport.width === 1440) {
        const observedIds = await visitEveryCandidatePage(page, fixture);
        expect(
          observedIds,
          "pagination must preserve the exact stored 20-candidate order",
        ).toEqual(fixture.candidateIds);
        await page
          .getByRole("navigation", {
            name: "Design review pages",
            exact: true,
          })
          .getByRole("button", { name: "Show design ranks 1 to 4" })
          .click();
        await expectCandidatePage(page, expectedInitialIds);
        await expectFocusedPreview(page, expectedInitialIds[0]!);
      }

      await expectFullPreviewKeyboardContract(page);
      await expectResponsiveReviewShell(page, viewport.width);
      await expectAccessibleReviewShell(
        page,
        `certified-review/${viewport.width}`,
      );
      await expectVisibleFocus(
        page,
        page
          .getByRole("navigation", {
            name: "Design review pages",
            exact: true,
          })
          .getByRole("button", { name: "Show design ranks 1 to 4" }),
      );
      await expectVisibleFocus(
        page,
        page.locator(`[data-candidate-id="${expectedInitialIds[0]}"]`),
      );
      await expectReducedMotion(page);

      await settlePage(page);
      await capture(page, `design-review-${viewport.width}`);

      expect(
        state.previewCandidateIds,
        "the focused preview must use the selected candidate identity",
      ).toEqual(
        expect.arrayContaining([expectedInitialIds[0], expectedInitialIds[1]]),
      );
      expect(
        state.currentDraft.snapshot.generation?.selectedCandidateId,
        "transient preview identities must never mutate the stored review draft",
      ).toBeUndefined();
      expect(
        unexpectedApiRequests,
        "the design-review path must not make an unaccounted Builder API request",
      ).toEqual([]);
      expect(
        runtimeFailures,
        "the design-review shell must not log runtime errors",
      ).toEqual([]);
    });
  }

  test("selection posts the exact optimistic contract and opens the same project", async ({
    page,
  }) => {
    const fixture = createBuilderReviewFixture();
    const state = createHarnessState(fixture, true);
    const unexpectedApiRequests: string[] = [];

    await page.setViewportSize({ width: 1024, height: 768 });
    await installAuthenticatedReviewHarness(
      page,
      fixture,
      state,
      unexpectedApiRequests,
    );
    await openDesignReview(page);

    const candidateId = fixture.candidateIds[1]!;
    await page.locator(`[data-candidate-id="${candidateId}"]`).click();
    await expect(page.locator("#focused-design-preview")).toHaveAttribute(
      "data-active-candidate-id",
      candidateId,
    );
    await page.getByRole("button", { name: "Use this direction" }).click();

    await expect(page.locator(".workspace-shell")).toBeVisible();
    await expect(page.locator(".brand-lockup")).toContainText("Radhika Dental");
    await expect(page.locator(".save-state")).toHaveText("Saved");

    expect(state.selectionPayloads).toEqual([
      {
        workspaceId: BUILDER_REVIEW_WORKSPACE_ID,
        siteId: BUILDER_REVIEW_SITE_ID,
        candidateId,
        expectedRevision: fixture.draft.revision,
      },
    ]);
    expect(state.currentDraft.workspaceId).toBe(BUILDER_REVIEW_WORKSPACE_ID);
    expect(state.currentDraft.siteId).toBe(BUILDER_REVIEW_SITE_ID);
    expect(state.currentDraft.snapshot.generation?.selectedCandidateId).toBe(
      candidateId,
    );
    expect(
      state.currentDraft.snapshot.generation?.candidateIds,
      "selection must preserve the complete canonical ranked set",
    ).toEqual(fixture.candidateIds);
    expect(state.currentDraft.snapshot.generation?.premiumGate?.passed).toBe(
      true,
    );
    expect(
      state.currentDraft.snapshot.generation?.brandInput?.colors,
      "selection must preserve user-supplied brand colors",
    ).toEqual(BUILDER_REVIEW_BRAND_INPUT.colors);
    expect(
      state.draftQueries.every(
        ({ workspaceId, siteId }) =>
          workspaceId === BUILDER_REVIEW_WORKSPACE_ID &&
          siteId === BUILDER_REVIEW_SITE_ID,
      ),
      "review and editor draft reads must never fall back to demo identity",
    ).toBe(true);
    expect(unexpectedApiRequests).toEqual([]);
  });
});

type HarnessState = {
  allowSelection: boolean;
  currentDraft: BuilderReviewDraft;
  draftQueries: Array<{ workspaceId: string | null; siteId: string | null }>;
  previewCandidateIds: string[];
  selectionPayloads: Array<Record<string, unknown>>;
};

function createHarnessState(
  fixture: BuilderReviewFixture,
  allowSelection = false,
): HarnessState {
  return {
    allowSelection,
    currentDraft: structuredClone(fixture.draft),
    draftQueries: [],
    previewCandidateIds: [],
    selectionPayloads: [],
  };
}

async function installAuthenticatedReviewHarness(
  page: Page,
  fixture: BuilderReviewFixture,
  state: HarnessState,
  unexpectedApiRequests: string[],
) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "micirql.supabase.session",
      JSON.stringify(session),
    );
  }, BUILDER_REVIEW_SESSION);
  await page.route("https://images.pexels.com/**", async (route) => {
    await route.fulfill({
      body: STABLE_REVIEW_IMAGE,
      contentType: "image/svg+xml",
      status: 200,
    });
  });
  await page.route("**/api/**", async (route) => {
    await handleBuilderReviewApi(route, fixture, state, unexpectedApiRequests);
  });
}

async function handleBuilderReviewApi(
  route: Route,
  fixture: BuilderReviewFixture,
  state: HarnessState,
  unexpectedApiRequests: string[],
) {
  const request = route.request();
  const url = new URL(request.url());
  expect(request.headers()["authorization"]).toBe("Bearer qa-access-token");

  if (request.method() === "GET" && url.pathname === "/api/projects") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: BUILDER_REVIEW_SITE_ID,
            workspace_id: BUILDER_REVIEW_WORKSPACE_ID,
            name: "Radhika Dental",
            status: "draft",
            published_version_id: null,
            updated_at: "2026-10-21T00:00:00.000Z",
            draft: {
              revision: state.currentDraft.revision,
              updated_at: state.currentDraft.updatedAt,
            },
            hostname: null,
          },
        ],
      }),
    });
    return;
  }

  expect(request.headers()["x-micirql-workspace-id"]).toBe(
    BUILDER_REVIEW_WORKSPACE_ID,
  );
  expect(request.headers()["x-micirql-site-id"]).toBe(BUILDER_REVIEW_SITE_ID);

  if (request.method() === "GET" && url.pathname === "/api/drafts") {
    state.draftQueries.push({
      workspaceId: url.searchParams.get("workspaceId"),
      siteId: url.searchParams.get("siteId"),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ draft: state.currentDraft }),
    });
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/onboarding") {
    expect(url.searchParams.get("workspaceId")).toBe(
      BUILDER_REVIEW_WORKSPACE_ID,
    );
    expect(url.searchParams.get("siteId")).toBe(BUILDER_REVIEW_SITE_ID);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        completed: false,
        reviewPending: true,
        packStatus: "certified",
        catalogVersion: fixture.catalogVersion,
        candidateCount: fixture.candidateIds.length,
        profile: fixture.profile,
      }),
    });
    return;
  }

  if (request.method() === "POST" && url.pathname === "/api/preview") {
    const body = request.postDataJSON() as { site?: unknown; path?: unknown };
    const site = siteSchema.parse(body.site);
    const candidateId = site.generation?.selectedCandidateId;
    expect(candidateId).toBeTruthy();
    expect(fixture.candidateIds).toContain(candidateId);
    expect(site.workspaceId).toBe(BUILDER_REVIEW_WORKSPACE_ID);
    expect(site.siteId).toBe(BUILDER_REVIEW_SITE_ID);
    expect(site.name).toBe("Radhika Dental");
    expect(site.domain).toBe("clinic");
    expect(site.subtype).toBe("dental");
    expect(site.generation?.catalogVersion).toBe(fixture.catalogVersion);
    expect(site.generation?.candidateIds).toEqual(fixture.candidateIds);
    expect(site.generation?.brandInput?.colors).toEqual(
      BUILDER_REVIEW_BRAND_INPUT.colors,
    );
    expect(typeof body.path).toBe("string");
    state.previewCandidateIds.push(candidateId!);
    await route.continue();
    return;
  }

  if (
    request.method() === "POST" &&
    url.pathname === "/api/design-review/select"
  ) {
    if (!state.allowSelection) {
      unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Selection was not enabled in this QA case.",
        }),
      });
      return;
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "candidateId",
      "expectedRevision",
      "siteId",
      "workspaceId",
    ]);
    expect(body).toEqual({
      workspaceId: BUILDER_REVIEW_WORKSPACE_ID,
      siteId: BUILDER_REVIEW_SITE_ID,
      candidateId: fixture.candidateIds[1],
      expectedRevision: fixture.draft.revision,
    });
    state.selectionPayloads.push(body);
    const selected = fixture.select(String(body.candidateId));
    state.currentDraft = selected.draft;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        draft: selected.draft,
        gate: selected.gate,
        content: { ok: true, status: 200, mode: "curated" },
        images: {
          ok: true,
          status: 200,
          mode: "licensed-selection",
          provider: "pexels",
        },
      }),
    });
    return;
  }

  unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unexpected QA API request" }),
  });
}

async function openDesignReview(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok(), "the authenticated Builder must render").toBeTruthy();
  await expect(page).toHaveTitle("MiCirql Builder");
  await page.getByRole("button", { name: /open .* in editor/i }).click();
}

async function expectCandidatePage(page: Page, expectedIds: string[]) {
  await expect
    .poll(
      () =>
        page
          .locator("[data-candidate-id]")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-candidate-id")),
          ),
      { message: "the visible candidate cards must follow stored rank order" },
    )
    .toEqual(expectedIds);
}

async function expectFocusedPreview(page: Page, expectedId: string) {
  const previews = page.locator(".renderer-preview-document");
  await expect(previews).toHaveCount(1);
  const preview = previews.first();
  await expect(preview).toHaveAttribute("data-mi-candidate", expectedId);
  await expect(preview).toHaveAttribute("role", "img");
  await expect(preview).toHaveAttribute("inert", "");
  await expect(preview).toHaveAttribute("data-mi-domain", "clinic");
  await expect(preview).toHaveAttribute("data-mi-subtype", "dental");
  await expect(page.locator("#focused-design-preview")).toHaveAttribute(
    "data-active-candidate-id",
    expectedId,
  );
  const inertBlocksFocus = await preview.evaluate((element) => {
    const control = element.querySelector<HTMLElement>(
      "a[href], button, input, select, textarea, [tabindex]",
    );
    control?.focus();
    return !control || !element.contains(document.activeElement);
  });
  expect(
    inertBlocksFocus,
    "generated-site controls must not enter the Builder review tab order",
  ).toBe(true);
}

async function expectDirectionSwitch(page: Page, candidateId: string) {
  const option = page.locator(`[data-candidate-id="${candidateId}"]`);
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
  await expectFocusedPreview(page, candidateId);
}

async function expectDefaultPreviewViewport(page: Page, width: number) {
  const expected =
    width <= 640 ? "Mobile" : width <= 1100 ? "Tablet" : "Desktop";
  await expect(
    page.getByRole("button", { name: `${expected} preview` }),
  ).toHaveAttribute("aria-pressed", "true");
}

async function expectCanonicalPagination(
  page: Page,
  fixture: BuilderReviewFixture,
) {
  expect(fixture.candidateIds).toHaveLength(20);
  expect(new Set(fixture.candidateIds).size).toBe(20);
  expect(
    fixture.candidateIds.every((candidateId) =>
      candidateId.startsWith("clinic-dental-"),
    ),
  ).toBe(true);
  const navigation = page.getByRole("navigation", {
    name: "Design review pages",
    exact: true,
  });
  await expect(
    navigation.getByRole("button", { name: /Show design ranks/ }),
  ).toHaveCount(5);
  for (const [start, end] of [
    [1, 4],
    [5, 8],
    [9, 12],
    [13, 16],
    [17, 20],
  ]) {
    await expect(
      navigation.getByRole("button", {
        name: `Show design ranks ${start} to ${end}`,
      }),
    ).toBeVisible();
  }
}

async function visitEveryCandidatePage(
  page: Page,
  fixture: BuilderReviewFixture,
) {
  const navigation = page.getByRole("navigation", {
    name: "Design review pages",
    exact: true,
  });
  const observedIds: string[] = [];
  for (let pageIndex = 0; pageIndex < 5; pageIndex += 1) {
    const start = pageIndex * 4 + 1;
    const end = start + 3;
    if (pageIndex > 0) {
      await navigation
        .getByRole("button", {
          name: `Show design ranks ${start} to ${end}`,
        })
        .click();
    }
    const expectedIds = fixture.candidateIds.slice(
      pageIndex * 4,
      pageIndex * 4 + 4,
    );
    await expectCandidatePage(page, expectedIds);
    await expectFocusedPreview(page, expectedIds[0]!);
    observedIds.push(...expectedIds);
  }
  return observedIds;
}

async function expectFullPreviewKeyboardContract(page: Page) {
  const opener = page
    .locator("#focused-design-preview")
    .getByRole("button", { name: "Open full preview" });
  await opener.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  const close = dialog.getByRole("button", { name: "Close preview" });
  await expect(close).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  await expect(page.locator("header").first()).toHaveAttribute("inert", "");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
}

async function expectAccessibleReviewShell(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
    // Generated sites have their own full WCAG gates. Here the embedded site is
    // an inert visual artifact; scan the Builder controls and dialog semantics.
    .exclude(".renderer-preview-document")
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22a",
      "wcag22aa",
    ])
    .analyze();
  expect(
    results.violations,
    `${state} must have no automated WCAG 2.2 A/AA violations`,
  ).toEqual([]);
}

async function expectVisibleFocus(
  page: Page,
  control: ReturnType<Page["locator"]>,
) {
  await control.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  const focusIndicator = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return (
      (style.outlineStyle !== "none" &&
        Number.parseFloat(style.outlineWidth) > 0) ||
      style.boxShadow !== "none"
    );
  });
  expect(focusIndicator, "interactive controls must show visible focus").toBe(
    true,
  );
}

async function expectResponsiveReviewShell(page: Page, viewportWidth: number) {
  await expect
    .poll(
      () =>
        page.locator(".renderer-site-preview").evaluateAll(
          (frames) =>
            frames.filter((frame) => {
              const stage = frame.closest<HTMLElement>(
                ".renderer-preview-stage",
              );
              if (!stage) return true;
              const frameRect = frame.getBoundingClientRect();
              const stageRect = stage.getBoundingClientRect();
              return (
                frameRect.left < stageRect.left - 1 ||
                frameRect.right > stageRect.right + 1
              );
            }).length,
        ),
      {
        message: `${viewportWidth}px generated previews must settle inside their scaled stages`,
      },
    )
    .toBe(0);

  const audit = await page.evaluate(() => {
    const root = document.documentElement;
    const viewport = root.clientWidth;
    const visible = [
      ...document.body.querySelectorAll<HTMLElement>("*"),
    ].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        !element.closest(".renderer-preview-document") &&
        !element.matches(".renderer-site-preview") &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.clipPath !== "inset(50%)" &&
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
            element.getAttribute("placeholder") ||
            element.tagName,
          width: rect.width,
          height: rect.height,
        };
      });
    return {
      overflow: root.scrollWidth - root.clientWidth,
      height: root.scrollHeight,
      escapedElements,
      clippedText,
      controls,
    };
  });

  expect(
    audit.overflow,
    `${viewportWidth}px review must not overflow horizontally`,
  ).toBeLessThanOrEqual(1);
  expect(
    audit.escapedElements,
    `${viewportWidth}px product chrome must remain inside the viewport`,
  ).toEqual([]);
  expect(
    audit.clippedText,
    `${viewportWidth}px product chrome must not clip text`,
  ).toEqual([]);
  const maximumHeight =
    viewportWidth <= 640 ? 2800 : viewportWidth >= 1180 ? 1800 : 2300;
  expect(
    audit.height,
    `${viewportWidth}px review must remain a compact decision workspace`,
  ).toBeLessThanOrEqual(maximumHeight);
  if (viewportWidth <= 768) {
    const undersized = audit.controls.filter(
      ({ width, height }) => width < 44 || height < 44,
    );
    expect(
      undersized,
      `${viewportWidth}px product controls must be at least 44 by 44 CSS pixels`,
    ).toEqual([]);
  }
}

async function expectReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animatedElements = await page
    .locator("main *")
    .evaluateAll((elements) =>
      elements
        .filter((element) => !element.closest(".renderer-preview-document"))
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
    "the design-review shell must honor reduced-motion preferences",
  ).toEqual([]);
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    images.forEach((image) => {
      image.loading = "eager";
    });
    await Promise.race([
      Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      ),
      new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
    ]);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
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
