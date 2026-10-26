import { expect, test, type Page } from "@playwright/test";
import { RESTAURANT_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";

const PREVIEW_ROOT = "/restaurant-draft";
const BUSINESS_NAME = "Aarunya Table";
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 1440, height: 900 },
] as const;
const LOGO_STATES = [
  { id: "none", width: 0, height: 0, assetId: undefined },
  {
    id: "square",
    width: 160,
    height: 160,
    assetId: "qa-only/restaurant-logo-square",
  },
  {
    id: "wide-3x1",
    width: 480,
    height: 160,
    assetId: "qa-only/restaurant-logo-wide-3x1",
  },
  {
    id: "wide-6x1",
    width: 600,
    height: 100,
    assetId: "qa-only/restaurant-logo-wide-6x1",
  },
  {
    id: "portrait",
    width: 120,
    height: 240,
    assetId: "qa-only/restaurant-logo-portrait",
  },
] as const;
const SELECTED_CANDIDATES = selectCandidates();

// A candidate test performs ten navigations. Disabling per-navigation traces
// avoids Playwright's Windows trace-segment ENOENT failure while retaining the
// assertion-level responsive evidence for every state.
test.use({ trace: "off" });

/**
 * Restaurant logo certification matrix:
 * 20 candidate systems x five identity states x mobile/desktop = 200 states.
 * This isolates logo geometry from the existing six-route content matrix while
 * proving that every explicit identity choice survives internal navigation.
 */
test.describe("Restaurant Top-20 supplied-logo matrix", () => {
  expect(RESTAURANT_DRAFT_CANDIDATES).toHaveLength(20);
  expect(LOGO_STATES.map(({ id }) => id)).toEqual([
    "none",
    "square",
    "wide-3x1",
    "wide-6x1",
    "portrait",
  ]);

  for (const candidate of SELECTED_CANDIDATES) {
    test(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} contains every supported identity ratio`, async ({
      page,
    }) => {
      test.setTimeout(360_000);

      for (const logoState of LOGO_STATES) {
        for (const viewport of VIEWPORTS) {
          await test.step(`${logoState.id} at ${viewport.width}px`, async () => {
            const label = `${candidate.recipeId}/${logoState.id}/${viewport.width}px`;
            await page.setViewportSize(viewport);
            const response = await page.goto(
              `${PREVIEW_ROOT}?candidate=${encodeURIComponent(candidate.recipeId)}&logo=${logoState.id}`,
              { waitUntil: "domcontentloaded" },
            );
            expect(response?.ok(), `${label} must render`).toBe(true);
            await settlePage(page);

            const preview = page.locator("[data-mi-restaurant-draft]");
            await expect(preview).toHaveAttribute(
              "data-mi-restaurant-candidate",
              candidate.recipeId,
            );
            await expect(preview).toHaveAttribute(
              "data-mi-restaurant-logo",
              logoState.id,
            );
            await expect(preview.locator("main[data-mi-site]")).toHaveAttribute(
              "data-mi-candidate",
              candidate.id,
            );

            const headerBrand = preview.locator(
              '[data-section-family="navbar"] .mi-navbar__brand',
            );
            const footerBrand = preview.locator(
              '[data-section-family="footer"] .mi-footer__brand',
            );
            const logos = preview.locator(
              'img[data-mi-image-field="brandMark"]',
            );

            if (logoState.id === "none") {
              await expect(logos).toHaveCount(0);
              await expect(headerBrand).toContainText(BUSINESS_NAME);
              await expect(footerBrand).toContainText(BUSINESS_NAME);
            } else {
              await expect(logos).toHaveCount(2);
              await expect(
                headerBrand.locator('img[data-mi-image-field="brandMark"]'),
              ).toHaveCount(1);
              await expect(
                footerBrand.locator('img[data-mi-image-field="brandMark"]'),
              ).toHaveCount(1);
              await expect(headerBrand).toHaveAttribute(
                "aria-label",
                `${BUSINESS_NAME} home`,
              );
              await expect(
                footerBrand.locator(".mi-footer__brand-home"),
              ).toHaveAttribute("aria-label", `${BUSINESS_NAME} home`);
              await expect(headerBrand).toHaveText("");
              await expect(
                footerBrand.locator(".mi-footer__brand-home"),
              ).toHaveText("");

              const metrics = await logos.evaluateAll((images) =>
                images.map((image) => {
                  const element = image as HTMLImageElement;
                  const rect = element.getBoundingClientRect();
                  const parentRect =
                    element.parentElement!.getBoundingClientRect();
                  return {
                    assetId: element.dataset.miLogoAssetId,
                    alt: element.alt,
                    complete: element.complete,
                    naturalWidth: element.naturalWidth,
                    naturalHeight: element.naturalHeight,
                    renderedWidth: rect.width,
                    renderedHeight: rect.height,
                    left: rect.left,
                    right: rect.right,
                    top: rect.top,
                    bottom: rect.bottom,
                    parentLeft: parentRect.left,
                    parentRight: parentRect.right,
                    parentTop: parentRect.top,
                    parentBottom: parentRect.bottom,
                    objectFit: getComputedStyle(element).objectFit,
                    src: element.currentSrc,
                  };
                }),
              );
              expect(
                new Set(metrics.map(({ src }) => src)).size,
                `${label} must use one exact uploaded asset`,
              ).toBe(1);
              for (const metric of metrics) {
                expect(metric.assetId, label).toBe(logoState.assetId);
                expect(metric.alt, label).toBe(
                  `${BUSINESS_NAME} supplied logo QA fixture`,
                );
                expect(metric.complete, label).toBe(true);
                expect(metric.naturalWidth, label).toBe(logoState.width);
                expect(metric.naturalHeight, label).toBe(logoState.height);
                expect(metric.objectFit, label).toBe("contain");
                expect(metric.renderedWidth, label).toBeGreaterThan(0);
                expect(metric.renderedHeight, label).toBeGreaterThan(0);
                expect(metric.left, label).toBeGreaterThanOrEqual(
                  metric.parentLeft - 0.5,
                );
                expect(metric.right, label).toBeLessThanOrEqual(
                  metric.parentRight + 0.5,
                );
                expect(metric.top, label).toBeGreaterThanOrEqual(
                  metric.parentTop - 0.5,
                );
                expect(metric.bottom, label).toBeLessThanOrEqual(
                  metric.parentBottom + 0.5,
                );
              }
            }

            const responsive = await responsiveLogoAudit(page);
            expect
              .soft(responsive.documentOverflowPx, label)
              .toBeLessThanOrEqual(1);
            expect.soft(responsive.headerSiblingOverlaps, label).toEqual([]);
            expect.soft(responsive.escapedBrandContainers, label).toEqual([]);
            expect.soft(responsive.clippedLogos, label).toEqual([]);
            if (viewport.width === 320) {
              expect
                .soft(responsive.headerBrandWidth, label)
                .toBeGreaterThanOrEqual(44);
              expect
                .soft(responsive.headerBrandHeight, label)
                .toBeGreaterThanOrEqual(44);
            }

            const internalLinks = await preview
              .locator('a[href^="/restaurant-draft"]')
              .evaluateAll((links) =>
                links.map((link) => (link as HTMLAnchorElement).href),
              );
            expect(internalLinks.length, label).toBeGreaterThan(0);
            for (const href of internalLinks) {
              const parsed = new URL(href);
              expect(parsed.searchParams.get("candidate"), href).toBe(
                candidate.recipeId,
              );
              expect(parsed.searchParams.get("logo"), href).toBe(logoState.id);
            }
          });
        }
      }
    });
  }

  test("legacy default logo remains stable and unknown logo fixtures return 404", async ({
    page,
  }) => {
    const response = await page.goto(PREVIEW_ROOT, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBe(true);
    const preview = page.locator("[data-mi-restaurant-draft]");
    await expect(preview).toHaveAttribute(
      "data-mi-restaurant-logo",
      "contract",
    );
    const logos = preview.locator('img[data-mi-image-field="brandMark"]');
    await expect(logos).toHaveCount(2);
    await expect(logos.first()).toHaveAttribute(
      "data-mi-logo-asset-id",
      "qa-only/restaurant-supplied-logo-contract",
    );

    const unknown = await page.goto(`${PREVIEW_ROOT}?logo=not-a-fixture`, {
      waitUntil: "domcontentloaded",
    });
    expect(unknown?.status()).toBe(404);
  });
});

async function settlePage(page: Page) {
  const images = page.locator("img");
  for (let index = 0; index < (await images.count()); index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
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

async function responsiveLogoAudit(page: Page) {
  return page.locator("[data-mi-restaurant-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const headerBrand = root.querySelector<HTMLElement>(
      '[data-section-family="navbar"] .mi-navbar__brand',
    );
    if (!headerBrand) throw new Error("Missing Restaurant header brand");
    const brandRect = headerBrand.getBoundingClientRect();
    const headerSiblings = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-section-family="navbar"] .mi-nav-menu, [data-section-family="navbar"] .mi-section__action',
      ),
    ].filter((element) => isVisible(element));
    const brandContainers = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-section-family="navbar"] .mi-navbar__brand, [data-section-family="footer"] .mi-footer__brand-home',
      ),
    ].filter((element) => isVisible(element));
    const logos = [
      ...root.querySelectorAll<HTMLImageElement>(
        'img[data-mi-image-field="brandMark"]',
      ),
    ].filter((element) => isVisible(element));

    return {
      documentOverflowPx: Math.max(
        0,
        documentRoot.scrollWidth - documentRoot.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      headerBrandWidth: brandRect.width,
      headerBrandHeight: brandRect.height,
      headerSiblingOverlaps: headerSiblings
        .filter(
          (element) =>
            overlapArea(brandRect, element.getBoundingClientRect()) > 1,
        )
        .map(describe),
      escapedBrandContainers: brandContainers
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < -0.5 || rect.right > documentRoot.clientWidth + 0.5
          );
        })
        .map(describe),
      clippedLogos: logos
        .filter(
          (image) =>
            image.scrollWidth > image.clientWidth + 1 ||
            image.scrollHeight > image.clientHeight + 1,
        )
        .map(describe),
    };

    function isVisible(element: HTMLElement) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }

    function overlapArea(first: DOMRect, second: DOMRect) {
      return (
        Math.max(
          0,
          Math.min(first.right, second.right) -
            Math.max(first.left, second.left),
        ) *
        Math.max(
          0,
          Math.min(first.bottom, second.bottom) -
            Math.max(first.top, second.top),
        )
      );
    }

    function describe(element: HTMLElement) {
      return `${element.tagName.toLowerCase()}.${String(element.className)
        .trim()
        .replace(/\s+/g, ".")}`;
    }
  });
}

function selectCandidates() {
  const requested = (process.env.MI_QA_RESTAURANT_LOGO_CANDIDATES ?? "")
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
      `Unknown Restaurant logo candidates: ${unknown.join(", ")}`,
    );
  }
  return selected;
}
