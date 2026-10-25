import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { RESTAURANT_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "qa-artifacts",
  "restaurant-top20-catalog",
);
const VIEWPORTS = [
  { width: 320, height: 800, label: "mobile-narrow", pageHeightCap: 7_600 },
  { width: 390, height: 844, label: "mobile", pageHeightCap: 7_300 },
  { width: 768, height: 1024, label: "tablet", pageHeightCap: 7_000 },
  { width: 1024, height: 768, label: "laptop", pageHeightCap: 6_800 },
  { width: 1440, height: 900, label: "desktop", pageHeightCap: 6_500 },
] as const;
const SCREENSHOT_WIDTHS = new Set([320, 768, 1440]);
const REQUIRED_INNER_ROUTES = [
  "/menu",
  "/visit",
  "/reservations",
  "/story",
  "/contact",
] as const;
const REQUESTED_CANDIDATES = new Set(
  (process.env.MI_QA_RESTAURANT_CANDIDATE ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const CANDIDATES = REQUESTED_CANDIDATES.size
  ? RESTAURANT_DRAFT_CANDIDATES.filter(
      (candidate) =>
        REQUESTED_CANDIDATES.has(candidate.id) ||
        REQUESTED_CANDIDATES.has(candidate.recipeId),
    )
  : RESTAURANT_DRAFT_CANDIDATES;

test.describe("Restaurant Top 20: rendered Home catalog", () => {
  test("renders 20 candidate-owned responsive compositions", async ({
    page,
  }) => {
    test.setTimeout(900_000);
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    const geometryFingerprints = new Map<string, string>();
    const mobileCompositionFingerprints = new Map<number, Set<string>>(
      VIEWPORTS.filter(({ width }) => width <= 390).map(({ width }) => [
        width,
        new Set<string>(),
      ]),
    );

    expect(CANDIDATES.length).toBeGreaterThan(0);
    for (const candidate of CANDIDATES) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const route = `/restaurant-draft?candidate=${encodeURIComponent(candidate.recipeId)}`;
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok(), `${candidate.id} must render`).toBeTruthy();
      await settlePage(page);

      const preview = page.locator(
        `[data-mi-restaurant-draft="${candidate.recipeId}"]`,
      );
      await expect(preview).toHaveAttribute(
        "data-mi-restaurant-candidate",
        candidate.recipeId,
      );
      const main = preview.locator("main[data-mi-site]");
      await expect(main).toHaveAttribute("data-mi-domain", "restaurant");
      await expect(main).toHaveAttribute("data-mi-subtype", "restaurant");
      await expect(main).toHaveAttribute("data-mi-candidate", candidate.id);
      await expect(main).toHaveAttribute(
        "data-mi-theme",
        candidate.theme.family,
      );

      const visibleText = await preview.innerText();
      expect(visibleText).not.toMatch(
        /\b(?:dental|dentist|orthodont|root canal|physio|physical therapy|patient|treatment|appointment)\b/i,
      );
      expect(visibleText).toMatch(/request a table/i);
      expect(visibleText).toMatch(/imagery is illustrative/i);

      const families = await preview
        .locator("[data-section-family]")
        .evaluateAll((sections) =>
          sections.map(
            (section) => (section as HTMLElement).dataset.sectionFamily,
          ),
        );
      expect(families).toEqual([
        "navbar",
        "hero",
        ...candidate.homeFlow,
        "footer",
      ]);

      const logo = preview.locator(
        'img[data-mi-logo-asset-id="qa-only/restaurant-supplied-logo-contract"]',
      );
      await expect(logo).toHaveCount(2);
      const contentImages = preview.locator("img:not([data-mi-logo-asset-id])");
      await expect(contentImages).toHaveCount(6);
      const images = await contentImages.evaluateAll((items) =>
        items.map((item) => {
          const image = item as HTMLImageElement;
          return {
            src: image.currentSrc,
            alt: image.alt,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
          };
        }),
      );
      expect(new Set(images.map(({ src }) => src)).size).toBe(6);
      for (const image of images) {
        expect(image.naturalWidth).toBeGreaterThan(0);
        expect(image.naturalHeight).toBeGreaterThan(0);
        expect(image.alt.trim().length).toBeGreaterThan(20);
      }
      await assertRequiredInnerRoutes(preview, candidate.recipeId);

      const responsiveFingerprints = new Map<number, string>();
      for (const viewport of VIEWPORTS) {
        await test.step(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} at ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          await stabilizeViewport(page);

          const audit = await responsiveAudit(page, candidate.recipeId);
          expect
            .soft(audit.documentOverflowPx, candidate.id)
            .toBeLessThanOrEqual(1);
          expect.soft(audit.escapedElements, candidate.id).toEqual([]);
          expect.soft(audit.clippedText, candidate.id).toEqual([]);
          expect
            .soft(
              audit.menuContainmentIssues,
              `${candidate.id} menu text containment at ${viewport.width}px`,
            )
            .toEqual([]);
          expect.soft(audit.h1.count, candidate.id).toBe(1);
          expect
            .soft(audit.h1.fontWeight, candidate.id)
            .toBeGreaterThanOrEqual(500);
          expect
            .soft(audit.h1.fontWeight, candidate.id)
            .toBeLessThanOrEqual(650);
          expect.soft(audit.h1.wordBreak, candidate.id).toBe("normal");
          expect.soft(audit.h1.overflowWrap, candidate.id).toBe("normal");
          expect.soft(audit.h1.textTransform, candidate.id).toBe("none");
          expect
            .soft(audit.h1.fontSizePx, candidate.id)
            .toBeGreaterThanOrEqual(32);
          expect.soft(audit.h1.lineCount, candidate.id).toBeLessThanOrEqual(6);
          expect
            .soft(
              audit.heroTextProtected,
              `${candidate.id} overlap=${audit.heroOverlapArea} z=${audit.heroCopyZIndex} background=${audit.heroCopyBackground}`,
            )
            .toBe(true);
          expect
            .soft(
              audit.readabilityIssues,
              `${candidate.id} typography/contrast at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              audit.logoIssues,
              `${candidate.id} supplied-logo sizing at ${viewport.width}px`,
            )
            .toEqual([]);
          expect
            .soft(
              audit.pageHeightPx,
              `${candidate.id} page height at ${viewport.width}px`,
            )
            .toBeLessThanOrEqual(viewport.pageHeightCap);
          expect
            .soft(
              audit.galleryHeightPx,
              `${candidate.id} gallery must remain bounded at ${viewport.width}px`,
            )
            .toBeLessThanOrEqual(1_800);

          if (candidate.id.endsWith("quiet-room")) {
            const quietRoomGalleryCap = Math.min(
              1_600,
              Math.max(900, viewport.width * 1.6),
            );
            expect
              .soft(
                audit.galleryHeightPx,
                `Quiet Room gallery height at ${viewport.width}px`,
              )
              .toBeLessThanOrEqual(quietRoomGalleryCap);
          }

          if (viewport.width <= 390) {
            expect
              .soft(audit.h1.fontSizePx, candidate.id)
              .toBeLessThanOrEqual(46);
            expect.soft(audit.undersizedControls, candidate.id).toEqual([]);
            expect.soft(audit.heroTrackCount, candidate.id).toBe(1);
          }

          const responsiveFingerprint =
            await responsiveCompositionFingerprint(page);
          responsiveFingerprints.set(viewport.width, responsiveFingerprint);
          mobileCompositionFingerprints
            .get(viewport.width)
            ?.add(responsiveFingerprint);

          if (viewport.width === 1440) {
            const fingerprint = await geometryFingerprint(page);
            const duplicate = geometryFingerprints.get(fingerprint);
            expect(
              duplicate,
              `${candidate.id} must not reuse the rendered geometry of ${duplicate}`,
            ).toBeUndefined();
            geometryFingerprints.set(fingerprint, candidate.id);
          }

          if (SCREENSHOT_WIDTHS.has(viewport.width)) {
            await page.screenshot({
              path: path.join(
                OUTPUT_DIRECTORY,
                `${candidate.rankSeed.toString().padStart(2, "0")}-${candidate.recipeId}-${viewport.label}.png`,
              ),
              fullPage: true,
              animations: "disabled",
            });
          }
        });
      }

      expect(
        responsiveFingerprints.get(320),
        `${candidate.id} must not flatten mobile and desktop into one composition`,
      ).not.toBe(responsiveFingerprints.get(1440));
    }

    expect(geometryFingerprints.size).toBe(CANDIDATES.length);
    if (
      REQUESTED_CANDIDATES.size === 0 &&
      CANDIDATES.length === RESTAURANT_DRAFT_CANDIDATES.length
    ) {
      for (const [width, fingerprints] of mobileCompositionFingerprints) {
        expect(
          fingerprints.size,
          `the catalog must retain at least three structural mobile compositions at ${width}px`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
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

async function stabilizeViewport(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            resolve();
          }),
        ),
      ),
  );
}

async function assertRequiredInnerRoutes(
  preview: ReturnType<Page["locator"]>,
  recipeId: string,
) {
  const links = await preview.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => {
      const target = new URL((anchor as HTMLAnchorElement).href);
      return {
        pathname: target.pathname,
        candidate: target.searchParams.get("candidate"),
      };
    }),
  );

  for (const route of REQUIRED_INNER_ROUTES) {
    expect(
      links.some(
        (link) =>
          link.pathname === `/restaurant-draft${route}` &&
          link.candidate === recipeId,
      ),
      `${recipeId} must retain a candidate-scoped link to ${route}`,
    ).toBe(true);
  }
}

async function geometryFingerprint(page: Page) {
  return page.locator("main[data-mi-candidate]").evaluate((root) => {
    const rootElement = root as HTMLElement;
    const rootRect = rootElement.getBoundingClientRect();
    const quantize = (value: number) => Math.round(value / 4) * 4;
    const tracks = (value: string) =>
      value
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((track) => {
          const numeric = Number.parseFloat(track);
          return Number.isFinite(numeric) ? quantize(numeric) : track;
        });
    const captureElement = (element: HTMLElement) => {
      const computed = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        box: [
          quantize(rect.left - rootRect.left),
          quantize(rect.top - rootRect.top),
          quantize(rect.width),
          quantize(rect.height),
        ],
        display: computed.display,
        columns: tracks(computed.gridTemplateColumns),
        rows: tracks(computed.gridTemplateRows),
        columnGap: quantize(Number.parseFloat(computed.columnGap) || 0),
        rowGap: quantize(Number.parseFloat(computed.rowGap) || 0),
        alignItems: computed.alignItems,
        justifyContent: computed.justifyContent,
        borderWidths: [
          computed.borderTopWidth,
          computed.borderRightWidth,
          computed.borderBottomWidth,
          computed.borderLeftWidth,
        ],
        borderRadius: computed.borderRadius,
        clipPath: computed.clipPath,
        aspectRatio: computed.aspectRatio,
        children: [...element.children]
          .filter((child): child is HTMLElement => child instanceof HTMLElement)
          .filter((child) => {
            const childRect = child.getBoundingClientRect();
            const childStyle = getComputedStyle(child);
            return (
              childStyle.display !== "none" &&
              childRect.width > 0 &&
              childRect.height > 0
            );
          })
          .map((child) => {
            const childRect = child.getBoundingClientRect();
            const childStyle = getComputedStyle(child);
            return {
              box: [
                quantize(childRect.left - rect.left),
                quantize(childRect.top - rect.top),
                quantize(childRect.width),
                quantize(childRect.height),
              ],
              column: `${childStyle.gridColumnStart}/${childStyle.gridColumnEnd}`,
              row: `${childStyle.gridRowStart}/${childStyle.gridRowEnd}`,
              order: childStyle.order,
            };
          }),
      };
    };
    const capture = (selector: string) => {
      const element = rootElement.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing fingerprint target ${selector}`);
      return captureElement(element);
    };
    const sections = [
      ...rootElement.querySelectorAll<HTMLElement>("[data-section-family]"),
    ].map((section) => ({
      family: section.dataset.sectionFamily,
      geometry: captureElement(section),
    }));
    return JSON.stringify({
      page: [quantize(rootRect.width), quantize(rootRect.height)],
      sections,
      navbar: capture('[data-section-family="navbar"] .mi-navbar'),
      heroLayout: capture('[data-section-family="hero"] .mi-section__layout'),
      heroMedia: capture('[data-section-family="hero"] .mi-section__media'),
      menuGroups: capture(
        '[data-section-family="services"] .mi-section__item-groups',
      ),
      gallery: capture('[data-section-family="gallery"] .mi-gallery'),
      contactLayout: capture(
        '[data-section-family="contact"] .mi-section__layout',
      ),
    });
  });
}

async function responsiveCompositionFingerprint(page: Page) {
  return page.locator("main[data-mi-candidate]").evaluate((root) => {
    const required = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element)
        throw new Error(`Missing responsive fingerprint target ${selector}`);
      return element;
    };
    const isVisible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const trackCount = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      if (style.display !== "grid") return 0;
      const template = style.gridTemplateColumns.trim();
      return template && template !== "none"
        ? template.split(/\s+/).filter(Boolean).length
        : 0;
    };
    const placement = (element: HTMLElement, parent: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const style = getComputedStyle(element);
      const ratio = (value: number, total: number) =>
        total > 0 ? Math.round((value / total) * 20) / 20 : 0;
      return {
        x: ratio(rect.left - parentRect.left, parentRect.width),
        y: ratio(rect.top - parentRect.top, parentRect.height),
        width: ratio(rect.width, parentRect.width),
        height: ratio(rect.height, parentRect.height),
        column: `${style.gridColumnStart}/${style.gridColumnEnd}`,
        row: `${style.gridRowStart}/${style.gridRowEnd}`,
        order: style.order,
      };
    };
    const layout = (selector: string) => {
      const element = required(selector);
      return {
        tracks: trackCount(element),
        children: [...element.children]
          .filter((child): child is HTMLElement => child instanceof HTMLElement)
          .filter(isVisible)
          .map((child) => placement(child, element)),
      };
    };
    const menuGrid = required(
      '[data-section-family="services"] .mi-section__item-group .mi-section__grid',
    );
    return JSON.stringify({
      navToggle: isVisible(required(".mi-nav-menu__toggle")),
      hero: layout('[data-section-family="hero"] .mi-section__layout'),
      menuTracks: trackCount(menuGrid),
      gallery: layout('[data-section-family="gallery"] .mi-gallery'),
      contact: layout('[data-section-family="contact"] .mi-section__layout'),
    });
  });
}

async function responsiveAudit(page: Page, recipeId: string) {
  return page
    .locator(`[data-mi-restaurant-draft="${recipeId}"]`)
    .evaluate((preview) => {
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
      const describe = (element: HTMLElement) =>
        `${element.closest<HTMLElement>("[data-section-family]")?.dataset.sectionFamily ?? "page"}:${element.tagName.toLowerCase()}.${String(element.className).replace(/\s+/g, ".")}`;
      const escapedElements = visible
        .filter((element) => !insideClippingContext(element))
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
        .filter((element) => {
          const overflowX = getComputedStyle(element).overflowX;
          return (
            (overflowX === "hidden" || overflowX === "clip") &&
            element.scrollWidth > element.clientWidth + 1
          );
        })
        .map(describe);
      const h1s = visible.filter((element) => element.tagName === "H1");
      const h1 = h1s[0];
      if (!h1) throw new Error("Candidate is missing its H1");
      const h1Style = getComputedStyle(h1);
      const fontSizePx = Number.parseFloat(h1Style.fontSize);
      const lineHeightPx = Number.parseFloat(h1Style.lineHeight);
      const heroLayout = root.querySelector<HTMLElement>(
        '[data-section-family="hero"] .mi-section__layout',
      );
      const heroCopy = root.querySelector<HTMLElement>(
        '[data-section-family="hero"] .mi-section__layout > div:first-child',
      );
      const heroMedia = root.querySelector<HTMLElement>(
        '[data-section-family="hero"] .mi-section__media',
      );
      if (!heroLayout || !heroCopy || !heroMedia) {
        throw new Error("Candidate hero is incomplete");
      }
      const controls = visible.filter((element) =>
        element.matches(
          ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a",
        ),
      );
      const heroOverlapArea = overlapArea(
        heroCopy.getBoundingClientRect(),
        heroMedia.getBoundingClientRect(),
      );
      const copyStyle = getComputedStyle(heroCopy);
      const copyHasSurface = ![
        "transparent",
        "rgba(0, 0, 0, 0)",
        "color(srgb 0 0 0 / 0)",
      ].includes(copyStyle.backgroundColor);
      const main = root.querySelector<HTMLElement>("main[data-mi-site]");
      const gallery = root.querySelector<HTMLElement>(
        '[data-section-family="gallery"] .mi-gallery',
      );
      if (!main || !gallery) {
        throw new Error("Candidate is missing its page or gallery canvas");
      }

      const readabilityIssues: string[] = [];
      auditReadableText(".mi-type--body, .mi-type--body-sm", "body", 15, 1.4);
      auditReadableText(
        '[data-section-family="services"] .mi-section__card > .mi-type--h3, [data-section-family="services"] .mi-section__item-group > .mi-type--h3',
        "menu-title",
        17,
        0,
      );
      auditReadableText(
        '[data-section-family="services"] .mi-section__card-meta',
        "menu-price",
        15,
        0,
      );

      const menuGroups = root.querySelector<HTMLElement>(
        '[data-section-family="services"] .mi-section__item-groups',
      );
      if (!menuGroups) throw new Error("Candidate is missing its menu groups");
      const menuGroupsRect = menuGroups.getBoundingClientRect();
      const menuContainmentIssues = [
        ...menuGroups.querySelectorAll<HTMLElement>(
          ".mi-section__item-group > .mi-type--h3, .mi-section__card > .mi-type--h3, .mi-section__card-meta, .mi-section__card > .mi-type--body-sm",
        ),
      ]
        .filter((element) => visibleSet.has(element))
        .flatMap((element) => {
          const rect = element.getBoundingClientRect();
          const issues: string[] = [];
          if (rect.left < menuGroupsRect.left - 1) {
            issues.push(
              `${describe(element)} escapes the menu by ${Math.ceil(menuGroupsRect.left - rect.left)}px on the left`,
            );
          }
          if (rect.right > menuGroupsRect.right + 1) {
            issues.push(
              `${describe(element)} escapes the menu by ${Math.ceil(rect.right - menuGroupsRect.right)}px on the right`,
            );
          }
          return issues;
        });

      const logoIssues = [
        ...root.querySelectorAll<HTMLImageElement>(
          'img[data-mi-logo-asset-id="qa-only/restaurant-supplied-logo-contract"]',
        ),
      ].flatMap((logo) => {
        const family = logo.closest<HTMLElement>("[data-section-family]")
          ?.dataset.sectionFamily;
        const rect = logo.getBoundingClientRect();
        const isNavbar = family === "navbar";
        const minWidth = isNavbar
          ? documentRoot.clientWidth <= 390
            ? 96
            : 120
          : 140;
        const minHeight = isNavbar
          ? documentRoot.clientWidth <= 390
            ? 20
            : 25
          : 30;
        const naturalRatio = logo.naturalWidth / logo.naturalHeight;
        const paintedWidth = Math.min(rect.width, rect.height * naturalRatio);
        const paintedHeight = paintedWidth / naturalRatio;
        const issues: string[] = [];
        if (paintedWidth < minWidth - 0.5 || paintedHeight < minHeight - 0.5) {
          issues.push(
            `${family ?? "unknown"}: painted mark is ${Math.round(paintedWidth)}x${Math.round(paintedHeight)}px inside a ${Math.round(rect.width)}x${Math.round(rect.height)}px box; minimum ${minWidth}x${minHeight}px`,
          );
        }
        if (getComputedStyle(logo).objectFit !== "contain") {
          issues.push(
            `${family ?? "unknown"}: logo must use object-fit contain`,
          );
        }
        return issues;
      });

      return {
        documentOverflowPx: Math.max(
          0,
          documentRoot.scrollWidth - documentRoot.clientWidth,
          document.body.scrollWidth - document.body.clientWidth,
        ),
        escapedElements,
        clippedText,
        undersizedControls: controls
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width < 43.5 || rect.height < 43.5;
          })
          .map(describe),
        heroTrackCount:
          getComputedStyle(heroLayout).gridTemplateColumns.split(/\s+/).length,
        heroOverlapArea,
        heroCopyZIndex: copyStyle.zIndex,
        heroCopyBackground: copyStyle.backgroundColor,
        heroTextProtected:
          heroOverlapArea === 0 ||
          (Number.parseInt(copyStyle.zIndex, 10) >= 1 && copyHasSurface),
        pageHeightPx: Math.ceil(
          Math.max(
            main.getBoundingClientRect().height,
            main.scrollHeight,
            documentRoot.scrollHeight,
          ),
        ),
        galleryHeightPx: Math.ceil(gallery.getBoundingClientRect().height),
        readabilityIssues,
        menuContainmentIssues,
        logoIssues,
        h1: {
          count: h1s.length,
          fontSizePx,
          fontWeight: Number.parseInt(h1Style.fontWeight, 10),
          lineCount:
            Number.isFinite(lineHeightPx) && lineHeightPx > 0
              ? Math.round(h1.getBoundingClientRect().height / lineHeightPx)
              : 0,
          textTransform: h1Style.textTransform,
          wordBreak: h1Style.wordBreak,
          overflowWrap: h1Style.overflowWrap,
        },
      };

      function auditReadableText(
        selector: string,
        label: string,
        minimumFontSize: number,
        minimumLineHeightRatio: number,
      ) {
        for (const element of root.querySelectorAll<HTMLElement>(selector)) {
          if (!visibleSet.has(element)) continue;
          const style = getComputedStyle(element);
          const size = Number.parseFloat(style.fontSize);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const lineHeightRatio =
            Number.isFinite(lineHeight) && size > 0 ? lineHeight / size : 0;
          const contrast = textContrastRatio(element);
          const name = `${label}:${describe(element)} \"${(
            element.textContent ?? ""
          )
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 40)}\"`;
          if (size < minimumFontSize) {
            readabilityIssues.push(
              `${name} is ${size.toFixed(1)}px; minimum ${minimumFontSize}px`,
            );
          }
          if (
            minimumLineHeightRatio > 0 &&
            lineHeightRatio > 0 &&
            lineHeightRatio < minimumLineHeightRatio
          ) {
            readabilityIssues.push(
              `${name} line-height is ${lineHeightRatio.toFixed(2)}; minimum ${minimumLineHeightRatio.toFixed(2)}`,
            );
          }
          if (contrast !== null && contrast < 4.5) {
            readabilityIssues.push(
              `${name} contrast is ${contrast.toFixed(2)}:1; minimum 4.5:1`,
            );
          }
        }
      }

      function textContrastRatio(element: HTMLElement) {
        const foreground = parseCssColor(getComputedStyle(element).color);
        if (!foreground) return null;
        const layers: Rgba[] = [];
        let ancestor: HTMLElement | null = element;
        while (ancestor) {
          const background = parseCssColor(
            getComputedStyle(ancestor).backgroundColor,
          );
          if (background && background.alpha > 0) {
            layers.push(background);
            if (background.alpha >= 0.999) break;
          }
          ancestor = ancestor.parentElement;
        }
        let background: Rgba = {
          red: 255,
          green: 255,
          blue: 255,
          alpha: 1,
        };
        for (let index = layers.length - 1; index >= 0; index -= 1) {
          background = composite(layers[index]!, background);
        }
        const renderedForeground = composite(foreground, background);
        const light = Math.max(
          relativeLuminance(renderedForeground),
          relativeLuminance(background),
        );
        const dark = Math.min(
          relativeLuminance(renderedForeground),
          relativeLuminance(background),
        );
        return (light + 0.05) / (dark + 0.05);
      }

      type Rgba = {
        red: number;
        green: number;
        blue: number;
        alpha: number;
      };

      function parseCssColor(value: string): Rgba | null {
        const normalized = value.trim().toLowerCase();
        if (normalized === "transparent") {
          return { red: 0, green: 0, blue: 0, alpha: 0 };
        }
        const srgb = normalized.match(
          /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
        );
        if (srgb) {
          return {
            red: Number(srgb[1]) * 255,
            green: Number(srgb[2]) * 255,
            blue: Number(srgb[3]) * 255,
            alpha: srgb[4] === undefined ? 1 : Number(srgb[4]),
          };
        }
        const rgb = normalized.match(/^rgba?\((.+)\)$/);
        if (!rgb) return null;
        const [channels, alphaValue] = rgb[1]!
          .split("/")
          .map((part) => part.trim());
        const values = channels!
          .replace(/,/g, " ")
          .split(/\s+/)
          .filter(Boolean);
        if (values.length < 3) return null;
        const channel = (entry: string) =>
          entry.endsWith("%")
            ? (Number.parseFloat(entry) / 100) * 255
            : Number.parseFloat(entry);
        const legacyAlpha = values[3];
        const alpha = alphaValue ?? legacyAlpha;
        return {
          red: channel(values[0]!),
          green: channel(values[1]!),
          blue: channel(values[2]!),
          alpha: alpha
            ? alpha.endsWith("%")
              ? Number.parseFloat(alpha) / 100
              : Number.parseFloat(alpha)
            : 1,
        };
      }

      function composite(foreground: Rgba, background: Rgba): Rgba {
        const alpha =
          foreground.alpha + background.alpha * (1 - foreground.alpha);
        if (alpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
        return {
          red:
            (foreground.red * foreground.alpha +
              background.red * background.alpha * (1 - foreground.alpha)) /
            alpha,
          green:
            (foreground.green * foreground.alpha +
              background.green * background.alpha * (1 - foreground.alpha)) /
            alpha,
          blue:
            (foreground.blue * foreground.alpha +
              background.blue * background.alpha * (1 - foreground.alpha)) /
            alpha,
          alpha,
        };
      }

      function relativeLuminance(color: Rgba) {
        const linear = (channel: number) => {
          const value = channel / 255;
          return value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * linear(color.red) +
          0.7152 * linear(color.green) +
          0.0722 * linear(color.blue)
        );
      }

      function overlapArea(first: DOMRect, second: DOMRect) {
        return Math.round(
          Math.max(
            0,
            Math.min(first.right, second.right) -
              Math.max(first.left, second.left),
          ) *
            Math.max(
              0,
              Math.min(first.bottom, second.bottom) -
                Math.max(first.top, second.top),
            ),
        );
      }

      function insideClippingContext(element: HTMLElement) {
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== root) {
          const overflow = getComputedStyle(ancestor).overflowX;
          if (overflow === "hidden" || overflow === "clip") return true;
          ancestor = ancestor.parentElement;
        }
        return false;
      }
    });
}
