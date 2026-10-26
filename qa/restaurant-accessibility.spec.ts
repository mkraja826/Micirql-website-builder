import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  RESTAURANT_DRAFT_CANDIDATES,
  RESTAURANT_DRAFT_PAGE_PATHS,
} from "../apps/builder/app/industry-packs/drafts";

const ACCESSIBILITY_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 1440, height: 900 },
] as const;
const SELECTED_CANDIDATES = selectCandidates();

/**
 * The five-width route matrix owns responsive geometry. This gate adds WCAG
 * 2.2 A/AA automation at the mobile/desktop extremes, then exercises the
 * shared navigation and both Restaurant form journeys by keyboard.
 * Default coverage: 20 candidates x 6 routes x 2 widths = 240 scans.
 */
test.describe("Restaurant Top-20 accessibility and keyboard gate", () => {
  expect(RESTAURANT_DRAFT_CANDIDATES).toHaveLength(20);
  expect(RESTAURANT_DRAFT_PAGE_PATHS).toHaveLength(6);

  for (const candidate of SELECTED_CANDIDATES) {
    test(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} passes every route at mobile and desktop extremes`, async ({
      page,
    }) => {
      test.setTimeout(480_000);
      await page.emulateMedia({ reducedMotion: "reduce" });

      for (const pagePath of RESTAURANT_DRAFT_PAGE_PATHS) {
        const pageLabel = pagePath === "/" ? "home" : pagePath.slice(1);
        const route = restaurantPreviewRoute(pagePath, candidate.recipeId);

        for (const viewport of ACCESSIBILITY_VIEWPORTS) {
          await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
            const label = `${candidate.recipeId}/${pageLabel}/${viewport.width}`;
            await page.setViewportSize(viewport);
            const response = await page.goto(route, {
              waitUntil: "domcontentloaded",
            });
            expect(response?.ok(), `${label} must render`).toBeTruthy();
            await settlePage(page);

            const preview = page.locator(
              `[data-mi-restaurant-draft="${candidate.recipeId}"]`,
            );
            await expect(preview).toBeVisible();
            await expect(preview).toHaveAttribute(
              "data-mi-restaurant-candidate",
              candidate.recipeId,
            );
            await expect(preview).toHaveAttribute(
              "data-mi-restaurant-path",
              pagePath,
            );
            const site = preview.locator("main[data-mi-site]");
            await expect(site).toHaveAttribute("data-mi-domain", "restaurant");
            await expect(site).toHaveAttribute("data-mi-subtype", "restaurant");
            await expect(site).toHaveAttribute(
              "data-mi-candidate",
              candidate.id,
            );

            await expectAutomatedAccessibility(page, label);

            if (pagePath === "/") {
              await expectNavigationKeyboard(page, viewport.width, label);
              await expectReducedMotion(page, label);
            }
            if (pagePath === "/reservations") {
              await expectReservationFormKeyboard(page, label);
            }
            if (pagePath === "/contact") {
              await expectEnquiryFormKeyboard(page, label);
            }
          });
        }
      }
    });
  }
});

async function expectAutomatedAccessibility(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include("[data-mi-restaurant-draft]")
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
    results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target),
    })),
    `${label} must have no automated WCAG 2.2 A/AA violations`,
  ).toEqual([]);
}

async function expectNavigationKeyboard(
  page: Page,
  viewportWidth: number,
  label: string,
) {
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const links = navigation.locator("a");
  await expect(links).toHaveCount(6);

  if (viewportWidth < 1024) {
    const toggle = navigation.locator(".mi-nav-menu__toggle");
    await expect(toggle).toHaveAccessibleName("Open primary navigation");
    await tabUntilFocused(page, toggle, `${label} mobile menu toggle`);
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toHaveAccessibleName("Close primary navigation");
    await page.keyboard.press("Tab");
    await expect(links.first()).toBeFocused();
    await expectVisibleFocus(links.first(), `${label} first mobile nav link`);
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveAccessibleName("Open primary navigation");
  } else {
    await expect(
      navigation.getByRole("button", { name: /primary navigation/ }),
    ).toBeHidden();
    await tabUntilFocused(
      page,
      links.first(),
      `${label} first desktop nav link`,
    );
  }

  await tabUntilFocused(
    page,
    page
      .locator('[data-section-family="navbar"]')
      .getByRole("link", { name: "Request a table", exact: true }),
    `${label} navbar table-request action`,
  );
}

async function expectReservationFormKeyboard(page: Page, label: string) {
  const form = page.locator(
    '[data-section-family="contact"] form[action*="reservation.request"]',
  );
  await expectFormKeyboard(
    page,
    form,
    [
      form.getByLabel("Name", { exact: true }),
      form.getByLabel("Phone (optional)", { exact: true }),
      form.getByLabel("Email", { exact: true }),
      form.getByLabel("Requested date", { exact: true }),
      form.getByLabel("Requested time", { exact: true }),
      form.getByLabel("Party size", { exact: true }),
      form.getByLabel("Message", { exact: true }),
      form.getByLabel(
        /I agree that this business may use these details to respond to my request/,
      ),
      form.getByRole("button", { name: "Request a table", exact: true }),
    ],
    `${label} reservation form`,
  );
}

async function expectEnquiryFormKeyboard(page: Page, label: string) {
  const form = page.locator(
    '[data-section-family="contact"] form[action*="lead.create"]',
  );
  await expectFormKeyboard(
    page,
    form,
    [
      form.getByLabel("Name", { exact: true }),
      form.getByLabel("Phone (optional)", { exact: true }),
      form.getByLabel("Email", { exact: true }),
      form.getByLabel("Message", { exact: true }),
      form.getByLabel(
        /I agree that this business may use these details to respond to my request/,
      ),
      form.getByRole("button", { name: "Send enquiry", exact: true }),
    ],
    `${label} enquiry form`,
  );
}

async function expectFormKeyboard(
  page: Page,
  form: Locator,
  controls: Locator[],
  label: string,
) {
  await expect(form).toHaveCount(1);
  for (const [index, control] of controls.entries()) {
    await expect(
      control,
      `${label} control ${index + 1} must be visible`,
    ).toBeVisible();
    await tabUntilFocused(page, control, `${label} stop ${index + 1}`, 48);
  }
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  label: string,
  maximumTabs = 24,
) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      await expectVisibleFocus(target, label);
      return;
    }
  }
  expect(
    false,
    `${label} must be reachable within ${maximumTabs} Tab stops`,
  ).toBe(true);
}

async function expectVisibleFocus(target: Locator, label: string) {
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });
  expect(
    (focus.outlineStyle !== "none" && focus.outlineWidth > 0) ||
      focus.boxShadow !== "none",
    `${label} must expose a visible focus indicator`,
  ).toBe(true);
}

async function expectReducedMotion(page: Page, label: string) {
  const motion = await page
    .locator("[data-mi-restaurant-draft]")
    .evaluate((root) => {
      const elements = [
        ...root.querySelectorAll<HTMLElement>(
          ".mi-section__card, .mi-section__action, .mi-section__media, .mi-nav-menu__icon",
        ),
      ];
      return elements.flatMap((element) => {
        const styles = [
          getComputedStyle(element),
          getComputedStyle(element, "::before"),
          getComputedStyle(element, "::after"),
        ];
        const moving = styles.some(
          (style) =>
            hasDuration(style.animationDuration) ||
            hasDuration(style.transitionDuration),
        );
        return moving
          ? [`${element.tagName.toLowerCase()}.${element.className}`]
          : [];
      });

      function hasDuration(value: string) {
        return value
          .split(",")
          .map((duration) => Number.parseFloat(duration.trim()))
          .some((duration) => duration > 0);
      }
    });
  expect(motion, `${label} must honor reduced-motion preferences`).toEqual([]);
}

async function settlePage(page: Page) {
  await page.evaluate(async () => {
    await Promise.race([
      Promise.all(
        [...document.images].map((image) => {
          if (image.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }),
      ),
      new Promise<void>((resolve) => window.setTimeout(resolve, 8_000)),
    ]);
    await document.fonts.ready;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

function restaurantPreviewRoute(
  pagePath: (typeof RESTAURANT_DRAFT_PAGE_PATHS)[number],
  recipeId: string,
) {
  const pathname =
    pagePath === "/" ? "/restaurant-draft" : `/restaurant-draft${pagePath}`;
  return `${pathname}?candidate=${encodeURIComponent(recipeId)}`;
}

function selectCandidates() {
  const requested = (process.env.MI_QA_RESTAURANT_A11Y_CANDIDATES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!requested.length) return [...RESTAURANT_DRAFT_CANDIDATES];
  const selected = RESTAURANT_DRAFT_CANDIDATES.filter(
    ({ id, recipeId }) =>
      requested.includes(id) || requested.includes(recipeId),
  );
  const matched = new Set(
    selected.flatMap(({ id, recipeId }) => [id, recipeId]),
  );
  const unknown = requested.filter((value) => !matched.has(value));
  if (unknown.length) {
    throw new Error(
      `Unknown Restaurant accessibility candidates: ${unknown.join(", ")}`,
    );
  }
  return selected;
}
