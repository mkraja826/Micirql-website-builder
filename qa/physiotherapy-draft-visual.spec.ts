import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE } from "../apps/builder/app/industry-packs/drafts";

const PREVIEW_ROOT = "/physiotherapy-draft";
const PAGE_PATHS = [
  "/",
  "/therapies",
  "/conditions",
  "/therapists",
  "/about",
  "/contact",
] as const;
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;
const SCREENSHOT_WIDTHS = new Set([320, 390, 1440]);
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "physiotherapy-draft-visual-spec",
);

type ImageAudit = {
  src: string;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
};

type ResponsiveAudit = {
  documentOverflowPx: number;
  escapedElements: string[];
  clippedText: string[];
  heroTrackCount: number;
  heroOverlapArea: number;
  h1: {
    count: number;
    text: string;
    fontFamily: string;
    fontSizePx: number;
    fontWeight: number;
    lineHeightRatio: number;
    lineCount: number;
    textTransform: string;
    wordBreak: string;
    overflowWrap: string;
    clipped: boolean;
  };
  undersizedControls: string[];
  navbarSiblingOverlaps: string[];
};

test.describe("physiotherapy draft: rendered responsive visual gate", () => {
  test("all six routes meet the pack's visual, media, and copy contract", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });

    const siteImageSources = new Set<string>();
    const heroImageSources = new Set<string>();
    const supportingImageSources = new Set<string>();

    for (const pagePath of PAGE_PATHS) {
      const route = previewRoute(pagePath);
      const pageLabel = pagePath === "/" ? "home" : pagePath.slice(1);

      for (const viewport of VIEWPORTS) {
        await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          const response = await page.goto(route, { waitUntil: "networkidle" });
          expect(response?.ok(), `${route} must render`).toBeTruthy();

          const preview = page.locator(
            '[data-mi-physiotherapy-draft="calm-clinical-movement"]',
          );
          await expect(preview).toBeVisible();
          await expect(preview).toHaveAttribute(
            "data-mi-physiotherapy-path",
            pagePath,
          );
          await expect(preview.locator("main[data-mi-site]")).toHaveAttribute(
            "data-mi-domain",
            "clinic",
          );
          await expect(preview.locator("main[data-mi-site]")).toHaveAttribute(
            "data-mi-subtype",
            "physiotherapy",
          );
          await expect(preview.locator("main[data-mi-site]")).toHaveAttribute(
            "data-mi-candidate",
            PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE.candidateId,
          );
          await settlePage(page);

          const visibleText = await preview.innerText();
          expect
            .soft(visibleText, `${pageLabel} must not leak dental language`)
            .not.toMatch(/\b(?:dental|dentist|tooth|teeth|root canal)\b/i);
          expect
            .soft(visibleText, `${pageLabel} must not promise an outcome`)
            .not.toMatch(
              /\b(?:guaranteed (?:recovery|result|pain relief)|cure[ds]?|pain[- ]free)\b/i,
            );
          expect
            .soft(
              visibleText,
              `${pageLabel} must describe a request, not a confirmed slot`,
            )
            .not.toMatch(
              /\b(?:book now|instant (?:booking|confirmation)|appointment (?:is|has been) confirmed|confirmed appointment slot|your slot is confirmed)\b/i,
            );

          expect
            .soft(
              preview.locator('[data-section-family="team"]'),
              `${pageLabel} must hide the team section without verified people`,
            )
            .toHaveCount(0);
          expect
            .soft(
              preview.locator('[data-section-family="gallery"]'),
              `${pageLabel} must hide the gallery without verified clinic media`,
            )
            .toHaveCount(0);
          expect
            .soft(
              preview.locator('[data-section-family="testimonials"]'),
              `${pageLabel} must not render unverified testimonials`,
            )
            .toHaveCount(0);

          const audit = await responsiveAudit(page);
          expect
            .soft(
              audit.documentOverflowPx,
              `${pageLabel} must not overflow at ${viewport.width}px`,
            )
            .toBeLessThanOrEqual(1);
          expect
            .soft(
              audit.escapedElements,
              `${pageLabel} has elements outside its canvas at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              audit.clippedText,
              `${pageLabel} clips readable text at ${viewport.width}px`,
            )
            .toEqual([]);

          expect
            .soft(audit.h1.count, `${pageLabel} must render one H1`)
            .toBe(1);
          expect
            .soft(audit.h1.text, `${pageLabel} H1 must be populated`)
            .not.toBe("");
          expect
            .soft(
              audit.h1.fontFamily.toLowerCase(),
              `${pageLabel} must use the physiotherapy display family`,
            )
            .toContain("manrope");
          expect
            .soft(
              audit.h1.fontWeight,
              `${pageLabel} H1 must avoid ultra-bold display type`,
            )
            .toBeGreaterThanOrEqual(600);
          expect
            .soft(
              audit.h1.fontWeight,
              `${pageLabel} H1 must avoid ultra-bold display type`,
            )
            .toBeLessThanOrEqual(700);
          expect.soft(audit.h1.textTransform).toBe("none");
          expect.soft(audit.h1.wordBreak).toBe("normal");
          expect
            .soft(audit.h1.clipped, `${pageLabel} H1 must not clip`)
            .toBe(false);
          expect
            .soft(
              audit.h1.fontSizePx,
              `${pageLabel} H1 must remain readable at ${viewport.width}px`,
            )
            .toBeGreaterThanOrEqual(32);
          expect
            .soft(
              audit.h1.fontSizePx,
              `${pageLabel} H1 must not become billboard-sized at ${viewport.width}px`,
            )
            .toBeLessThanOrEqual(72);
          expect
            .soft(
              audit.h1.lineCount,
              `${pageLabel} H1 must have a measurable line box`,
            )
            .toBeGreaterThanOrEqual(1);
          expect
            .soft(
              audit.h1.lineCount,
              `${pageLabel} H1 should not become an unreadable word stack`,
            )
            .toBeLessThanOrEqual(viewport.width <= 390 ? 6 : 5);

          if (viewport.width <= 390) {
            expect
              .soft(
                audit.h1.fontSizePx,
                `${pageLabel} mobile H1 must stay within the pack range`,
              )
              .toBeLessThanOrEqual(44);
            expect
              .soft(
                audit.h1.lineHeightRatio,
                `${pageLabel} mobile H1 must have readable leading`,
              )
              .toBeGreaterThanOrEqual(1.07);
            expect
              .soft(
                audit.h1.lineHeightRatio,
                `${pageLabel} mobile H1 must have readable leading`,
              )
              .toBeLessThanOrEqual(1.15);
          }

          expect
            .soft(
              audit.undersizedControls,
              `${pageLabel} has controls below 44px at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              audit.navbarSiblingOverlaps,
              `${pageLabel} has colliding navbar regions at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              audit.heroTrackCount,
              `${pageLabel} hero must collapse on tablet and mobile`,
            )
            .toBe(viewport.width < 1024 ? 1 : 2);
          expect
            .soft(
              audit.heroOverlapArea,
              `${pageLabel} hero copy and media must not overlap`,
            )
            .toBe(0);

          if (SCREENSHOT_WIDTHS.has(viewport.width)) {
            await page.screenshot({
              path: path.join(
                OUTPUT_DIRECTORY,
                `${pageLabel}-${viewport.width}px-full.png`,
              ),
              animations: "disabled",
              fullPage: true,
            });
            if (pagePath === "/") {
              await page.screenshot({
                path: path.join(
                  OUTPUT_DIRECTORY,
                  `${pageLabel}-${viewport.width}px-fold.png`,
                ),
                animations: "disabled",
              });
            }
          }

          if (viewport.width === 1440) {
            const images = await visibleImageAudit(page);
            if (pagePath === "/") {
              expect
                .soft(
                  images.length,
                  `${pageLabel} must render seven meaningful images`,
                )
                .toBe(7);
            } else {
              expect.soft(images.length).toBeGreaterThanOrEqual(1);
              expect.soft(images.length).toBeLessThanOrEqual(4);
            }
            expect
              .soft(
                new Set(images.map(({ src }) => src)).size,
                `${pageLabel} must not repeat an image on the same page`,
              )
              .toBe(images.length);

            for (const image of images) {
              expect
                .soft(
                  image.naturalWidth,
                  `${pageLabel} image failed to load: ${image.src}`,
                )
                .toBeGreaterThan(0);
              expect
                .soft(
                  image.naturalHeight,
                  `${pageLabel} image failed to load: ${image.src}`,
                )
                .toBeGreaterThan(0);
              expect
                .soft(
                  image.alt.trim().length,
                  `${pageLabel} image needs meaningful alternative text: ${image.src}`,
                )
                .toBeGreaterThan(20);
              siteImageSources.add(image.src);
            }

            const heroImages = await preview
              .locator('[data-section-family="hero"] img')
              .evaluateAll((images) =>
                images.map((image) => (image as HTMLImageElement).currentSrc),
              );
            expect
              .soft(
                heroImages,
                `${pageLabel} must render exactly one hero image`,
              )
              .toHaveLength(1);
            const heroSource = heroImages[0];
            if (heroSource) {
              heroImageSources.add(heroSource);
              for (const image of images) {
                if (image.src !== heroSource) {
                  supportingImageSources.add(image.src);
                }
              }
            }

            if (pagePath === "/") {
              const grammar = await physiotherapyVisualGrammarAudit(page);
              expect(grammar.heroShadow).not.toBe("none");
              expect(grammar.secondCardMarginTopPx).toBeGreaterThan(0);
              expect(grammar.processPathContent).not.toBe("none");
              expect(grammar.ctaMotifContent).not.toBe("none");
            }
          }
        });
      }
    }

    expect
      .soft(
        heroImageSources.size,
        "all six physiotherapy pages must use distinct hero images",
      )
      .toBe(PAGE_PATHS.length);
    expect
      .soft(
        siteImageSources.size,
        "the draft must render its complete 12-image licensed pool",
      )
      .toBe(12);
    expect
      .soft(
        [...heroImageSources].filter((source) =>
          supportingImageSources.has(source),
        ),
        "hero images must not be reused as supporting content",
      )
      .toEqual([]);
  });
});

function previewRoute(pagePath: (typeof PAGE_PATHS)[number]) {
  return pagePath === "/" ? PREVIEW_ROOT : `${PREVIEW_ROOT}${pagePath}`;
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
  });
}

async function physiotherapyVisualGrammarAudit(page: Page) {
  return page
    .locator('main[data-mi-subtype="physiotherapy"]')
    .evaluate((root) => {
      const required = (selector: string) => {
        const element = root.querySelector<HTMLElement>(selector);
        if (!element)
          throw new Error(`Missing visual grammar target ${selector}`);
        return element;
      };
      const heroMedia = required(
        '[data-section-family="hero"] .mi-section__media',
      );
      const serviceCards = root.querySelectorAll<HTMLElement>(
        '[data-section-family="services"] .mi-section__card',
      );
      if (serviceCards.length < 2) {
        throw new Error("Movement cadence requires at least two service cards");
      }
      const processStats = required(
        '[data-section-family="process"] .mi-stats',
      );
      const ctaSection = required('[data-section-family="cta"] .mi-section');
      return {
        heroShadow: getComputedStyle(heroMedia).boxShadow,
        secondCardMarginTopPx: Number.parseFloat(
          getComputedStyle(serviceCards[1]!).marginTop,
        ),
        processPathContent: getComputedStyle(processStats, "::before").content,
        ctaMotifContent: getComputedStyle(ctaSection, "::after").content,
      };
    });
}

async function visibleImageAudit(page: Page): Promise<ImageAudit[]> {
  return page
    .locator("[data-mi-physiotherapy-draft] img")
    .evaluateAll((images) =>
      images.flatMap((image) => {
        const element = image as HTMLImageElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          rect.width === 0 ||
          rect.height === 0
        ) {
          return [];
        }
        return [
          {
            src: element.currentSrc,
            alt: element.alt,
            naturalWidth: element.naturalWidth,
            naturalHeight: element.naturalHeight,
          },
        ];
      }),
    );
}

async function responsiveAudit(page: Page): Promise<ResponsiveAudit> {
  return page.locator("[data-mi-physiotherapy-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const contentLeft = 0;
    const contentRight = documentRoot.clientWidth;
    const keyElements = [...root.querySelectorAll<HTMLElement>("*")].filter(
      isVisible,
    );

    const escapedElements = keyElements
      .filter((element) => !insideHorizontalScroller(element, root))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < contentLeft - 1 || rect.right > contentRight + 1;
      })
      .map(describeElement);

    const clippedText = keyElements
      .filter((element) =>
        ["H1", "H2", "H3", "P", "A", "BUTTON", "LABEL"].includes(
          element.tagName,
        ),
      )
      .filter((element) => !element.closest(".mi-form__honeypot"))
      .filter((element) => !insideHorizontalScroller(element, root))
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map(describeElement);

    const h1Elements = [...root.querySelectorAll<HTMLElement>("h1")].filter(
      isVisible,
    );
    const heading = h1Elements[0];
    if (!heading) throw new Error("The physiotherapy page is missing its H1");
    const headingStyle = getComputedStyle(heading);
    const fontSizePx = Number.parseFloat(headingStyle.fontSize);
    const lineHeightPx = Number.parseFloat(headingStyle.lineHeight);

    const hero = root.querySelector<HTMLElement>(
      '[data-section-family="hero"]',
    );
    const heroLayout = hero?.querySelector<HTMLElement>(".mi-section__layout");
    const heroCopy = heroLayout?.querySelector<HTMLElement>(
      ":scope > div:first-child",
    );
    const heroMedia = heroLayout?.querySelector<HTMLElement>(
      ":scope > .mi-section__media",
    );
    if (!heroLayout || !heroCopy || !heroMedia) {
      throw new Error("The physiotherapy page is missing its hero composition");
    }

    const controls = keyElements.filter((element) =>
      element.matches(
        ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a, .mi-section__form input:not([type=hidden]), .mi-section__form textarea, .mi-section__form select, .mi-section__form button",
      ),
    );
    const undersizedControls = controls
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 43.5 || rect.height < 43.5;
      })
      .map(describeElement);

    const navbar = root.querySelector<HTMLElement>(".mi-navbar");
    const navbarItems = navbar
      ? [
          navbar.querySelector<HTMLElement>(":scope > .mi-nav-menu"),
          navbar.querySelector<HTMLElement>(":scope > .mi-navbar__brand"),
          navbar.querySelector<HTMLElement>(":scope > .mi-section__action"),
        ].filter((element): element is HTMLElement =>
          Boolean(element && isVisible(element)),
        )
      : [];
    const navbarSiblingOverlaps: string[] = [];
    for (let leftIndex = 0; leftIndex < navbarItems.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < navbarItems.length;
        rightIndex += 1
      ) {
        const left = navbarItems[leftIndex]!;
        const right = navbarItems[rightIndex]!;
        const area = overlapArea(
          left.getBoundingClientRect(),
          right.getBoundingClientRect(),
        );
        if (area > 1) {
          navbarSiblingOverlaps.push(
            `${describeElement(left)} <> ${describeElement(right)} (${area}px²)`,
          );
        }
      }
    }

    return {
      documentOverflowPx: Math.max(
        0,
        documentRoot.scrollWidth - documentRoot.clientWidth,
        document.body.scrollWidth - document.body.clientWidth,
      ),
      escapedElements,
      clippedText,
      heroTrackCount: gridTrackCount(heroLayout),
      heroOverlapArea: overlapArea(
        heroCopy.getBoundingClientRect(),
        heroMedia.getBoundingClientRect(),
      ),
      h1: {
        count: h1Elements.length,
        text: heading.textContent?.trim().replace(/\s+/g, " ") ?? "",
        fontFamily: headingStyle.fontFamily,
        fontSizePx,
        fontWeight: Number.parseInt(headingStyle.fontWeight, 10),
        lineHeightRatio:
          Number.isFinite(lineHeightPx) && fontSizePx > 0
            ? lineHeightPx / fontSizePx
            : 0,
        lineCount:
          Number.isFinite(lineHeightPx) && lineHeightPx > 0
            ? Math.round(heading.getBoundingClientRect().height / lineHeightPx)
            : 0,
        textTransform: headingStyle.textTransform,
        wordBreak: headingStyle.wordBreak,
        overflowWrap: headingStyle.overflowWrap,
        clipped:
          ((headingStyle.overflowX === "hidden" ||
            headingStyle.overflowX === "clip") &&
            heading.scrollWidth > heading.clientWidth + 1) ||
          ((headingStyle.overflowY === "hidden" ||
            headingStyle.overflowY === "clip") &&
            heading.scrollHeight > heading.clientHeight + 1),
      },
      undersizedControls,
      navbarSiblingOverlaps,
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

    function insideHorizontalScroller(
      element: HTMLElement,
      boundary: HTMLElement,
    ) {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== boundary) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (overflow === "auto" || overflow === "scroll") return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    }

    function gridTrackCount(element: HTMLElement) {
      if (getComputedStyle(element).display !== "grid") return 0;
      const template = getComputedStyle(element).gridTemplateColumns.trim();
      if (!template || template === "none") return 0;
      return template.split(/\s+/).filter(Boolean).length;
    }

    function overlapArea(first: DOMRect, second: DOMRect) {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) - Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
      );
      return Math.round(width * height);
    }

    function describeElement(element: HTMLElement) {
      const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
      const family = element.closest<HTMLElement>("[data-section-family]")
        ?.dataset.sectionFamily;
      return `${family ?? "page"}:${element.tagName.toLowerCase()}${
        element.className
          ? `.${String(element.className).trim().replace(/\s+/g, ".")}`
          : ""
      }${text ? ` \"${text.slice(0, 48)}\"` : ""}`;
    }
  });
}
