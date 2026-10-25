import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const PREVIEW_ROOT = "/restaurant-draft";
const RESTAURANT_DRAFT_IDENTITY = "table-story-editorial";
const QA_LOGO_ASSET_ID = "qa-only/restaurant-supplied-logo-contract";
const PAGE_PATHS = [
  "/",
  "/menu",
  "/visit",
  "/reservations",
  "/story",
  "/contact",
] as const;
const VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;
const EXPECTED_IMAGE_COUNTS: Record<(typeof PAGE_PATHS)[number], number> = {
  "/": 6,
  "/menu": 3,
  "/visit": 3,
  "/reservations": 1,
  "/story": 2,
  "/contact": 1,
};
const SCREENSHOT_WIDTHS = new Set([320, 390, 1440]);
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "restaurant-draft-visual-spec",
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
    clipped: boolean;
  };
  undersizedControls: string[];
  navbarSiblingOverlaps: string[];
};

test.describe("Restaurant draft: rendered responsive visual gate", () => {
  test("all six routes meet the Restaurant identity, journey, media, and responsive contract", async ({
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
            `[data-mi-restaurant-draft="${RESTAURANT_DRAFT_IDENTITY}"]`,
          );
          await expect(preview).toBeVisible();
          await expect(preview).toHaveAttribute(
            "data-mi-restaurant-path",
            pagePath,
          );

          const site = preview.locator("main[data-mi-site]");
          await expect(site).toHaveAttribute("data-mi-domain", "restaurant");
          await expect(site).toHaveAttribute("data-mi-subtype", "restaurant");
          await expect(site).toHaveAttribute("data-mi-theme", "editorial");
          await expect(site).not.toHaveAttribute("data-mi-domain", "clinic");
          await settlePage(page);

          const visibleText = await preview.innerText();
          expect
            .soft(visibleText, `${pageLabel} must not leak clinic language`)
            .not.toMatch(
              /\b(?:dental|dentist|tooth|teeth|root canal|physiotherapy|therapist|rehabilitation)\b/i,
            );
          expect
            .soft(
              visibleText,
              `${pageLabel} must describe a request rather than a confirmed table`,
            )
            .not.toMatch(
              /\b(?:book now|instant (?:booking|confirmation)|your table is confirmed|reservation (?:is|has been) confirmed)\b/i,
            );
          expect
            .soft(
              visibleText,
              `${pageLabel} must disclose illustrative preview imagery`,
            )
            .toMatch(/imagery is illustrative/i);

          await assertExactLogo(preview);
          await assertFormJourney(preview, pagePath);
          if (pagePath === "/menu") await assertMenu(preview);

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
            .soft(
              audit.undersizedControls,
              `${pageLabel} has primary controls below 44px at ${viewport.width}px`,
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
              `${pageLabel} hero must reflow at ${viewport.width}px`,
            )
            .toBe(viewport.width < 768 ? 1 : 2);
          expect
            .soft(
              audit.heroOverlapArea,
              `${pageLabel} hero copy and media must not overlap`,
            )
            .toBe(0);

          expect
            .soft(audit.h1.count, `${pageLabel} must render one H1`)
            .toBe(1);
          expect
            .soft(audit.h1.text, `${pageLabel} H1 must be populated`)
            .not.toBe("");
          expect
            .soft(
              audit.h1.fontFamily.toLowerCase(),
              `${pageLabel} must use the Restaurant editorial display family`,
            )
            .toContain("source serif 4");
          expect
            .soft(
              audit.h1.fontWeight,
              `${pageLabel} H1 must avoid the earlier ultra-bold treatment`,
            )
            .toBeGreaterThanOrEqual(500);
          expect
            .soft(
              audit.h1.fontWeight,
              `${pageLabel} H1 must avoid the earlier ultra-bold treatment`,
            )
            .toBeLessThanOrEqual(650);
          expect.soft(audit.h1.textTransform).toBe("none");
          expect.soft(audit.h1.wordBreak).toBe("normal");
          expect
            .soft(audit.h1.clipped, `${pageLabel} H1 must not clip`)
            .toBe(false);
          expect.soft(audit.h1.fontSizePx).toBeGreaterThanOrEqual(32);
          expect
            .soft(
              audit.h1.fontSizePx,
              `${pageLabel} H1 must not become billboard-sized`,
            )
            .toBeLessThanOrEqual(viewport.width <= 390 ? 46 : 68);
          expect.soft(audit.h1.lineHeightRatio).toBeGreaterThanOrEqual(1);
          expect.soft(audit.h1.lineHeightRatio).toBeLessThanOrEqual(1.15);
          expect
            .soft(
              audit.h1.lineCount,
              `${pageLabel} H1 must not fragment into an unreadable stack`,
            )
            .toBeLessThanOrEqual(viewport.width <= 390 ? 5 : 4);

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
            const images = await visibleContentImageAudit(page);
            expect
              .soft(
                images.length,
                `${pageLabel} must render its assigned meaningful image count`,
              )
              .toBe(EXPECTED_IMAGE_COUNTS[pagePath]);
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
              .evaluateAll((elements) =>
                elements.map(
                  (element) => (element as HTMLImageElement).currentSrc,
                ),
              );
            expect
              .soft(heroImages, `${pageLabel} must render one hero image`)
              .toHaveLength(1);
            const heroSource = heroImages[0];
            if (heroSource) {
              heroImageSources.add(heroSource);
              for (const image of images) {
                if (image.src !== heroSource)
                  supportingImageSources.add(image.src);
              }
            }

            if (pagePath === "/") {
              const grammar = await restaurantVisualGrammarAudit(page);
              expect(grammar.navbarBorderStyle).toBe("double");
              expect(grammar.heroBorderRadiusPx).toBe(0);
              expect(grammar.heroShadow).toBe("none");
              expect(grammar.menuCardBorderRadiusPx).toBe(0);
              expect(grammar.galleryTrackCount).toBe(2);
            }
          }
        });
      }
    }

    expect
      .soft(
        heroImageSources.size,
        "all six Restaurant routes must use distinct hero images",
      )
      .toBe(PAGE_PATHS.length);
    expect
      .soft(
        siteImageSources.size,
        "the reference must render a distinct 16-image Restaurant route selection",
      )
      .toBe(16);
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

async function assertExactLogo(preview: ReturnType<Page["locator"]>) {
  const logos = preview.locator(
    `img[data-mi-logo-asset-id="${QA_LOGO_ASSET_ID}"]`,
  );
  await expect(
    logos,
    "the exact supplied logo must appear in header and footer",
  ).toHaveCount(2);
  await expect(logos.first()).toBeVisible();
  await expect(logos.last()).toBeVisible();
  const audit = await logos.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return {
        src: image.currentSrc,
        alt: image.alt,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
      };
    }),
  );
  expect.soft(new Set(audit.map(({ src }) => src)).size).toBe(1);
  for (const logo of audit) {
    expect.soft(logo.alt).toBe("Aarunya Table supplied logo QA fixture");
    expect.soft(logo.naturalWidth).toBe(560);
    expect.soft(logo.naturalHeight).toBe(120);
    expect.soft(logo.objectFit).toBe("contain");
  }
}

async function assertFormJourney(
  preview: ReturnType<Page["locator"]>,
  pagePath: (typeof PAGE_PATHS)[number],
) {
  const forms = preview.locator("form.mi-section__form");
  const reservationForms = preview.locator(
    'form.mi-section__form[action*="reservation.request"]',
  );
  const enquiryForms = preview.locator(
    'form.mi-section__form[action*="lead.create"]',
  );

  if (pagePath === "/reservations") {
    await expect(forms).toHaveCount(1);
    await expect(reservationForms).toHaveCount(1);
    await expect(enquiryForms).toHaveCount(0);
    const form = reservationForms.first();
    await expect(
      form.getByLabel("Requested date", { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByLabel("Requested time", { exact: true }),
    ).toBeVisible();
    await expect(form.getByLabel("Party size", { exact: true })).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Request a table", exact: true }),
    ).toBeVisible();
    await expect(
      preview.getByText(/does not confirm a reservation/i).first(),
    ).toBeVisible();
    return;
  }

  if (pagePath === "/contact") {
    await expect(forms).toHaveCount(1);
    await expect(reservationForms).toHaveCount(0);
    await expect(enquiryForms).toHaveCount(1);
    const form = enquiryForms.first();
    await expect(form.getByLabel("Name", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Email", { exact: true })).toBeVisible();
    await expect(form.getByLabel("Message", { exact: true })).toBeVisible();
    await expect(
      form.getByRole("button", { name: "Send enquiry", exact: true }),
    ).toBeVisible();
    await expect(preview.getByText(/general enquiry/i).first()).toBeVisible();
    return;
  }

  await expect(forms).toHaveCount(0);
  await expect(reservationForms).toHaveCount(0);
  await expect(enquiryForms).toHaveCount(0);
}

async function assertMenu(preview: ReturnType<Page["locator"]>) {
  const menu = preview.locator('[data-section-family="services"]');
  await expect(menu).toBeVisible();
  const categories = menu.locator(".mi-section__item-group > .mi-type--h3");
  await expect(categories).toHaveCount(3);
  expect(await categories.allInnerTexts()).toEqual([
    "Small plates",
    "From the kitchen",
    "Dessert",
  ]);

  const prices = menu.locator(".mi-section__card-meta");
  await expect(prices).toHaveCount(8);
  expect(await prices.allInnerTexts()).toEqual([
    "INR 340",
    "INR 310",
    "INR 290",
    "INR 460",
    "INR 440",
    "INR 560",
    "INR 250",
    "INR 270",
  ]);
  for (const price of await prices.all()) await expect(price).toBeVisible();

  const overlaps = await menu
    .locator(".mi-section__card")
    .evaluateAll((cards) =>
      cards.flatMap((card, index) => {
        const title = card.querySelector<HTMLElement>("h3");
        const price = card.querySelector<HTMLElement>(".mi-section__card-meta");
        if (!title || !price)
          return [`card-${index + 1}:missing-title-or-price`];
        const titleRect = title.getBoundingClientRect();
        const priceRect = price.getBoundingClientRect();
        const overlapWidth = Math.max(
          0,
          Math.min(titleRect.right, priceRect.right) -
            Math.max(titleRect.left, priceRect.left),
        );
        const overlapHeight = Math.max(
          0,
          Math.min(titleRect.bottom, priceRect.bottom) -
            Math.max(titleRect.top, priceRect.top),
        );
        return Math.round(overlapWidth * overlapHeight) > 1
          ? [`card-${index + 1}:title-price-overlap`]
          : [];
      }),
    );
  expect
    .soft(
      overlaps,
      "menu names and prices must remain associated without collision",
    )
    .toEqual([]);
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

async function visibleContentImageAudit(page: Page): Promise<ImageAudit[]> {
  return page
    .locator("[data-mi-restaurant-draft] img:not([data-mi-logo-asset-id])")
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

async function restaurantVisualGrammarAudit(page: Page) {
  return page.locator('main[data-mi-subtype="restaurant"]').evaluate((root) => {
    const required = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element)
        throw new Error(`Missing Restaurant visual target ${selector}`);
      return element;
    };
    const navbar = required('[data-section-family="navbar"] .mi-navbar');
    const heroMedia = required(
      '[data-section-family="hero"] .mi-section__media',
    );
    const menuCard = required(
      '[data-section-family="services"] .mi-section__card',
    );
    const gallery = required('[data-section-family="gallery"] .mi-gallery');
    const galleryTemplate =
      getComputedStyle(gallery).gridTemplateColumns.trim();
    return {
      navbarBorderStyle: getComputedStyle(navbar).borderBottomStyle,
      heroBorderRadiusPx: Number.parseFloat(
        getComputedStyle(heroMedia).borderRadius,
      ),
      heroShadow: getComputedStyle(heroMedia).boxShadow,
      menuCardBorderRadiusPx: Number.parseFloat(
        getComputedStyle(menuCard).borderRadius,
      ),
      galleryTrackCount:
        getComputedStyle(gallery).display === "grid" &&
        galleryTemplate &&
        galleryTemplate !== "none"
          ? galleryTemplate.split(/\s+/).filter(Boolean).length
          : 0,
    };
  });
}

async function responsiveAudit(page: Page): Promise<ResponsiveAudit> {
  return page.locator("[data-mi-restaurant-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const keyElements = [...root.querySelectorAll<HTMLElement>("*")].filter(
      isVisible,
    );

    const escapedElements = keyElements
      .filter((element) => !insideHorizontalScroller(element, root))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > documentRoot.clientWidth + 1;
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
    if (!heading) throw new Error("The Restaurant page is missing its H1");
    const headingStyle = getComputedStyle(heading);
    const fontSizePx = Number.parseFloat(headingStyle.fontSize);
    const lineHeightPx = Number.parseFloat(headingStyle.lineHeight);

    const heroLayout = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__layout',
    );
    const heroCopy = heroLayout?.querySelector<HTMLElement>(
      ":scope > div:first-child",
    );
    const heroMedia = heroLayout?.querySelector<HTMLElement>(
      ":scope > .mi-section__media",
    );
    if (!heroLayout || !heroCopy || !heroMedia) {
      throw new Error("The Restaurant page is missing its hero composition");
    }

    const controls = keyElements.filter((element) =>
      element.matches(
        ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a, .mi-section__form input:not([type=hidden]):not([type=checkbox]), .mi-section__form textarea, .mi-section__form select, .mi-section__form button",
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

    function gridTrackCount(element: Element) {
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
  });
}
