import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PHYSIOTHERAPY_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";

const PREVIEW_ROOT = "/physiotherapy-draft";
const EXACT_LOGO_ASSET_ID = "qa-only/physiotherapy-supplied-logo-contract";
const BUSINESS_NAME = "Radhika Physiotherapy";
const VIEWPORTS = [
  { width: 320, height: 800, label: "mobile" },
  { width: 1440, height: 900, label: "desktop" },
] as const;
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "physiotherapy-logo-matrix",
);
const CANDIDATES = process.env.MI_QA_PHYSIO_CANDIDATE
  ? PHYSIOTHERAPY_DRAFT_CANDIDATES.filter(
      (candidate) =>
        candidate.id === process.env.MI_QA_PHYSIO_CANDIDATE ||
        candidate.recipeId === process.env.MI_QA_PHYSIO_CANDIDATE,
    )
  : PHYSIOTHERAPY_DRAFT_CANDIDATES;

test.describe("Physiotherapy supplied-logo candidate matrix", () => {
  test("all 20 draft candidates preserve one supplied identity in header and footer without responsive collisions", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    expect(CANDIDATES).toHaveLength(
      process.env.MI_QA_PHYSIO_CANDIDATE ? 1 : 20,
    );

    for (const candidate of CANDIDATES) {
      for (const viewport of VIEWPORTS) {
        await test.step(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} at ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          const route = `${PREVIEW_ROOT}?candidate=${encodeURIComponent(candidate.recipeId)}&logo=contract`;
          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(
            response?.ok(),
            `${candidate.id} logo preview must render`,
          ).toBe(true);
          await settlePage(page);

          const preview = page.locator("[data-mi-physiotherapy-draft]");
          await expect(preview).toHaveAttribute(
            "data-mi-physiotherapy-candidate",
            candidate.recipeId,
          );
          await expect(preview).toHaveAttribute(
            "data-mi-physiotherapy-logo",
            "contract",
          );
          await expect(preview.locator("main[data-mi-site]")).toHaveAttribute(
            "data-mi-candidate",
            candidate.id,
          );

          const headerBrand = preview.locator(
            '[data-section-family="navbar"] .mi-navbar__brand',
          );
          const footerBrand = preview.locator(
            '[data-section-family="footer"] .mi-footer__brand-home',
          );
          const headerLogo = headerBrand.locator(
            'img[data-mi-image-field="brandMark"]',
          );
          const footerLogo = footerBrand.locator(
            'img[data-mi-image-field="brandMark"]',
          );
          const logos = preview.locator('img[data-mi-image-field="brandMark"]');

          await expect(logos).toHaveCount(2);
          await expect(headerLogo).toHaveCount(1);
          await expect(footerLogo).toHaveCount(1);
          await expect(headerBrand).toHaveAttribute(
            "aria-label",
            `${BUSINESS_NAME} home`,
          );
          await expect(footerBrand).toHaveAttribute(
            "aria-label",
            `${BUSINESS_NAME} home`,
          );
          await expect(headerBrand).toHaveText("");
          await expect(footerBrand).toHaveText("");

          const metrics = await logos.evaluateAll((images) =>
            images.map((image) => {
              const element = image as HTMLImageElement;
              const rect = element.getBoundingClientRect();
              const parentRect = element.parentElement!.getBoundingClientRect();
              const style = getComputedStyle(element);
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
                parentLeft: parentRect.left,
                parentRight: parentRect.right,
                objectFit: style.objectFit,
                src: element.currentSrc,
              };
            }),
          );
          expect(new Set(metrics.map((metric) => metric.src)).size).toBe(1);
          for (const metric of metrics) {
            expect(metric.assetId).toBe(EXACT_LOGO_ASSET_ID);
            expect(metric.alt).toBe(
              `${BUSINESS_NAME} supplied logo QA fixture`,
            );
            expect(metric.complete).toBe(true);
            expect(metric.naturalWidth).toBe(600);
            expect(metric.naturalHeight).toBe(100);
            expect(metric.objectFit).toBe("contain");
            expect(metric.renderedWidth).toBeGreaterThan(0);
            expect(metric.renderedHeight).toBeGreaterThan(0);
            expect(metric.renderedWidth / metric.renderedHeight).toBeCloseTo(
              6,
              1,
            );
            expect(metric.left).toBeGreaterThanOrEqual(-0.5);
            expect(metric.right).toBeLessThanOrEqual(viewport.width + 0.5);
            expect(metric.left).toBeGreaterThanOrEqual(metric.parentLeft - 0.5);
            expect(metric.right).toBeLessThanOrEqual(metric.parentRight + 0.5);
          }

          const responsive = await responsiveLogoAudit(page);
          expect
            .soft(
              responsive.documentOverflowPx,
              `${candidate.id} at ${viewport.width}px`,
            )
            .toBeLessThanOrEqual(1);
          expect
            .soft(
              responsive.headerSiblingOverlaps,
              `${candidate.id} header at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              responsive.escapedLogoContainers,
              `${candidate.id} logos at ${viewport.width}px`,
            )
            .toEqual([]);
          if (viewport.width === 320) {
            expect(responsive.headerBrandWidth).toBeGreaterThanOrEqual(44);
            expect(responsive.headerBrandHeight).toBeGreaterThanOrEqual(44);
          }

          const internalLinks = await preview
            .locator('a[href^="/physiotherapy-draft"]')
            .evaluateAll((links) =>
              links.map((link) => (link as HTMLAnchorElement).href),
            );
          expect(internalLinks.length).toBeGreaterThan(0);
          for (const href of internalLinks) {
            const parsed = new URL(href);
            expect(parsed.searchParams.get("candidate")).toBe(
              candidate.recipeId,
            );
            expect(parsed.searchParams.get("logo")).toBe("contract");
          }

          await page.screenshot({
            path: path.join(
              OUTPUT_DIRECTORY,
              `${candidate.rankSeed.toString().padStart(2, "0")}-${candidate.recipeId}-${viewport.label}.png`,
            ),
            fullPage: true,
            animations: "disabled",
          });
        });
      }
    }
  });

  test("default Physiotherapy previews keep the business-name fallback and reject unknown logo fixtures", async ({
    page,
  }) => {
    const response = await page.goto(PREVIEW_ROOT, {
      waitUntil: "domcontentloaded",
    });
    expect(response?.ok()).toBe(true);
    const preview = page.locator("[data-mi-physiotherapy-draft]");
    await expect(preview).not.toHaveAttribute(
      "data-mi-physiotherapy-logo",
      /.+/,
    );
    await expect(
      preview.locator('img[data-mi-image-field="brandMark"]'),
    ).toHaveCount(0);
    await expect(
      preview.locator('[data-section-family="navbar"] .mi-navbar__brand'),
    ).toContainText(BUSINESS_NAME);
    await expect(
      preview.locator('[data-section-family="footer"] .mi-footer__brand'),
    ).toContainText(BUSINESS_NAME);

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
  });
}

async function responsiveLogoAudit(page: Page) {
  return page.locator("[data-mi-physiotherapy-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const headerBrand = root.querySelector<HTMLElement>(
      '[data-section-family="navbar"] .mi-navbar__brand',
    );
    if (!headerBrand) throw new Error("Missing Physiotherapy header brand");
    const brandRect = headerBrand.getBoundingClientRect();
    const headerSiblings = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-section-family="navbar"] .mi-nav-menu, [data-section-family="navbar"] .mi-navbar__cta',
      ),
    ].filter((element) => isVisible(element));
    const logoContainers = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-section-family="navbar"] .mi-navbar__brand, [data-section-family="footer"] .mi-footer__brand-home',
      ),
    ];
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
        .map((element) => element.className),
      escapedLogoContainers: logoContainers
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left < -0.5 || rect.right > documentRoot.clientWidth + 0.5
          );
        })
        .map((element) => element.className),
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
  });
}
