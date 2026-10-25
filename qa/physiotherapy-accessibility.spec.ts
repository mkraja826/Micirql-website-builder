import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { PHYSIOTHERAPY_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";
import {
  PHYSIOTHERAPY_PAGE_PATHS,
  PHYSIOTHERAPY_VIEWPORTS,
  assertPhysiotherapyVisualState,
  expectedPhysiotherapyFamilies,
  physiotherapyPageLabel,
  physiotherapyPreviewRoute,
} from "./support/physiotherapy-visual-contract";

const ACCESSIBILITY_VIEWPORTS = PHYSIOTHERAPY_VIEWPORTS.filter(
  ({ width }) => width === 320 || width === 1440,
);
const SELECTED_CANDIDATES = selectCandidates();

/**
 * Candidate geometry is already covered at all five required widths. This gate
 * adds WCAG 2.2 A/AA automation on every route at the mobile/desktop extremes,
 * then exercises the shared navigation and appointment journey by keyboard.
 * Default coverage: 20 candidates × 6 routes × 2 widths = 240 scans.
 */
test.describe("Physiotherapy Top-20 accessibility and keyboard gate", () => {
  expect(PHYSIOTHERAPY_DRAFT_CANDIDATES).toHaveLength(20);
  expect(ACCESSIBILITY_VIEWPORTS.map(({ width }) => width)).toEqual([
    320, 1440,
  ]);

  for (const candidate of SELECTED_CANDIDATES) {
    test(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} passes every route at mobile and desktop extremes`, async ({
      page,
    }) => {
      test.setTimeout(420_000);
      await page.emulateMedia({ reducedMotion: "reduce" });

      for (const pagePath of PHYSIOTHERAPY_PAGE_PATHS) {
        const pageLabel = physiotherapyPageLabel(pagePath);
        const route = physiotherapyPreviewRoute(pagePath, {
          brief: "local",
          candidate: candidate.recipeId,
        });
        const expectedFamilies = expectedPhysiotherapyFamilies({
          pagePath,
          homeFlow: candidate.homeFlow,
          hasPracticalFacts: true,
        });

        for (const viewport of ACCESSIBILITY_VIEWPORTS) {
          await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
            const label = `${candidate.recipeId}/${pageLabel}/${viewport.width}`;
            await assertPhysiotherapyVisualState({
              page,
              route,
              pagePath,
              viewport,
              label,
              briefId: "local",
              candidateRecipeId: candidate.recipeId,
              candidateId: candidate.id,
              businessName: "Neighbourhood Motion Physio",
              expectedFamilies,
              expectedTheme: candidate.theme.family,
            });

            await expectAutomatedAccessibility(page, label);

            if (pagePath === "/") {
              await expectNavigationKeyboard(page, viewport.width, label);
              await expectReducedMotion(page, label);
            }
            if (pagePath === "/contact") {
              await expectFormKeyboard(page, label);
            }
          });
        }
      }
    });
  }
});

async function expectAutomatedAccessibility(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include('[data-mi-physiotherapy-draft="calm-clinical-movement"]')
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
  // Role queries intentionally omit the closed mobile menu. Count its DOM
  // links before opening it, then exercise the visible links by keyboard.
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
      .getByRole("link", { name: "Request appointment", exact: true }),
    `${label} navbar appointment action`,
  );
}

async function expectFormKeyboard(page: Page, label: string) {
  const form = page.locator('[data-section-family="contact"] form');
  await expect(form).toHaveCount(1);
  const requiredStops = [
    form.getByLabel("Name", { exact: true }),
    form.getByLabel("Email", { exact: true }),
    form.getByLabel(/I agree that this business may use these details/),
    form.getByRole("button", { name: "Request appointment", exact: true }),
  ];
  for (const [index, control] of requiredStops.entries()) {
    await tabUntilFocused(page, control, `${label} form stop ${index + 1}`, 32);
  }
}

async function tabUntilFocused(
  page: Page,
  target: Locator,
  label: string,
  maximumTabs = 20,
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
    .locator('[data-mi-physiotherapy-draft="calm-clinical-movement"]')
    .evaluate((root) => {
      const elements = [
        ...root.querySelectorAll<HTMLElement>(
          ".mi-section__card, .mi-section__action, .mi-nav-menu__icon",
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
          .map((duration) => duration.trim())
          .some((duration) => {
            const numeric = Number.parseFloat(duration);
            return duration.endsWith("ms") ? numeric > 0 : numeric > 0;
          });
      }
    });
  expect(motion, `${label} must honor reduced-motion preferences`).toEqual([]);
}

function selectCandidates() {
  const requested = (process.env.MI_QA_PHYSIO_A11Y_CANDIDATES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!requested.length) return [...PHYSIOTHERAPY_DRAFT_CANDIDATES];
  const selected = PHYSIOTHERAPY_DRAFT_CANDIDATES.filter(
    ({ id, recipeId }) =>
      requested.includes(id) || requested.includes(recipeId),
  );
  const matched = new Set(
    selected.flatMap(({ id, recipeId }) => [id, recipeId]),
  );
  const unknown = requested.filter((value) => !matched.has(value));
  if (unknown.length) {
    throw new Error(
      `Unknown Physiotherapy accessibility candidates: ${unknown.join(", ")}`,
    );
  }
  return selected;
}
