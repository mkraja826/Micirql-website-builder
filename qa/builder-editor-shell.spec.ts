import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type Route,
} from "@playwright/test";
import { siteSchema, type Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  BUILDER_REVIEW_SESSION,
  BUILDER_REVIEW_SITE_ID,
  BUILDER_REVIEW_WORKSPACE_ID,
  createBuilderReviewFixture,
  type BuilderReviewDraft,
} from "./support/builder-review-fixture";

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
  "builder-editor-shell",
);

const STABLE_EDITOR_IMAGE = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#e3efed"/>
    <rect x="90" y="90" width="1020" height="620" rx="48" fill="#c2dcd8"/>
    <circle cx="920" cy="210" r="90" fill="#f8fbfa"/>
  </svg>
`);

type HarnessState = {
  draft: BuilderReviewDraft;
  serverDraft: BuilderReviewDraft;
  putPayloads: Array<{
    snapshot: Site;
    expectedRevision: number;
    updatedBy: string;
  }>;
  saveMode: "success" | "conflict";
  unexpectedApiRequests: string[];
};

test.beforeAll(async () => {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
});

test.describe("Builder product chrome: editor shell", () => {
  for (const viewport of VIEWPORTS) {
    test(`responsive editor at ${viewport.width}px`, async ({ page }) => {
      const fixture = createBuilderReviewFixture();
      const selected = fixture.select(fixture.candidateIds[1]!);
      const state = createHarnessState(selected.draft);
      const runtimeFailures: string[] = [];

      page.on("pageerror", (error) => runtimeFailures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeFailures.push(message.text());
      });
      await page.setViewportSize(viewport);
      await installEditorHarness(page, state);
      await openEditor(page);

      await expect(page.locator(".workspace-shell")).toBeVisible();
      await expect(page.locator(".editor-product-brand img")).toHaveAttribute(
        "src",
        "/micirql-mark.svg",
      );
      await expect(page.locator(".brand-lockup")).toContainText(
        "Radhika Dental",
      );
      await expect(page.locator(".save-state")).toHaveText("Saved");
      await expect(page.locator(".save-state")).toHaveAttribute(
        "title",
        "All changes are saved",
      );
      await expect(page.locator(".renderer-preview-document")).toBeVisible();

      await expectResponsiveEditor(page, viewport.width, state.draft.snapshot);
      await expectEditorChromeControlsAreTouchable(page, viewport.width);
      await expectNoDocumentOverflow(page);
      await expectAccessibleEditorShell(page, viewport.width);
      await expectReducedMotion(page);

      await settlePage(page);
      await capture(page, `editor-shell-${viewport.width}`);

      expect(state.unexpectedApiRequests).toEqual([]);
      expect(
        runtimeFailures,
        "the editor must not log runtime failures",
      ).toEqual([]);
    });
  }

  test("autosave state and optimistic conflict recovery remain explicit", async ({
    page,
  }) => {
    const fixture = createBuilderReviewFixture();
    const selected = fixture.select(fixture.candidateIds[1]!);
    const editableSection = selected.draft.snapshot.pages[0]!.sections[0]!;
    editableSection.props.eyebrow = "Hyderabad dental team";
    editableSection.props.ctaLabel = "Request an appointment";
    editableSection.props.ctaHref = "/contact";
    const state = createHarnessState(selected.draft);

    await page.setViewportSize({ width: 390, height: 844 });
    await installEditorHarness(page, state);
    await openEditor(page);

    await selectFirstSection(page);
    const inspector = page.locator(".workspace-inspector");
    await expect(inspector).toBeVisible();
    await expect(inspector.getByLabel("Eyebrow")).toHaveValue(
      "Hyderabad dental team",
    );
    const buttonLabel = inspector.getByLabel("Button label");
    await expect(buttonLabel).toHaveValue("Request an appointment");
    await expect(inspector.getByLabel("Button destination")).toHaveValue(
      "/contact",
    );
    const heading = inspector.getByLabel("Heading");
    await buttonLabel.fill("Book a consultation");
    await expect(page.locator(".save-state")).toHaveText("Not saved");
    await expect(page.locator(".save-state")).toHaveText("Saving", {
      timeout: 2_500,
    });
    await expect(page.locator(".save-state")).toHaveText("Saved", {
      timeout: 4_000,
    });

    expect(state.putPayloads).toHaveLength(1);
    expect(Object.keys(state.putPayloads[0]!).sort()).toEqual([
      "expectedRevision",
      "snapshot",
      "updatedBy",
    ]);
    expect(state.putPayloads[0]!.expectedRevision).toBe(
      selected.draft.revision,
    );
    expect(state.putPayloads[0]!.snapshot.workspaceId).toBe(
      BUILDER_REVIEW_WORKSPACE_ID,
    );
    expect(state.putPayloads[0]!.snapshot.siteId).toBe(BUILDER_REVIEW_SITE_ID);
    expect(
      state.putPayloads[0]!.snapshot.pages[0]!.sections.find(
        ({ id }) => id === editableSection.id,
      )?.props.ctaLabel,
    ).toBe("Book a consultation");

    state.saveMode = "conflict";
    await heading.fill("A second local edit");
    await expect(page.locator(".draft-conflict")).toBeVisible({
      timeout: 4_000,
    });
    await expect(page.locator(".save-state")).toHaveText("Save conflict");
    await expect(page.locator(".draft-conflict")).toContainText(
      "Your edits are still here",
    );
    await page.getByRole("button", { name: "Load latest version" }).click();
    await expect(page.locator(".draft-conflict")).toHaveCount(0);
    await expect(page.locator(".save-state")).toHaveText("Saved");
    await expect(page.locator(".renderer-preview-document")).toHaveAttribute(
      "data-mi-site",
      BUILDER_REVIEW_SITE_ID,
    );
  });

  test("repeatable sections can add and edit real collection content", async ({
    page,
  }) => {
    const fixture = createBuilderReviewFixture();
    const selected = fixture.select(fixture.candidateIds[1]!);
    const state = createHarnessState(selected.draft);

    await page.setViewportSize({ width: 1440, height: 900 });
    await installEditorHarness(page, state);
    await openEditor(page);

    const servicesBefore = selected.draft.snapshot.pages[0]!.sections.filter(
      ({ component }) =>
        sectionComponentMatches(component.componentId, "services"),
    ).length;
    const addSection = page.getByLabel("Add section");
    await expect(addSection.locator('option[value="services"]')).toHaveCount(1);
    await addSection.selectOption("services");

    const items = page.getByRole("region", { name: "Services items" });
    await expect(page.locator(".selected-section-heading strong")).toHaveText(
      "Services",
    );
    await expect(items).toContainText("No items yet");
    await items.getByRole("button", { name: "Add item" }).click();
    await items.getByLabel("Title").fill("Emergency dental appointments");
    await items
      .getByLabel("Description")
      .fill(
        "Explain the verified availability and how patients should enquire.",
      );
    await expect(
      items.getByRole("button", { name: "Choose image" }),
    ).toBeVisible();
    await expect(page.locator(".save-state")).toHaveText("Saved", {
      timeout: 4_000,
    });

    const saved = state.putPayloads.at(-1)?.snapshot;
    expect(
      saved,
      "the richer section must be included in autosave",
    ).toBeDefined();
    const savedServices = saved!.pages[0]!.sections.filter(({ component }) =>
      sectionComponentMatches(component.componentId, "services"),
    );
    expect(savedServices).toHaveLength(servicesBefore + 1);
    expect(savedServices.at(-1)?.props.items).toEqual([
      {
        title: "Emergency dental appointments",
        description:
          "Explain the verified availability and how patients should enquire.",
      },
    ]);
    expect(state.unexpectedApiRequests).toEqual([]);
  });

  test("SEO settings update the preview and save a coherent page record", async ({
    page,
  }) => {
    const fixture = createBuilderReviewFixture();
    const selected = fixture.select(fixture.candidateIds[1]!);
    const state = createHarnessState(selected.draft);

    await page.setViewportSize({ width: 1440, height: 900 });
    await installEditorHarness(page, state);
    await openEditor(page);
    await page
      .locator(".workspace-rail")
      .getByRole("button", { name: "Search & SEO" })
      .click();

    const settings = page.getByRole("region", { name: "Page search settings" });
    const preview = page.getByRole("region", { name: "Search result preview" });
    await settings
      .getByLabel("SEO title")
      .fill("Radhika Dental Implants in Hyderabad");
    await settings
      .getByLabel("Search description")
      .fill(
        "Explore verified dental implant services, treatment information and appointment options from Radhika Dental in Hyderabad.",
      );
    await settings.getByLabel("Page path").fill("/dental-implants");
    await settings
      .getByLabel("Primary keyword")
      .fill("dental implants Hyderabad");
    await settings
      .getByLabel("Allow search engines to index this page")
      .uncheck();

    await expect(preview).toContainText("Radhika Dental Implants in Hyderabad");
    await expect(preview).toContainText("your-domain.com/dental-implants");
    await expect(preview).toContainText(
      "This page is currently excluded from search indexing.",
    );
    await expect(page.locator(".save-state")).toHaveText("Saved", {
      timeout: 4_000,
    });

    const savedPage = state.putPayloads.at(-1)?.snapshot.pages[0];
    expect(savedPage?.path).toBe("/dental-implants");
    expect(savedPage?.seo).toMatchObject({
      title: "Radhika Dental Implants in Hyderabad",
      description:
        "Explore verified dental implant services, treatment information and appointment options from Radhika Dental in Hyderabad.",
      canonicalPath: "/dental-implants",
      indexable: false,
      primaryKeyword: "dental implants Hyderabad",
    });
    expect(state.putPayloads.at(-1)?.snapshot.navigation[0]?.href).toBe(
      "/dental-implants",
    );
    expect(state.unexpectedApiRequests).toEqual([]);
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ] as const) {
    test(`content and Tools inspectors are visually usable at ${viewport.width}px`, async ({
      page,
    }) => {
      const fixture = createBuilderReviewFixture();
      const selected = fixture.select(fixture.candidateIds[1]!);
      const state = createHarnessState(selected.draft);

      await page.setViewportSize(viewport);
      await installEditorHarness(page, state);
      await openEditor(page);

      if (viewport.width < 1180) {
        await page
          .getByRole("navigation", { name: "Editor tools" })
          .getByRole("button", { name: "Content" })
          .click();
      }
      await page
        .getByRole("list", { name: "Sections on Home" })
        .getByText("Hero", { exact: true })
        .click();
      await expect(page.getByLabel("Heading")).toBeVisible();
      await settlePage(page);
      await capture(page, `editor-content-inspector-${viewport.width}`);

      if (viewport.width < 1180) {
        await page.getByRole("button", { name: "Close editor panel" }).click();
        const mobileTools = page.getByRole("navigation", {
          name: "Editor tools",
        });
        await mobileTools.getByRole("button", { name: "More" }).click();
        await page
          .getByRole("menu", { name: "More editor tools" })
          .getByRole("menuitem", { name: "Search & SEO" })
          .click();
      } else {
        await page
          .locator(".workspace-rail")
          .getByRole("button", { name: "Search & SEO" })
          .click();
      }
      const inspector = page.locator(".workspace-inspector");
      await inspector.evaluate((element) => element.scrollTo({ top: 0 }));
      await settlePage(page);
      await capture(page, `editor-seo-inspector-${viewport.width}`);

      const tools = page.getByRole("region", { name: "MiCirql Tools" });
      await tools.scrollIntoViewIfNeeded();
      await settlePage(page);
      await capture(page, `editor-tools-inspector-${viewport.width}`);

      expect(state.unexpectedApiRequests).toEqual([]);
    });
  }

  test("publish readiness separates draft evidence from final production checks", async ({
    page,
  }) => {
    const fixture = createBuilderReviewFixture();
    const selected = fixture.select(fixture.candidateIds[1]!);
    const state = createHarnessState(selected.draft);

    await page.setViewportSize({ width: 1440, height: 900 });
    await installEditorHarness(page, state);
    await openEditor(page);
    await openPublishReadiness(page);

    const readiness = page.getByRole("region", {
      name: "Publication readiness",
    });
    await expect(readiness).toHaveAttribute(
      "data-publish-readiness",
      "draft-passed",
    );
    await expect(readiness.getByRole("status")).toContainText(
      "Draft checks passed",
    );
    await expect(readiness.getByRole("status")).toContainText(
      "Publishing has not started",
    );
    await expect(
      readiness.locator('[data-readiness-check="certification"]'),
    ).toHaveAttribute("data-readiness-status", "pass");
    await expect(
      readiness.locator('[data-readiness-check="production"]'),
    ).toHaveAttribute("data-readiness-status", "review");
    await expect(
      readiness.locator('[data-readiness-check="production"]'),
    ).toContainText("Runs after Publish is requested");
    await expect(
      page
        .locator(".workspace-actions-desktop")
        .getByRole("button", { name: "Publish", exact: true }),
    ).toBeEnabled();

    const results = await new AxeBuilder({ page })
      .include(".publish-readiness")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    delete state.draft.snapshot.generation!.premiumGate;
    await openEditor(page);
    await openPublishReadiness(page);

    await expect(readiness).toHaveAttribute(
      "data-publish-readiness",
      "blocked",
    );
    await expect(readiness.getByRole("status")).toContainText(
      "Draft is not publishable",
    );
    await expect(
      readiness.locator('[data-readiness-check="certification"]'),
    ).toHaveAttribute("data-readiness-status", "block");
    await expect(
      page
        .locator(".workspace-actions-desktop")
        .getByRole("button", { name: "Publish", exact: true }),
    ).toBeDisabled();

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileTools = page.getByRole("navigation", { name: "Editor tools" });
    await expect(mobileTools).toBeVisible();
    await mobileTools.getByRole("button", { name: "More" }).click();
    await page
      .getByRole("menu", { name: "More editor tools" })
      .getByRole("menuitem", { name: "Domain & publish" })
      .click();
    await expect(readiness).toBeVisible();
    await expect(readiness).toHaveAttribute(
      "data-publish-readiness",
      "blocked",
    );
    await expectNoDocumentOverflow(page);
    const mobileResults = await new AxeBuilder({ page })
      .include(".publish-readiness")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(mobileResults.violations).toEqual([]);
  });
});

function createHarnessState(draft: BuilderReviewDraft): HarnessState {
  return {
    draft: structuredClone(draft),
    serverDraft: {
      ...structuredClone(draft),
      revision: draft.revision + 2,
      updatedAt: "2026-10-21T02:00:00.000Z",
      updatedBy: "another-editor",
    },
    putPayloads: [],
    saveMode: "success",
    unexpectedApiRequests: [],
  };
}

async function installEditorHarness(page: Page, state: HarnessState) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      "micirql.supabase.session",
      JSON.stringify(session),
    );
  }, BUILDER_REVIEW_SESSION);
  await page.route("https://images.pexels.com/**", async (route) => {
    await route.fulfill({
      body: STABLE_EDITOR_IMAGE,
      contentType: "image/svg+xml",
      status: 200,
    });
  });
  await page.route("**/api/**", async (route) => {
    await handleEditorApi(route, state);
  });
}

async function handleEditorApi(route: Route, state: HarnessState) {
  const request = route.request();
  const url = new URL(request.url());
  expect(request.headers().authorization).toBe("Bearer qa-access-token");

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
            updated_at: state.draft.updatedAt,
            draft: {
              revision: state.draft.revision,
              updated_at: state.draft.updatedAt,
            },
            hostname: null,
          },
        ],
      }),
    });
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/drafts") {
    expect(url.searchParams.get("workspaceId")).toBe(
      BUILDER_REVIEW_WORKSPACE_ID,
    );
    expect(url.searchParams.get("siteId")).toBe(BUILDER_REVIEW_SITE_ID);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ draft: state.draft }),
    });
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/onboarding") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        completed: true,
        reviewPending: false,
        profile: null,
      }),
    });
    return;
  }

  if (request.method() === "POST" && url.pathname === "/api/preview") {
    const payload = request.postDataJSON() as { site: unknown; path: string };
    const site = siteSchema.parse(payload.site);
    expect(site.workspaceId).toBe(BUILDER_REVIEW_WORKSPACE_ID);
    expect(site.siteId).toBe(BUILDER_REVIEW_SITE_ID);
    expect(typeof payload.path).toBe("string");
    await route.continue();
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/assets") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ assets: [] }),
    });
    return;
  }

  if (request.method() === "PUT" && url.pathname === "/api/drafts") {
    const payload = request.postDataJSON() as {
      snapshot: unknown;
      expectedRevision: number;
      updatedBy: string;
    };
    const snapshot = siteSchema.parse(payload.snapshot);
    state.putPayloads.push({
      snapshot,
      expectedRevision: payload.expectedRevision,
      updatedBy: payload.updatedBy,
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (state.saveMode === "conflict") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Revision conflict",
          draft: state.serverDraft,
        }),
      });
      return;
    }
    state.draft = {
      ...state.draft,
      revision: state.draft.revision + 1,
      snapshot,
      updatedAt: "2026-10-21T01:00:00.000Z",
      updatedBy: payload.updatedBy,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ draft: state.draft }),
    });
    return;
  }

  state.unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unexpected editor QA API request" }),
  });
}

async function openEditor(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok(), "the authenticated Builder must render").toBeTruthy();
  await page.getByRole("button", { name: /open .* in editor/i }).click();
  await expect(page.locator(".workspace-shell")).toBeVisible();
  await expect(page.locator(".save-state")).toHaveText("Saved");
  await expect(page.locator(".renderer-preview-document")).toBeVisible({
    timeout: 15_000,
  });
}

async function expectResponsiveEditor(page: Page, width: number, site: Site) {
  const compact = width < 1180;
  const mobileNav = page.getByRole("navigation", { name: "Editor tools" });
  const rail = page.locator(".workspace-rail");
  const inspector = page.locator(".workspace-inspector");

  if (compact) {
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole("button")).toHaveCount(5);
    await expect(rail).toBeHidden();
    await expect(inspector).toBeHidden();
    if (width === 1024) {
      const canvas = await page.locator(".workspace-canvas").boundingBox();
      expect(
        canvas,
        "the compact canvas must have a layout box",
      ).not.toBeNull();
      expect(
        canvas!.width,
        "the 1024px compact editor must not retain the legacy three-column grid",
      ).toBeGreaterThanOrEqual(width * 0.9);
    }

    const content = mobileNav.getByRole("button", { name: "Content" });
    await content.click();
    await expect(content).toHaveAttribute("aria-pressed", "true");
    await expect(inspector).toBeVisible();
    await expect(inspector).toBeFocused();
    await expectPageStructure(page, site);
    await expectMinimumVisibleFontSize(
      mobileNav.getByRole("button"),
      10.5,
      "mobile editor labels",
    );
    await expectMinimumVisibleFontSize(
      inspector.locator(
        ".section-controls-heading span, .section-list-copy small, .section-list-state, .section-add-panel label > span",
      ),
      10.5,
      "page-structure supporting labels",
    );
    await expectVisibleTargetsAreTouchable(
      inspector.locator("button, select, input, textarea, a"),
      "content inspector control",
    );
    await expectScopesHaveNoHorizontalOverflow(
      inspector.locator(".section-controls, .section-list"),
      "content inspector",
    );
    await expectVisibleFocus(
      page,
      inspector.getByRole("button", { name: "Close editor panel" }),
    );
    await inspector.getByRole("button", { name: "Close editor panel" }).click();
    await expect(inspector).toBeHidden();
    await expect(content).toBeFocused();

    const more = mobileNav.getByRole("button", { name: "More" });
    await more.click();
    const menu = page.getByRole("menu", { name: "More editor tools" });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem")).toHaveCount(4);
    await menu.getByRole("menuitem", { name: "Search & SEO" }).click();
    await expect(inspector).toBeVisible();
    await expect(inspector).toHaveAttribute(
      "aria-label",
      "Search & SEO editor",
    );
    await expectSeoEditor(page, site.pages[0]!);
    await expectMicirqlToolsPanel(page);
    await page.keyboard.press("Escape");
    await expect(inspector).toBeHidden();
    await expect(more).toBeFocused();

    const actions = page.locator(".workspace-actions-mobile");
    const actionToggle = actions.getByRole("button", { name: /Actions/ });
    await actionToggle.click();
    await expect(actionToggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      actions.getByRole("button", { name: "Save now" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(actionToggle).toHaveAttribute("aria-expanded", "false");
  } else {
    await expect(mobileNav).toBeHidden();
    await expect(rail).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Website pages" }),
    ).toBeVisible();
    await expect(
      page.locator(".workspace-actions-desktop").getByRole("button", {
        name: "Save now",
      }),
    ).toBeVisible();
    await expectPageStructure(page, site);
    await expectMinimumVisibleFontSize(
      rail.getByRole("button"),
      12,
      "desktop editor navigation labels",
    );
    await expectVisibleTargetsAreTouchable(
      inspector.locator("button, select, input, textarea, a"),
      "content inspector control",
    );
    await expectVisibleFocus(
      page,
      rail.getByRole("button", { name: "Content" }),
    );
    await rail.getByRole("button", { name: "Search & SEO" }).click();
    await expectSeoEditor(page, site.pages[0]!);
    await expectMicirqlToolsPanel(page);
    await rail.getByRole("button", { name: "Content" }).click();
    await expectPageStructure(page, site);
  }
}

async function expectPageStructure(page: Page, site: Site) {
  const activePage = site.pages[0]!;
  const structure = page.getByRole("list", {
    name: `Sections on ${activePage.name}`,
  });
  const expectedLabels = activePage.sections.map((section) => {
    const family = SECTION_FAMILIES.find((candidate) =>
      sectionComponentMatches(section.component.componentId, candidate),
    );
    return title(
      family ?? section.component.componentId.split(".")[0] ?? section.id,
    );
  });

  await expect(page.getByText("Page structure", { exact: true })).toBeVisible();
  await expect(structure).toBeVisible();
  await expect(structure.getByRole("listitem")).toHaveCount(
    activePage.sections.length,
  );
  await expect(structure.locator(".section-list-position")).toHaveText(
    activePage.sections.map((_, index) => String(index + 1).padStart(2, "0")),
  );
  await expect(structure.locator(".section-list-copy strong")).toHaveText(
    expectedLabels,
  );
  await expect(structure.locator(".section-list-copy small")).toHaveText(
    activePage.sections.map((section) =>
      section.hidden ? "Hidden" : "Visible",
    ),
  );

  await expect(
    page.locator('.section-controls select:not([aria-label="Add section"])'),
    "the legacy raw section picker must not return",
  ).toHaveCount(0);
  await expect(page.locator(".section-controls-row")).toHaveCount(0);
  await expect(
    page.locator(".section-controls option", {
      hasText: /^Choose a section|^\+ Add section$/,
    }),
    "legacy default select options must not return",
  ).toHaveCount(0);
  await expect(page.getByLabel("Add section")).toHaveValue("");
}

async function expectMicirqlToolsPanel(page: Page) {
  const tools = page.getByRole("region", { name: "MiCirql Tools" });
  await expect(tools).toBeVisible();
  await expect(
    tools.getByText("MiCirql Tools · Beta", { exact: true }),
  ).toBeVisible();
  await expect(tools).toContainText(
    "Tools cannot access or change this unpublished draft.",
  );

  const expectedLinks = [
    {
      name: /^SEO HTML Inspector/,
      href: "https://tools.micirql.com/tools/seo/",
    },
    {
      name: /^QA Testing Lab/,
      href: "https://tools.micirql.com/tools/qa/",
    },
    {
      name: /^UI\/UX Inspector/,
      href: "https://tools.micirql.com/tools/ui-ux/",
    },
    {
      name: /^View Tools workspace and roadmap/,
      href: "https://tools.micirql.com/tools/",
    },
  ] as const;

  await expect(tools.getByRole("link")).toHaveCount(expectedLinks.length);
  for (const expectedLink of expectedLinks) {
    const link = tools.getByRole("link", { name: expectedLink.name });
    await expect(link).toHaveAttribute("href", expectedLink.href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noreferrer");
  }
  await expect(
    tools.locator('a[href*="/tools/screenshots/"]'),
    "Screenshot Studio must not be linked while its route redirects",
  ).toHaveCount(0);
  await expectMinimumVisibleFontSize(
    tools.locator("p, small, a, .editor-tools-heading > span"),
    11.5,
    "MiCirql Tools supporting copy",
  );
  await expectVisibleTargetsAreTouchable(
    tools.getByRole("link"),
    "MiCirql Tools link",
  );
  await expectScopesHaveNoHorizontalOverflow(tools, "MiCirql Tools panel");
}

async function expectSeoEditor(page: Page, activePage: Site["pages"][number]) {
  const settings = page.getByRole("region", { name: "Page search settings" });
  const preview = page.getByRole("region", { name: "Search result preview" });
  await expect(settings).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(settings.getByLabel("SEO title")).toHaveValue(
    activePage.seo.title,
  );
  await expect(settings.getByLabel("SEO title")).toHaveAttribute(
    "maxlength",
    "70",
  );
  await expect(settings.getByLabel("Search description")).toHaveValue(
    activePage.seo.description,
  );
  await expect(settings.getByLabel("Search description")).toHaveAttribute(
    "maxlength",
    "180",
  );
  await expect(settings.getByLabel("Page path")).toHaveValue(activePage.path);
  await expect(
    settings.getByLabel("Allow search engines to index this page"),
  ).toBeChecked({ checked: activePage.seo.indexable });
  await expect(preview).toContainText(activePage.seo.title);
  await expect(preview).toContainText(activePage.seo.description);
  await expectMinimumVisibleFontSize(
    settings.locator("small, .seo-editor-heading p"),
    10.5,
    "SEO supporting copy",
  );
  await expectScopesHaveNoHorizontalOverflow(settings, "SEO settings");
  await expectScopesHaveNoHorizontalOverflow(preview, "search preview");
}

function sectionComponentMatches(
  componentId: string,
  family: SectionFamily,
): boolean {
  const value = componentId.toLowerCase();
  return (
    value === `${family}.placeholder` ||
    value.startsWith(`${family}.`) ||
    value.includes(`-${FAMILY_CODES[family].toLowerCase()}-`) ||
    value.includes(`-${family === "navbar" ? "nav" : family}-`)
  );
}

async function expectEditorChromeControlsAreTouchable(
  page: Page,
  width: number,
) {
  const selectors =
    width < 1180
      ? [
          ".workspace-actions-mobile > button",
          ".workspace-contextbar button",
          ".workspace-contextbar select",
          ".mobile-editor-bar button",
        ]
      : [
          ".workspace-actions-desktop > button",
          ".workspace-actions-desktop .publish-button",
          ".page-switcher button",
          ".workspace-rail button",
          ".workspace-contextbar button",
        ];
  const controls = page.locator(selectors.join(","));
  await expectVisibleTargetsAreTouchable(controls, "editor control");
}

async function expectVisibleTargetsAreTouchable(
  controls: Locator,
  description: string,
) {
  const count = await controls.count();
  expect(count).toBeGreaterThan(0);
  let visibleCount = 0;
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible())) continue;
    visibleCount += 1;
    const box = await control.boundingBox();
    expect(box, `${description} ${index} must have a box`).not.toBeNull();
    expect(
      box!.height,
      `${description} ${index} must be at least 44px high`,
    ).toBeGreaterThanOrEqual(44);
  }
  expect(
    visibleCount,
    `${description}s must include a visible target`,
  ).toBeGreaterThan(0);
}

async function expectMinimumVisibleFontSize(
  elements: Locator,
  minimumPixels: number,
  description: string,
) {
  const sizes = await elements.evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      const element = node as HTMLElement;
      const style = getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden"
        ? []
        : [Number.parseFloat(style.fontSize)];
    }),
  );
  expect(sizes.length, `${description} must be visible`).toBeGreaterThan(0);
  expect(
    Math.min(...sizes),
    `${description} must be at least ${minimumPixels}px`,
  ).toBeGreaterThanOrEqual(minimumPixels);
}

async function expectScopesHaveNoHorizontalOverflow(
  scopes: Locator,
  description: string,
) {
  const overflows = await scopes.evaluateAll((nodes) =>
    nodes.flatMap((node, index) => {
      const element = node as HTMLElement;
      if (getComputedStyle(element).display === "none") return [];
      return element.scrollWidth > element.clientWidth + 1
        ? [`${index}: ${element.scrollWidth}px > ${element.clientWidth}px`]
        : [];
    }),
  );
  expect(overflows, `${description} must not overflow horizontally`).toEqual(
    [],
  );
}

async function expectAccessibleEditorShell(page: Page, width: number) {
  const results = await new AxeBuilder({ page })
    .include(".workspace-shell")
    .exclude(".renderer-preview-document")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations,
    `editor shell at ${width}px must pass WCAG 2.2 AA automation`,
  ).toEqual([]);
}

async function expectReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const offenders = await page.locator(".workspace-shell").evaluate((root) => {
    const elements = [root, ...Array.from(root.querySelectorAll("*"))];
    return elements.flatMap((element) => {
      const style = getComputedStyle(element);
      const durations = `${style.animationDuration}|${style.transitionDuration}`;
      const hasMotion = durations
        .split("|")
        .some((group) =>
          group.split(",").some((part) => Number.parseFloat(part) > 0.00001),
        );
      return hasMotion
        ? [
            `${element.tagName.toLowerCase()}.${(element as HTMLElement).className}: ${durations}`,
          ]
        : [];
    });
  });
  expect(offenders, "editor shell must disable motion when requested").toEqual(
    [],
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
}

async function expectNoDocumentOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.client + 1);
}

async function selectFirstSection(page: Page) {
  await page
    .locator("[data-mi-section-id]")
    .first()
    .evaluate((element) => {
      (element as HTMLElement).click();
    });
  await expect(page.locator(".workspace-inspector")).toBeVisible();
}

async function openPublishReadiness(page: Page) {
  await page
    .locator(".workspace-rail")
    .getByRole("button", { name: "Domain & publish" })
    .click();
  await expect(
    page.getByRole("region", { name: "Publication readiness" }),
  ).toBeVisible();
}

async function expectVisibleFocus(page: Page, locator: Locator) {
  await locator.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(locator).toBeFocused();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth),
      shadow: style.boxShadow,
    };
  });
  expect(
    (focus.outlineStyle !== "none" && focus.outlineWidth >= 2) ||
      focus.shadow !== "none",
    "keyboard focus must have a visible indicator",
  ).toBe(true);
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
  await page.locator(".workspace-canvas").evaluate((element) => {
    element.scrollTo({ top: 0, left: 0 });
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIRECTORY, `${name}.png`),
    fullPage: true,
  });
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: "disabled",
    fullPage: true,
    maxDiffPixelRatio: 0.015,
  });
}

function title(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
