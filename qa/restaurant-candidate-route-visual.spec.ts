import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { RESTAURANT_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";

const PREVIEW_ROOT = "/restaurant-draft";
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
const EXPECTED_IMAGE_COUNTS: Record<PagePath, number> = {
  "/": 6,
  "/menu": 3,
  "/visit": 3,
  "/reservations": 1,
  "/story": 2,
  "/contact": 1,
};
const INNER_PAGE_FAMILIES: Record<Exclude<PagePath, "/">, readonly string[]> = {
  "/menu": [
    "navbar",
    "hero",
    "services",
    "features",
    "gallery",
    "about",
    "cta",
    "footer",
  ],
  "/visit": [
    "navbar",
    "hero",
    "gallery",
    "contact",
    "features",
    "about",
    "cta",
    "footer",
  ],
  "/reservations": [
    "navbar",
    "hero",
    "contact",
    "process",
    "features",
    "about",
    "cta",
    "footer",
  ],
  "/story": [
    "navbar",
    "hero",
    "about",
    "gallery",
    "team",
    "features",
    "cta",
    "footer",
  ],
  "/contact": [
    "navbar",
    "hero",
    "contact",
    "features",
    "about",
    "cta",
    "footer",
  ],
};
const SELECTED_CANDIDATES = selectCandidates();
const SCREENSHOT_WIDTHS = screenshotWidths();
const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "qa-artifacts",
  "restaurant-candidate-route-matrix",
);

type PagePath = (typeof PAGE_PATHS)[number];

test.describe("Restaurant Top 20: all-route responsive matrix", () => {
  expect(
    SELECTED_CANDIDATES.length,
    "the requested Restaurant candidate matrix must not be empty",
  ).toBeGreaterThan(0);

  for (const candidate of SELECTED_CANDIDATES) {
    test(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} passes six routes at five widths`, async ({
      page,
    }) => {
      test.setTimeout(480_000);
      await mkdir(OUTPUT_DIRECTORY, { recursive: true });

      const siteImageSources = new Set<string>();
      const heroImageSources = new Set<string>();
      const supportingImageSources = new Set<string>();

      for (const pagePath of PAGE_PATHS) {
        const pageLabel = pagePath === "/" ? "home" : pagePath.slice(1);
        const route = previewRoute(pagePath, candidate.recipeId);
        const expectedFamilies =
          pagePath === "/"
            ? ["navbar", "hero", ...candidate.homeFlow, "footer"]
            : INNER_PAGE_FAMILIES[pagePath];

        for (const viewport of VIEWPORTS) {
          await test.step(`${pageLabel} at ${viewport.width}px`, async () => {
            await page.setViewportSize(viewport);
            const response = await page.goto(route, {
              waitUntil: "domcontentloaded",
            });
            expect(response?.ok(), `${route} must render`).toBeTruthy();
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
            await expect(site).toHaveAttribute(
              "data-mi-theme",
              candidate.theme.family,
            );
            await expect
              .soft(
                preview
                  .locator("[data-section-family]")
                  .evaluateAll((sections) =>
                    sections.map(
                      (section) =>
                        (section as HTMLElement).dataset.sectionFamily,
                    ),
                  ),
                `${candidate.id}/${pageLabel} must retain its researched anatomy`,
              )
              .resolves.toEqual(expectedFamilies);

            const visibleText = await preview.innerText();
            expect
              .soft(
                visibleText,
                `${candidate.id}/${pageLabel} must not leak clinic language`,
              )
              .not.toMatch(
                /\b(?:dental|dentist|tooth|teeth|root canal|physiotherapy|therapist|rehabilitation|appointment)\b/i,
              );
            expect
              .soft(
                visibleText,
                `${candidate.id}/${pageLabel} must not claim a confirmed table`,
              )
              .not.toMatch(
                /\b(?:book now|instant (?:booking|confirmation)|your table is confirmed|reservation (?:is|has been) confirmed)\b/i,
              );
            expect
              .soft(
                visibleText,
                `${candidate.id}/${pageLabel} must disclose illustrative imagery`,
              )
              .toMatch(/imagery is illustrative/i);

            await assertExactLogo(preview);
            await assertFormJourney(preview, pagePath);
            if (pagePath === "/menu") await assertMenu(preview);

            const audit = await responsiveAudit(page);
            const label = `${candidate.id}/${pageLabel}/${viewport.width}px`;
            expect.soft(audit.documentOverflowPx, label).toBeLessThanOrEqual(1);
            expect.soft(audit.escapedElements, label).toEqual([]);
            expect.soft(audit.clippedText, label).toEqual([]);
            expect.soft(audit.menuLayoutIssues, label).toEqual([]);
            expect.soft(audit.navbarSiblingOverlaps, label).toEqual([]);
            expect.soft(audit.heroTextProtected, label).toBe(true);
            expect.soft(audit.h1.count, label).toBe(1);
            expect.soft(audit.h1.text, label).not.toBe("");
            expect.soft(audit.h1.fontWeight, label).toBeGreaterThanOrEqual(500);
            expect.soft(audit.h1.fontWeight, label).toBeLessThanOrEqual(650);
            expect.soft(audit.h1.textTransform, label).toBe("none");
            expect.soft(audit.h1.wordBreak, label).toBe("normal");
            expect.soft(audit.h1.overflowWrap, label).toBe("normal");
            expect.soft(audit.h1.clipped, label).toBe(false);
            expect.soft(audit.h1.fontSizePx, label).toBeGreaterThanOrEqual(32);
            expect
              .soft(audit.h1.fontSizePx, label)
              .toBeLessThanOrEqual(viewport.width <= 390 ? 46 : 68);
            expect
              .soft(audit.h1.lineHeightRatio, label)
              .toBeGreaterThanOrEqual(1);
            expect
              .soft(audit.h1.lineHeightRatio, label)
              .toBeLessThanOrEqual(1.15);
            expect
              .soft(audit.h1.lineCount, label)
              .toBeLessThanOrEqual(viewport.width <= 390 ? 6 : 5);
            if (viewport.width <= 390) {
              expect.soft(audit.undersizedControls, label).toEqual([]);
            }

            if (SCREENSHOT_WIDTHS.has(viewport.width)) {
              await page.screenshot({
                path: path.join(
                  OUTPUT_DIRECTORY,
                  `${candidate.rankSeed.toString().padStart(2, "0")}-${candidate.recipeId}-${pageLabel}-${viewport.width}px-full.png`,
                ),
                animations: "disabled",
                fullPage: true,
              });
            }

            if (viewport.width === 1440) {
              const images = await visibleContentImageAudit(page);
              expect
                .soft(images.length, `${candidate.id}/${pageLabel} image count`)
                .toBe(EXPECTED_IMAGE_COUNTS[pagePath]);
              expect
                .soft(
                  new Set(images.map(({ src }) => src)).size,
                  `${candidate.id}/${pageLabel} must not repeat an image`,
                )
                .toBe(images.length);
              for (const image of images) {
                expect.soft(image.naturalWidth, image.src).toBeGreaterThan(0);
                expect.soft(image.naturalHeight, image.src).toBeGreaterThan(0);
                expect
                  .soft(image.alt.trim().length, image.src)
                  .toBeGreaterThan(20);
                siteImageSources.add(image.src);
              }

              const heroImages = await preview
                .locator(
                  '[data-section-family="hero"] img:not([data-mi-logo-asset-id])',
                )
                .evaluateAll((elements) =>
                  elements.map(
                    (element) => (element as HTMLImageElement).currentSrc,
                  ),
                );
              expect
                .soft(heroImages, `${candidate.id}/${pageLabel} hero`)
                .toHaveLength(1);
              const heroSource = heroImages[0];
              if (heroSource) {
                heroImageSources.add(heroSource);
                for (const image of images) {
                  if (image.src !== heroSource)
                    supportingImageSources.add(image.src);
                }
              }
            }
          });
        }
      }

      expect
        .soft(heroImageSources.size, `${candidate.id} distinct route heroes`)
        .toBe(PAGE_PATHS.length);
      expect
        .soft(siteImageSources.size, `${candidate.id} complete image pool`)
        .toBe(16);
      expect
        .soft(
          [...heroImageSources].filter((source) =>
            supportingImageSources.has(source),
          ),
          `${candidate.id} hero assets cannot become supporting media`,
        )
        .toEqual([]);
    });
  }
});

function selectCandidates() {
  const requested = process.env.MI_QA_RESTAURANT_CANDIDATES?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!requested?.length) return RESTAURANT_DRAFT_CANDIDATES;
  const requestedIds = new Set(requested);
  const selected = RESTAURANT_DRAFT_CANDIDATES.filter(
    ({ id, recipeId }) => requestedIds.has(id) || requestedIds.has(recipeId),
  );
  const matched = new Set(
    selected.flatMap(({ id, recipeId }) => [id, recipeId]),
  );
  const unknown = requested.filter((value) => !matched.has(value));
  if (unknown.length) {
    throw new Error(`Unknown Restaurant candidates: ${unknown.join(", ")}`);
  }
  return selected;
}

function screenshotWidths() {
  const configured = process.env.MI_QA_RESTAURANT_SCREENSHOT_WIDTHS?.trim();
  if (configured?.toLowerCase() === "none") return new Set<number>();
  const values = configured
    ? configured
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isFinite)
    : [320, 1440];
  const supported = new Set(VIEWPORTS.map(({ width }) => width));
  const unknown = values.filter((value) => !supported.has(value));
  if (unknown.length) {
    throw new Error(
      `Unsupported MI_QA_RESTAURANT_SCREENSHOT_WIDTHS values: ${unknown.join(", ")}`,
    );
  }
  return new Set(values);
}

function previewRoute(pagePath: PagePath, recipeId: string) {
  const pathname =
    pagePath === "/" ? PREVIEW_ROOT : `${PREVIEW_ROOT}${pagePath}`;
  return `${pathname}?candidate=${encodeURIComponent(recipeId)}`;
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

async function assertExactLogo(preview: ReturnType<Page["locator"]>) {
  const logos = preview.locator(
    `img[data-mi-logo-asset-id="${QA_LOGO_ASSET_ID}"]`,
  );
  await expect(logos).toHaveCount(2);
  const audit = await logos.evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return {
        src: image.currentSrc,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        objectFit: getComputedStyle(image).objectFit,
      };
    }),
  );
  expect.soft(new Set(audit.map(({ src }) => src)).size).toBe(1);
  for (const logo of audit) {
    expect.soft(logo.naturalWidth).toBe(560);
    expect.soft(logo.naturalHeight).toBe(120);
    expect.soft(logo.objectFit).toBe("contain");
  }
}

async function assertFormJourney(
  preview: ReturnType<Page["locator"]>,
  pagePath: PagePath,
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
    return;
  }
  await expect(forms).toHaveCount(0);
}

async function assertMenu(preview: ReturnType<Page["locator"]>) {
  const menu = preview.locator('[data-section-family="services"]');
  await expect(menu).toBeVisible();
  await expect(menu.locator(".mi-section__item-group")).toHaveCount(3);
  await expect(menu.locator(".mi-section__card")).toHaveCount(8);
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
}

async function visibleContentImageAudit(page: Page) {
  return page
    .locator("img:not([data-mi-logo-asset-id])")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((element) => {
          const image = element as HTMLImageElement;
          return {
            src: image.currentSrc,
            alt: image.alt,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          };
        }),
    );
}

async function responsiveAudit(page: Page) {
  return page.locator("[data-mi-restaurant-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const visible = [...root.querySelectorAll<HTMLElement>("*")].filter(
      (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      },
    );
    const visibleSet = new Set(visible);
    const describe = (element: HTMLElement) => {
      const family = element.closest<HTMLElement>("[data-section-family]")
        ?.dataset.sectionFamily;
      const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
      return `${family ?? "page"}:${element.tagName.toLowerCase()}.${String(element.className).trim().replace(/\s+/g, ".")}${text ? ` "${text.slice(0, 40)}"` : ""}`;
    };
    const insideHorizontalScroller = (element: HTMLElement) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== root) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (overflow === "auto" || overflow === "scroll") return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const escapedElements = visible
      .filter((element) => !insideHorizontalScroller(element))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > documentRoot.clientWidth + 1;
      })
      .map(describe);
    const clippedText = visible
      .filter((element) =>
        ["H1", "H2", "H3", "P", "A", "BUTTON", "LABEL"].includes(
          element.tagName,
        ),
      )
      .filter((element) => !element.closest(".mi-form__honeypot"))
      .filter((element) => !insideHorizontalScroller(element))
      .filter((element) => {
        const style = getComputedStyle(element);
        return (
          ((style.overflowX === "hidden" || style.overflowX === "clip") &&
            element.scrollWidth > element.clientWidth + 1) ||
          ((style.overflowY === "hidden" || style.overflowY === "clip") &&
            element.scrollHeight > element.clientHeight + 1)
        );
      })
      .map(describe);

    const h1s = visible.filter((element) => element.tagName === "H1");
    const h1 = h1s[0];
    if (!h1) throw new Error("Restaurant page is missing its H1");
    const h1Style = getComputedStyle(h1);
    const fontSizePx = Number.parseFloat(h1Style.fontSize);
    const lineHeightPx = Number.parseFloat(h1Style.lineHeight);
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
      throw new Error("Restaurant page is missing its hero composition");
    }
    const overlapArea = (first: DOMRect, second: DOMRect) => {
      const width = Math.max(
        0,
        Math.min(first.right, second.right) - Math.max(first.left, second.left),
      );
      const height = Math.max(
        0,
        Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
      );
      return Math.round(width * height);
    };
    const heroOverlapArea = overlapArea(
      heroCopy.getBoundingClientRect(),
      heroMedia.getBoundingClientRect(),
    );
    const heroCopyStyle = getComputedStyle(heroCopy);
    const copyHasSurface = ![
      "transparent",
      "rgba(0, 0, 0, 0)",
      "color(srgb 0 0 0 / 0)",
    ].includes(heroCopyStyle.backgroundColor);

    const controls = visible.filter((element) =>
      element.matches(
        ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a, .mi-section__form input:not([type=hidden]):not([type=checkbox]), .mi-section__form textarea, .mi-section__form select, .mi-section__form button",
      ),
    );
    const undersizedControls = controls
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 43.5 || rect.height < 43.5;
      })
      .map(describe);

    const navbarItems = [
      root.querySelector<HTMLElement>(".mi-navbar > .mi-nav-menu"),
      root.querySelector<HTMLElement>(".mi-navbar > .mi-navbar__brand"),
      root.querySelector<HTMLElement>(".mi-navbar > .mi-section__action"),
    ].filter((element): element is HTMLElement =>
      Boolean(element && visibleSet.has(element)),
    );
    const navbarSiblingOverlaps: string[] = [];
    for (let left = 0; left < navbarItems.length; left += 1) {
      for (let right = left + 1; right < navbarItems.length; right += 1) {
        const area = overlapArea(
          navbarItems[left]!.getBoundingClientRect(),
          navbarItems[right]!.getBoundingClientRect(),
        );
        if (area > 1) {
          navbarSiblingOverlaps.push(
            `${describe(navbarItems[left]!)} <> ${describe(navbarItems[right]!)}`,
          );
        }
      }
    }

    const menuLayoutIssues: string[] = [];
    for (const menuGroups of root.querySelectorAll<HTMLElement>(
      '[data-section-family="services"] .mi-section__item-groups',
    )) {
      const boundary = menuGroups.getBoundingClientRect();
      const textElements = [
        ...menuGroups.querySelectorAll<HTMLElement>(
          ".mi-section__item-group > .mi-type--h3, .mi-section__card > .mi-type--h3, .mi-section__card-meta, .mi-section__card > .mi-type--body-sm",
        ),
      ].filter((element) => visibleSet.has(element));
      for (const element of textElements) {
        const rect = element.getBoundingClientRect();
        if (rect.left < boundary.left - 1 || rect.right > boundary.right + 1) {
          menuLayoutIssues.push(`${describe(element)} escapes the menu track`);
        }
      }
      for (let left = 0; left < textElements.length; left += 1) {
        for (let right = left + 1; right < textElements.length; right += 1) {
          const first = textElements[left]!;
          const second = textElements[right]!;
          if (first.contains(second) || second.contains(first)) continue;
          if (
            overlapArea(
              first.getBoundingClientRect(),
              second.getBoundingClientRect(),
            ) > 2
          ) {
            menuLayoutIssues.push(
              `${describe(first)} overlaps ${describe(second)}`,
            );
          }
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
      menuLayoutIssues,
      undersizedControls,
      navbarSiblingOverlaps,
      heroTextProtected:
        heroOverlapArea === 0 ||
        (Number.parseInt(heroCopyStyle.zIndex, 10) >= 1 && copyHasSurface),
      h1: {
        count: h1s.length,
        text: h1.textContent?.trim().replace(/\s+/g, " ") ?? "",
        fontSizePx,
        fontWeight: Number.parseInt(h1Style.fontWeight, 10),
        lineHeightRatio:
          Number.isFinite(lineHeightPx) && fontSizePx > 0
            ? lineHeightPx / fontSizePx
            : 0,
        lineCount:
          Number.isFinite(lineHeightPx) && lineHeightPx > 0
            ? Math.round(h1.getBoundingClientRect().height / lineHeightPx)
            : 0,
        textTransform: h1Style.textTransform,
        wordBreak: h1Style.wordBreak,
        overflowWrap: h1Style.overflowWrap,
        clipped:
          ((h1Style.overflowX === "hidden" || h1Style.overflowX === "clip") &&
            h1.scrollWidth > h1.clientWidth + 1) ||
          ((h1Style.overflowY === "hidden" || h1Style.overflowY === "clip") &&
            h1.scrollHeight > h1.clientHeight + 1),
      },
    };
  });
}
