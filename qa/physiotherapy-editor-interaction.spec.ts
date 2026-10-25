import { expect, test, type Page, type Route } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import {
  applyPhysiotherapyDraftCandidate,
  createPhysiotherapyDraftScaffold,
} from "../apps/builder/app/industry-packs/drafts";
import { resolveCertifiedIndustryPackForSite } from "../apps/builder/app/industry-packs";
import { BUILDER_REVIEW_SESSION } from "./support/builder-review-fixture";

const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const SITE_ID = "44444444-4444-4444-8444-444444444444";
const CANDIDATE_ID = "clinic-physiotherapy-calm-arrival";
const BUSINESS_NAME = "Radhika Physiotherapy";
const UPDATED_CONTACT_HEADING = "Request a visit with Radhika Physiotherapy";

const STABLE_EDITOR_IMAGE = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#e6eeec"/>
    <path d="M80 610 C320 230 690 690 1120 180" fill="none" stroke="#b8d0cb" stroke-width="72" stroke-linecap="round"/>
    <circle cx="880" cy="220" r="92" fill="#f8faf8"/>
  </svg>
`);

type DraftRecord = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};

type HarnessState = {
  draft: DraftRecord;
  putPayloads: Array<{
    snapshot: Site;
    expectedRevision: number;
    updatedBy: string;
  }>;
  previewPaths: string[];
  unexpectedApiRequests: string[];
};

test.describe("archived Physiotherapy staging evidence in the real Builder editor", () => {
  test("edits and autosaves a pre-certification candidate without rewriting its stored evidence", async ({
    page,
  }) => {
    const site = createStagedPhysiotherapySite();
    expect(resolveCertifiedIndustryPackForSite(site)).toMatchObject({
      id: "clinic-physiotherapy",
      certification: "certified",
    });
    expect(site.generation).toMatchObject({
      packStatus: "unavailable",
      selectedCandidateId: CANDIDATE_ID,
      premiumGate: { passed: false },
    });

    const state = createHarnessState(site);
    const runtimeFailures: string[] = [];
    page.on("pageerror", (error) => runtimeFailures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeFailures.push(message.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await installHarness(page, state);

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(
      response?.ok(),
      "the authenticated Builder must render",
    ).toBeTruthy();
    await page
      .getByRole("button", { name: `Open ${BUSINESS_NAME} in editor` })
      .click();

    const preview = page.locator(".renderer-preview-document");
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".brand-lockup")).toContainText(BUSINESS_NAME);
    await expect(preview).toHaveAttribute("data-mi-domain", "clinic");
    await expect(preview).toHaveAttribute("data-mi-subtype", "physiotherapy");
    await expect(preview).toHaveAttribute("data-mi-candidate", CANDIDATE_ID);
    await expect(preview).not.toContainText(/dental|implant|crown|root canal/i);

    const pagePicker = page.getByLabel("Current website page");
    await expect(pagePicker.locator("option")).toHaveCount(6);
    await page
      .getByRole("navigation", { name: "Website pages" })
      .getByRole("button", { name: "Contact", exact: true })
      .click();
    await expect(preview).toHaveAttribute("data-mi-page", "contact");
    await expect(preview.locator("#contact-form")).toHaveCount(1);

    await preview.locator('[data-section-family="contact"]').click();
    const inspector = page.locator(".workspace-inspector");
    await expect(inspector).toHaveAttribute("aria-label", "Content editor");
    const heading = inspector.getByLabel("Heading");
    await expect(heading).toHaveValue(
      `Request an appointment with ${BUSINESS_NAME}`,
    );
    await heading.fill(UPDATED_CONTACT_HEADING);

    await expect
      .poll(() => state.putPayloads.length, {
        message: "the editor must persist the actual Physiotherapy edit",
        timeout: 5_000,
      })
      .toBe(1);
    await expect(page.locator(".save-state")).toHaveText("Saved");
    await expect(preview).toHaveAttribute("data-mi-candidate", CANDIDATE_ID);
    await expect(preview).toContainText(UPDATED_CONTACT_HEADING);

    const saved = state.putPayloads[0]!;
    expect(saved.expectedRevision).toBe(11);
    expect(saved.updatedBy).toBe("workspace-user");
    expect(saved.snapshot.domain).toBe("clinic");
    expect(saved.snapshot.subtype).toBe("physiotherapy");
    expect(saved.snapshot.pages).toHaveLength(6);
    expect(saved.snapshot.generation).toMatchObject({
      packStatus: "unavailable",
      selectedCandidateId: CANDIDATE_ID,
      premiumGate: { passed: false },
    });
    expect(saved.snapshot.generation?.candidateIds).toHaveLength(20);
    expect(resolveCertifiedIndustryPackForSite(saved.snapshot)).toMatchObject({
      id: "clinic-physiotherapy",
      certification: "certified",
    });
    const savedContactProps = saved.snapshot.pages
      .find((entry) => entry.id === "contact")
      ?.sections.find((entry) =>
        entry.component.componentId.toUpperCase().includes("-CONT-"),
      )?.props;
    expect(savedContactProps?.title ?? savedContactProps?.heading).toBe(
      UPDATED_CONTACT_HEADING,
    );

    await page
      .locator(".workspace-rail")
      .getByRole("button", { name: "Design", exact: true })
      .click();
    await expect(
      inspector.getByText(/All certified Physiotherapy clinic compositions/i),
    ).toBeVisible();

    await page
      .getByRole("group", { name: "Preview size" })
      .getByRole("button", { name: "mobile" })
      .click();
    await expect(page.locator(".renderer-preview-stage")).toHaveClass(
      /viewport-mobile/,
    );
    await expect(preview).toHaveAttribute("data-mi-candidate", CANDIDATE_ID);

    // Reflow the real Builder shell as well as its preview. This preserves the
    // archived candidate identity through the compact navigation path instead of
    // proving mobile rendering only inside a desktop editor frame.
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileTools = page.getByRole("navigation", { name: "Editor tools" });
    await expect(mobileTools).toBeVisible();
    await expect(page.locator(".workspace-rail")).toBeHidden();
    await expect(inspector).toBeVisible();
    await inspector
      .getByRole("button", { name: "Close editor panel" })
      .click();
    await expect(inspector).toBeHidden();
    await pagePicker.selectOption("therapies");
    await expect(preview).toHaveAttribute("data-mi-page", "therapies");
    await expect(preview).toHaveAttribute("data-mi-candidate", CANDIDATE_ID);
    await mobileTools.getByRole("button", { name: "Content" }).click();
    await expect(inspector).toBeVisible();
    await expect(inspector).toBeFocused();
    const documentWidth = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(documentWidth.scroll).toBeLessThanOrEqual(documentWidth.client + 1);

    expect(state.previewPaths).toContain("/");
    expect(state.previewPaths).toContain("/contact");
    expect(state.previewPaths).toContain("/therapies");
    expect(state.unexpectedApiRequests).toEqual([]);
    expect(
      runtimeFailures,
      "the real editor path must not log failures",
    ).toEqual([]);
  });
});

function createHarnessState(snapshot: Site): HarnessState {
  return {
    draft: {
      workspaceId: WORKSPACE_ID,
      siteId: SITE_ID,
      revision: 11,
      snapshot: structuredClone(snapshot),
      updatedAt: "2026-10-22T08:00:00.000Z",
      updatedBy: BUILDER_REVIEW_SESSION.user.id,
    },
    putPayloads: [],
    previewPaths: [],
    unexpectedApiRequests: [],
  };
}

async function installHarness(page: Page, state: HarnessState) {
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
    await handleApi(route, state);
  });
}

async function handleApi(route: Route, state: HarnessState) {
  const request = route.request();
  const url = new URL(request.url());
  expect(request.headers().authorization).toBe("Bearer qa-access-token");

  if (request.method() === "GET" && url.pathname === "/api/projects") {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: SITE_ID,
            workspace_id: WORKSPACE_ID,
            name: BUSINESS_NAME,
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
    expect(url.searchParams.get("workspaceId")).toBe(WORKSPACE_ID);
    expect(url.searchParams.get("siteId")).toBe(SITE_ID);
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
    expect(site.workspaceId).toBe(WORKSPACE_ID);
    expect(site.siteId).toBe(SITE_ID);
    expect(site.domain).toBe("clinic");
    expect(site.subtype).toBe("physiotherapy");
    expect(site.generation?.packStatus).toBe("unavailable");
    expect(site.generation?.selectedCandidateId).toBe(CANDIDATE_ID);
    expect(site.generation?.premiumGate.passed).toBe(false);
    state.previewPaths.push(payload.path);
    await route.continue();
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
    state.draft = {
      ...state.draft,
      revision: state.draft.revision + 1,
      snapshot,
      updatedAt: "2026-10-22T08:05:00.000Z",
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
    body: JSON.stringify({ error: "Unexpected Physio editor QA request" }),
  });
}

function createStagedPhysiotherapySite(): Site {
  const scaffold = createPhysiotherapyDraftScaffold(baseSite(), {
    businessName: BUSINESS_NAME,
    location: "Hyderabad, Telangana",
    services: [
      "Physiotherapy assessment",
      "Sports rehabilitation",
      "Mobility and movement support",
    ],
    conditions: ["Sports injuries", "Mobility concerns"],
    goals: ["Request an appointment"],
    languages: ["en"],
    openingHours: [
      "Monday–Friday, 8:00 AM–6:00 PM",
      "Saturday, 9:00 AM–1:00 PM",
    ],
    therapists: [
      {
        name: "Radhika Rao",
        role: "Physiotherapist",
        credentials: ["Clinic-supplied profile"],
        verified: true,
      },
    ],
  });
  return applyPhysiotherapyDraftCandidate(scaffold, CANDIDATE_ID);
}

function baseSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: SITE_ID,
    workspaceId: WORKSPACE_ID,
    name: BUSINESS_NAME,
    domain: "landing-page",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#315F73",
          secondary: "#294A59",
          accent: "#C79A6B",
          background: "#F5F8F7",
          surface: "#FFFFFF",
          textPrimary: "#294A59",
          textSecondary: "#526474",
          border: "#CBD8E1",
          success: "#287A58",
          warning: "#8A5A18",
          error: "#B42318",
        },
        typography: {
          display: "Manrope, Arial, sans-serif",
          body: "Inter, Arial, sans-serif",
          ui: "Inter, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Request a physiotherapy appointment",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
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
          title: BUSINESS_NAME,
          description: "Physiotherapy clinic in Hyderabad.",
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
