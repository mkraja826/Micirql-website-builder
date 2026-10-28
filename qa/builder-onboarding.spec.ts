import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdir } from "node:fs/promises";
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
  "builder-onboarding",
);

const QA_SESSION = {
  access_token: "qa-access-token",
  refresh_token: "qa-refresh-token",
  expires_in: 3600,
  expires_at: 4_102_444_800,
  token_type: "bearer",
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "qa@micirql.test",
  },
};

test.beforeAll(async () => {
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
});

test.describe("Builder product chrome: authenticated business brief", () => {
  for (const viewport of VIEWPORTS) {
    test(`pack-driven onboarding at ${viewport.width}px`, async ({ page }) => {
      const runtimeFailures: string[] = [];
      const unexpectedApiRequests: string[] = [];
      const authenticatedRequests: string[] = [];

      page.on("pageerror", (error) => runtimeFailures.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeFailures.push(message.text());
      });

      await page.setViewportSize(viewport);
      await page.addInitScript((session) => {
        window.localStorage.setItem(
          "micirql.supabase.session",
          JSON.stringify(session),
        );
      }, QA_SESSION);
      await page.route("**/api/**", async (route) => {
        await handleBuilderApi(
          route,
          authenticatedRequests,
          unexpectedApiRequests,
        );
      });

      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(
        response?.ok(),
        "the authenticated Builder must render",
      ).toBeTruthy();
      await expect(page).toHaveTitle("MiCirql Builder");
      await page.getByRole("button", { name: /open .* in editor/i }).click();

      const form = page.locator("form").filter({
        has: page.getByRole("heading", {
          level: 1,
          name: "Start with the business. We’ll shape the website.",
        }),
      });
      await expect(form).toBeVisible();
      await expectProductBrand(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(
        page.getByText("Plan your certified dental website."),
      ).toHaveCount(0);
      await expect(
        page.getByText(/rank 20 dental-only compositions/i),
      ).toHaveCount(0);

      const dental = page.locator('[data-industry-pack="clinic-dental"]');
      const physiotherapy = page.locator(
        '[data-industry-pack="clinic-physiotherapy"]',
      );
      const restaurant = page.locator(
        '[data-industry-pack="restaurant-restaurant"]',
      );
      const cafe = page.locator('[data-industry-pack="restaurant-cafe"]');
      await expect(dental).toHaveAttribute("data-pack-selected", "true");
      await expect(dental).toHaveAttribute("data-pack-status", "certified");
      await expect(dental).toContainText("Certified");
      await expect(dental).toHaveAttribute("aria-pressed", "true");
      await expect(physiotherapy).toHaveAttribute(
        "data-pack-status",
        "certified",
      );
      await expect(physiotherapy).toContainText("Certified");
      await expect(physiotherapy).toHaveAttribute("aria-pressed", "false");
      await expect(restaurant).toHaveAttribute("data-pack-status", "certified");
      await expect(restaurant).toContainText("Certified");
      await expect(restaurant).toHaveAttribute("aria-pressed", "false");
      await expect(cafe).toHaveAttribute("data-pack-status", "planned");
      await expect(cafe).toContainText("Planned");
      await expect(cafe).toContainText("Scheduled after current validation");
      await expect(cafe).not.toHaveAttribute("aria-pressed", /.+/);
      expect(await cafe.evaluate((element) => element.tagName)).toBe("ARTICLE");
      await expect(page.locator("[data-mobile-action]")).toBeHidden();
      if (viewport.width === 390 || viewport.width === 1440) {
        await capture(page, `business-brief-pack-roadmap-${viewport.width}`);
      }

      await physiotherapy.click();
      await expect(physiotherapy).toHaveAttribute("aria-pressed", "true");
      await expect(dental).toHaveAttribute("aria-pressed", "false");
      await expect(
        page.getByPlaceholder(
          "Sports rehabilitation, mobility, post-operative care",
        ),
      ).toBeVisible();
      await expect(
        page.getByPlaceholder(
          "Physiotherapy assessment, sports rehabilitation, mobility support",
        ),
      ).toBeVisible();
      await dental.click();
      await expect(dental).toHaveAttribute("aria-pressed", "true");

      const businessName = page.locator('input[autocomplete="organization"]');
      const location = page.getByPlaceholder("Hyderabad, Telangana");
      const focus = page.getByPlaceholder(
        "Implants, orthodontics, family dentistry",
      );
      const services = page.getByPlaceholder(
        "Dental implants, crowns, root canal treatment",
      );
      await businessName.fill("Radhika Dental");
      await location.fill("Hyderabad, Telangana");
      await focus.fill("Implants, family dentistry");
      await services.fill("Dental implants, crowns, root canal treatment");

      await expectVisibleFocus(page, businessName);
      await advanceBusinessBrief(page, viewport.width, "content & goals");

      const enrichment = page.locator("[data-enrichment-panel]");
      await enrichment.locator("summary").click();
      await page
        .getByPlaceholder("Mon–Sat, 9:00–18:00")
        .fill("Mon–Sat, 9:00–18:00");
      await page
        .getByPlaceholder(/Dr Radhika Rao/)
        .fill("Dr Radhika Rao, MDS Prosthodontics");
      await page
        .getByRole("button", {
          name: /Mix real clinic or team photos with the certified library/i,
        })
        .click();

      await expectVisibleFocus(page, enrichment.locator("summary"));
      await expectVisibleFocus(
        page,
        page.getByRole("button", { name: /generate leads/i }),
      );

      await advanceBusinessBrief(page, viewport.width, "brand & media");
      await advanceBusinessBrief(page, viewport.width, "review");

      const summary = page.getByRole("complementary", {
        name: "Brief summary",
      });
      await expect(summary).toContainText("Radhika Dental");
      await expect(summary).toContainText("3 supplied");
      await expect(summary).toContainText("Candidate palettes");
      await expect(summary).toContainText("Real + certified library");
      await expect(
        summary.getByText("MiCirql ranks 20 certified Dental directions.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(summary.getByText(/Dentaldirections/u)).toHaveCount(0);
      await expect(
        summary.getByText(
          "This saved brief remains the factual source for this project.",
          { exact: true },
        ),
      ).toHaveCount(1);
      await expect(
        summary.getByText("You can edit this brief before publishing.", {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: /review 20 dental directions|review 20 directions/i,
        }),
      ).toBeEnabled();

      const mobileAction = page.locator("[data-mobile-action]");
      if (viewport.width <= 820) {
        await expect(mobileAction).toBeVisible();
        await expect(mobileAction).toContainText("Review · 4 of 4");
      } else {
        await expect(mobileAction).toBeHidden();
      }

      await settlePage(page);
      await expectResponsiveShell(page, viewport.width);
      await expectAccessible(page, `business-brief/${viewport.width}`);
      await expectVisibleFocus(
        page,
        page.getByRole("button", {
          name: /review 20 dental directions|review 20 directions/i,
        }),
      );
      await capture(page, `business-brief-${viewport.width}`);

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
                  .some((duration) => Number.parseFloat(duration) > 0);
              return hasMotion
                ? `${element.tagName.toLowerCase()}.${element.className}`
                : null;
            })
            .filter((value): value is string => Boolean(value)),
        );
      expect(
        animatedElements,
        "the onboarding shell must honor reduced-motion preferences",
      ).toEqual([]);
      expect(unexpectedApiRequests, "no unmocked API may run").toEqual([]);
      expect(
        authenticatedRequests.sort(),
        "the real authenticated flow must reach dashboard, draft and onboarding APIs",
      ).toEqual(["drafts", "onboarding", "projects"]);
      expect(
        runtimeFailures,
        "the onboarding shell must not log runtime errors",
      ).toEqual([]);
    });
  }

  test("Restaurant onboarding keeps factual requirements and submits structured facts", async ({
    page,
  }) => {
    const unexpectedApiRequests: string[] = [];
    const authenticatedRequests: string[] = [];
    let submittedBrief: Record<string, unknown> | undefined;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((session) => {
      window.localStorage.setItem(
        "micirql.supabase.session",
        JSON.stringify(session),
      );
    }, QA_SESSION);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "POST" && url.pathname === "/api/onboarding") {
        expect(request.headers().authorization).toBe("Bearer qa-access-token");
        submittedBrief = request.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            message: "Restaurant payload captured for QA.",
          }),
        });
        return;
      }
      await handleBuilderApi(
        route,
        authenticatedRequests,
        unexpectedApiRequests,
      );
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /open .* in editor/i }).click();

    await page
      .getByPlaceholder("Implants, orthodontics, family dentistry")
      .fill("Implants");
    await page
      .getByPlaceholder("Dental implants, crowns, root canal treatment")
      .fill("Dental implants");

    const restaurant = page.locator(
      '[data-industry-pack="restaurant-restaurant"]',
    );
    await restaurant.click();
    await expect(restaurant).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByPlaceholder("Implants, orthodontics, family dentistry"),
    ).toHaveCount(0);
    await expect(
      page.getByPlaceholder("Dental implants, crowns, root canal treatment"),
    ).toHaveCount(0);

    await page
      .locator('input[autocomplete="organization"]')
      .fill("Radhika Restaurant");
    await page
      .getByPlaceholder("Hyderabad, Telangana")
      .fill("12 Jubilee Hills Road, Hyderabad, Telangana");
    await page
      .getByPlaceholder("South Indian, seasonal vegetarian, contemporary")
      .fill("South Indian, seasonal vegetarian");
    await page
      .getByPlaceholder("Dine-in, takeaway, private dining")
      .fill("Dine-in, takeaway");

    await advanceBusinessBrief(page, 390, "content & goals");

    const goals = page.getByRole("group", { name: "Main goals" });
    await expect(
      goals.getByRole("button", { name: /request reservations/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      goals.getByRole("button", { name: /show menu/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      goals.getByRole("button", { name: /plan visits/i }),
    ).toHaveAttribute("aria-pressed", "true");

    const capabilities = page.getByRole("group", {
      name: "Required functionality",
    });
    await expect(
      capabilities.getByRole("button", { name: /reservation request/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      capabilities.getByRole("button", { name: /^\+?menu$/i }),
    ).toHaveAttribute("aria-pressed", "true");

    await advanceBusinessBrief(page, 390, "brand & media");
    await advanceBusinessBrief(page, 390, "review");
    await page
      .locator("[data-mobile-action]")
      .getByRole("button", { name: /review 20 directions/i })
      .click();

    const missingFactsAlert = page.locator('form [role="alert"]');
    await expect(missingFactsAlert).toContainText(
      "Complete the Restaurant brief before reviewing directions.",
    );
    await expect(missingFactsAlert).toContainText(
      "Supply the restaurant's approved public HTTPS directions link.",
    );
    await expect(missingFactsAlert).toContainText(
      "Supply at least one approved public restaurant phone number or email address.",
    );
    expect(submittedBrief).toBeUndefined();

    const enrichment = page.locator("[data-enrichment-panel]");
    await enrichment.locator("summary").click();
    await page
      .getByPlaceholder("Mon–Sat, 9:00–18:00")
      .fill("Tue–Sun, 12:00–22:30");
    await page
      .getByPlaceholder(/Verified venue story/)
      .fill("Family-run dining room; step-free entrance");
    await page
      .getByPlaceholder(/Starters \| Paneer tikka/)
      .fill(
        "Starters | Paneer tikka | Charred paneer and peppers | ₹320 | Contains dairy\nMains | Vegetable biryani | Basmati rice and seasonal vegetables | ₹420 |",
      );
    await page
      .getByPlaceholder(/Tell our team about allergies/)
      .fill("Tell our team about allergies before ordering.");
    await page
      .getByPlaceholder(/Table requests are reviewed/)
      .fill(
        "Table requests are reviewed by the restaurant. A table is confirmed only after the restaurant responds.",
      );
    await page
      .getByPlaceholder("https://maps.google.com/…")
      .fill("https://maps.google.com/example");
    await page.getByPlaceholder("+91 90000 00000").fill("+91 90000 00001");
    await page
      .getByPlaceholder("hello@example.com")
      .fill("hello@radhikarestaurant.example");
    await page
      .getByPlaceholder("Step-free entrance, accessible seating")
      .fill("Step-free entrance; accessible seating");
    await page
      .getByPlaceholder("Street parking; paid parking nearby")
      .fill("Paid parking nearby");
    await page
      .getByPlaceholder("Metro station 400 m away")
      .fill("Metro station 400 m away");
    await page
      .getByPlaceholder(/Write only the story supplied/)
      .fill("A family-run restaurant focused on seasonal South Indian food.");
    await page
      .getByRole("button", {
        name: /Mix real menu or venue photos with the certified Restaurant library/i,
      })
      .click();

    await expectResponsiveShell(page, 390);
    await expectAccessible(page, "business-brief/restaurant-content");
    await settlePage(page);
    await capture(page, "business-brief-restaurant-content-390");

    await advanceBusinessBrief(page, 390, "brand & media");
    await advanceBusinessBrief(page, 390, "review");
    const summary = page.getByRole("complementary", { name: "Brief summary" });
    await expect(summary).toContainText("Radhika Restaurant");
    await expect(summary).toContainText("Real + certified library");
    await expect(
      summary.getByText("MiCirql ranks 20 certified Restaurant directions.", {
        exact: true,
      }),
    ).toBeVisible();
    await settlePage(page);
    await capture(page, "business-brief-restaurant-390");

    await page
      .locator("[data-mobile-action]")
      .getByRole("button", { name: /review 20 directions/i })
      .click();
    await expect.poll(() => submittedBrief).toBeDefined();
    expect(submittedBrief).toMatchObject({
      businessName: "Radhika Restaurant",
      packId: "restaurant-restaurant",
      industry: "restaurant",
      subindustry: "South Indian, seasonal vegetarian",
      location: "12 Jubilee Hills Road, Hyderabad, Telangana",
      services: ["Dine-in", "takeaway"],
      goals: ["request reservations", "show menu", "plan visits"],
      requiredCapabilities: [
        "contact form",
        "reservation request",
        "menu",
        "gallery",
        "maps",
      ],
      industryFacts: {
        kind: "restaurant-facts-v1",
        businessName: "Radhika Restaurant",
        cuisines: ["South Indian", "seasonal vegetarian"],
        serviceModes: ["Dine-in", "takeaway"],
        address: "12 Jubilee Hills Road, Hyderabad, Telangana",
        mapUrl: "https://maps.google.com/example",
        openingHours: ["Tue–Sun, 12:00–22:30"],
        accessibility: ["Step-free entrance", "accessible seating"],
        parking: ["Paid parking nearby"],
        transit: ["Metro station 400 m away"],
        visitDetails: ["Family-run dining room", "step-free entrance"],
        phone: "+91 90000 00001",
        email: "hello@radhikarestaurant.example",
        reservationPolicy: [
          "Table requests are reviewed by the restaurant. A table is confirmed only after the restaurant responds.",
        ],
        menu: {
          suppliedAsCurrent: true,
          categories: [
            {
              name: "Starters",
              items: [
                {
                  name: "Paneer tikka",
                  description: "Charred paneer and peppers",
                  price: "₹320",
                  disclosures: ["Contains dairy"],
                },
              ],
            },
            {
              name: "Mains",
              items: [
                {
                  name: "Vegetable biryani",
                  description: "Basmati rice and seasonal vegetables",
                  price: "₹420",
                  disclosures: [],
                },
              ],
            },
          ],
          notes: [],
          disclosureNotes: ["Tell our team about allergies before ordering."],
        },
      },
    });
    await expect(page.locator('form [role="alert"]')).toContainText(
      "Restaurant payload captured for QA.",
    );
    expect(unexpectedApiRequests).toEqual([]);
    expect(authenticatedRequests.sort()).toEqual([
      "drafts",
      "onboarding",
      "projects",
    ]);
  });

  test("logo upload failure stays actionable without changing the brief", async ({
    page,
  }) => {
    const unexpectedApiRequests: string[] = [];
    const authenticatedRequests: string[] = [];
    let uploadAttempts = 0;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((session) => {
      window.localStorage.setItem(
        "micirql.supabase.session",
        JSON.stringify(session),
      );
    }, QA_SESSION);
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        request.method() === "POST" &&
        url.pathname === "/api/assets/upload/intent"
      ) {
        expect(request.headers().authorization).toBe("Bearer qa-access-token");
        expect(request.headers()["x-micirql-user-id"]).toBeUndefined();
        uploadAttempts += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "UPLOAD_SERVICE_UNAVAILABLE",
            error:
              "Uploads are temporarily unavailable. Your current design is unchanged.",
            message:
              "Uploads are temporarily unavailable. Your current design is unchanged.",
            retryable: true,
          }),
        });
        return;
      }
      await handleBuilderApi(
        route,
        authenticatedRequests,
        unexpectedApiRequests,
      );
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /open .* in editor/i }).click();
    await page
      .getByRole("navigation", { name: "Business brief sections" })
      .getByRole("button", { name: /Brand & media/i })
      .click();
    const uploadInput = page.locator('input[type="file"]');
    await uploadInput.setInputFiles({
      name: "radhika-dental-logo.png",
      mimeType: "image/png",
      buffer: Buffer.from("valid-enough-for-intent"),
    });

    const failure = page.locator(
      '[role="alert"][data-upload-code="UPLOAD_SERVICE_UNAVAILABLE"]',
    );
    await expect(failure).toBeVisible();
    await expect(failure).toContainText("Logo not uploaded");
    await expect(failure).toContainText(
      "Uploads are temporarily unavailable. Your current design is unchanged.",
    );
    await expect(failure).not.toContainText(
      "ASSET_UPLOAD_GATEWAY_NOT_CONFIGURED",
    );
    await expect(page.getByText("Upload logo", { exact: true })).toBeVisible();
    await expect(page.getByText(/candidate palettes available/i)).toBeVisible();
    expect(uploadAttempts).toBe(1);

    await failure.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => uploadAttempts).toBe(2);
    await expect(failure).toBeVisible();
    await expectResponsiveShell(page, 390);
    await expectAccessible(page, "business-brief/logo-upload-failure");
    await capture(page, "business-brief-logo-upload-failure-390");

    await failure.getByRole("button", { name: "Dismiss" }).click();
    await expect(failure).toHaveCount(0);
    expect(unexpectedApiRequests).toEqual([]);
    expect(authenticatedRequests.sort()).toEqual([
      "drafts",
      "onboarding",
      "projects",
    ]);
  });
});

async function handleBuilderApi(
  route: Route,
  authenticatedRequests: string[],
  unexpectedApiRequests: string[],
) {
  const request = route.request();
  const url = new URL(request.url());
  const authorization = request.headers()["authorization"];
  expect(authorization).toBe("Bearer qa-access-token");

  if (request.method() === "GET" && url.pathname === "/api/projects") {
    authenticatedRequests.push("projects");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        projects: [
          {
            id: "site-onboarding-qa",
            workspace_id: "workspace-onboarding-qa",
            name: "Radhika Dental",
            status: "draft",
            published_version_id: null,
            updated_at: "2026-10-21T00:00:00.000Z",
            draft: {
              revision: 1,
              updated_at: "2026-10-21T00:00:00.000Z",
            },
            hostname: null,
          },
        ],
      }),
    });
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/drafts") {
    expect(request.headers()["x-micirql-workspace-id"]).toBe(
      "workspace-onboarding-qa",
    );
    expect(request.headers()["x-micirql-site-id"]).toBe("site-onboarding-qa");
    authenticatedRequests.push("drafts");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        draft: {
          workspaceId: "workspace-onboarding-qa",
          siteId: "site-onboarding-qa",
          revision: 1,
          snapshot: { name: "Radhika Dental" },
        },
      }),
    });
    return;
  }

  if (request.method() === "GET" && url.pathname === "/api/onboarding") {
    expect(request.headers()["x-micirql-workspace-id"]).toBe(
      "workspace-onboarding-qa",
    );
    expect(request.headers()["x-micirql-site-id"]).toBe("site-onboarding-qa");
    authenticatedRequests.push("onboarding");
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

  unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
  await route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unexpected QA API request" }),
  });
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

async function advanceBusinessBrief(
  page: Page,
  viewportWidth: number,
  nextLabel: string,
) {
  const button =
    viewportWidth <= 820
      ? page
          .locator("[data-mobile-action]")
          .getByRole("button", { name: /^Continue/ })
      : page.getByRole("button", {
          name: new RegExp(`continue to ${escapeRegExp(nextLabel)}`, "i"),
        });
  await button.click();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

async function expectAccessible(page: Page, state: string) {
  const results = await new AxeBuilder({ page })
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
      escapedElements,
      clippedText,
      controls,
    };
  });

  expect(
    audit.overflow,
    `${viewportWidth}px shell must not overflow horizontally`,
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
