import { expect, type Page } from "@playwright/test";

export const PHYSIOTHERAPY_PREVIEW_ROOT = "/physiotherapy-draft";

export const PHYSIOTHERAPY_PAGE_PATHS = [
  "/",
  "/therapies",
  "/conditions",
  "/therapists",
  "/about",
  "/contact",
] as const;

export const PHYSIOTHERAPY_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

export type PhysiotherapyPagePath = (typeof PHYSIOTHERAPY_PAGE_PATHS)[number];
export type PhysiotherapyViewport = (typeof PHYSIOTHERAPY_VIEWPORTS)[number];

export type PhysiotherapyImageAudit = {
  src: string;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
};

export type PhysiotherapyStateEvidence = {
  images: PhysiotherapyImageAudit[];
  heroSource?: string;
  supportingSources: string[];
};

export const PHYSIOTHERAPY_INNER_PAGE_FAMILIES = {
  "/therapies": [
    "navbar",
    "hero",
    "services",
    "process",
    "about",
    "cta",
    "footer",
  ],
  "/conditions": [
    "navbar",
    "hero",
    "services",
    "about",
    "features",
    "cta",
    "footer",
  ],
  "/therapists": ["navbar", "hero", "features", "about", "cta", "footer"],
  "/about": ["navbar", "hero", "about", "features", "contact", "footer"],
} as const;

export function physiotherapyPageLabel(pagePath: PhysiotherapyPagePath) {
  return pagePath === "/" ? "home" : pagePath.slice(1);
}

export function physiotherapyPreviewRoute(
  pagePath: PhysiotherapyPagePath,
  query: Record<string, string | undefined>,
) {
  const pathname =
    pagePath === "/"
      ? PHYSIOTHERAPY_PREVIEW_ROOT
      : `${PHYSIOTHERAPY_PREVIEW_ROOT}${pagePath}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) search.set(key, value);
  }
  const encoded = search.toString();
  return encoded ? `${pathname}?${encoded}` : pathname;
}

export function expectedPhysiotherapyFamilies({
  pagePath,
  homeFlow,
  hasPracticalFacts,
}: {
  pagePath: PhysiotherapyPagePath;
  homeFlow: readonly string[];
  hasPracticalFacts: boolean;
}) {
  if (pagePath === "/") {
    return ["navbar", "hero", ...homeFlow, "footer"];
  }
  if (pagePath === "/contact") {
    return hasPracticalFacts
      ? ["navbar", "hero", "contact", "features", "about", "cta", "footer"]
      : ["navbar", "hero", "contact", "about", "cta", "footer"];
  }
  return [...PHYSIOTHERAPY_INNER_PAGE_FAMILIES[pagePath]];
}

export async function assertPhysiotherapyVisualState({
  page,
  route,
  pagePath,
  viewport,
  label,
  briefId,
  candidateRecipeId,
  candidateId,
  businessName,
  expectedFamilies,
  expectedTheme,
  screenshotPath,
}: {
  page: Page;
  route: string;
  pagePath: PhysiotherapyPagePath;
  viewport: PhysiotherapyViewport;
  label: string;
  briefId: string;
  candidateRecipeId: string;
  candidateId: string;
  businessName: string;
  expectedFamilies: readonly string[];
  expectedTheme?: string;
  screenshotPath?: string;
}): Promise<PhysiotherapyStateEvidence> {
  await page.setViewportSize(viewport);
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${label} must render`).toBeTruthy();

  const preview = page.locator(
    '[data-mi-physiotherapy-draft="calm-clinical-movement"]',
  );
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-mi-physiotherapy-brief", briefId);
  await expect(preview).toHaveAttribute(
    "data-mi-physiotherapy-candidate",
    candidateRecipeId,
  );
  await expect(preview).toHaveAttribute("data-mi-physiotherapy-path", pagePath);

  const main = preview.locator("main[data-mi-site]");
  await expect(main).toHaveAttribute("data-mi-domain", "clinic");
  await expect(main).toHaveAttribute("data-mi-subtype", "physiotherapy");
  await expect(main).toHaveAttribute("data-mi-candidate", candidateId);
  if (expectedTheme) {
    await expect(main).toHaveAttribute("data-mi-theme", expectedTheme);
  }
  await settlePhysiotherapyPage(page);

  const visibleText = await preview.innerText();
  expect
    .soft(visibleText, `${label} must retain the selected brief identity`)
    .toContain(businessName);
  expect
    .soft(
      await preview
        .locator("[data-section-family]")
        .evaluateAll((sections) =>
          sections.map(
            (section) => (section as HTMLElement).dataset.sectionFamily,
          ),
        ),
      `${label} must retain its researched conversion anatomy`,
    )
    .toEqual(expectedFamilies);
  expect
    .soft(visibleText, `${label} must not leak dental language`)
    .not.toMatch(/\b(?:dental|dentist|tooth|teeth|root canal)\b/i);
  expect
    .soft(visibleText, `${label} must not promise an outcome`)
    .not.toMatch(
      /\b(?:guaranteed (?:recovery|result|pain relief)|cure[ds]?|pain[- ]free)\b/i,
    );
  expect
    .soft(
      visibleText,
      `${label} must request rather than confirm an appointment`,
    )
    .not.toMatch(
      /\b(?:book now|instant (?:booking|confirmation)|appointment (?:is|has been) confirmed|confirmed appointment slot|your slot is confirmed)\b/i,
    );

  await expect
    .soft(
      preview.locator('[data-section-family="team"]'),
      `${label} must hide team without verified people`,
    )
    .toHaveCount(0);
  await expect
    .soft(
      preview.locator('[data-section-family="gallery"]'),
      `${label} must hide gallery without clinic-owned media`,
    )
    .toHaveCount(0);
  await expect
    .soft(
      preview.locator('[data-section-family="testimonials"]'),
      `${label} must hide unverified testimonials`,
    )
    .toHaveCount(0);

  const audit = await physiotherapyResponsiveAudit(page);
  expect
    .soft(
      audit.documentOverflowPx,
      `${label} must not overflow at ${viewport.width}px`,
    )
    .toBeLessThanOrEqual(1);
  expect
    .soft(
      audit.escapedElements,
      `${label} has elements outside the canvas at ${viewport.width}px`,
    )
    .toEqual([]);
  expect
    .soft(
      audit.clippedText,
      `${label} clips readable text at ${viewport.width}px`,
    )
    .toEqual([]);
  expect.soft(audit.h1.count, `${label} needs one H1`).toBe(1);
  expect.soft(audit.h1.text, `${label} H1 must be populated`).not.toBe("");
  expect
    .soft(audit.h1.allCaps, `${label} H1 must stay sentence case`)
    .toBe(false);
  expect
    .soft(audit.h1.textTransform, `${label} H1 text transform`)
    .toBe("none");
  expect.soft(audit.h1.wordBreak, `${label} H1 word break`).toBe("normal");
  expect
    .soft(audit.h1.overflowWrap, `${label} H1 overflow wrap`)
    .toBe("normal");
  expect.soft(audit.h1.clipped, `${label} H1 must not clip`).toBe(false);
  expect
    .soft(audit.h1.fontWeight, `${label} H1 must avoid ultra-light type`)
    .toBeGreaterThanOrEqual(600);
  expect
    .soft(audit.h1.fontWeight, `${label} H1 must avoid ultra-bold type`)
    .toBeLessThanOrEqual(700);
  expect
    .soft(audit.h1.fontSizePx, `${label} H1 must remain readable`)
    .toBeGreaterThanOrEqual(32);
  expect
    .soft(audit.h1.fontSizePx, `${label} H1 must not become billboard-sized`)
    .toBeLessThanOrEqual(72);
  expect
    .soft(audit.h1.lineCount, `${label} H1 needs a measurable line box`)
    .toBeGreaterThanOrEqual(1);
  expect
    .soft(audit.h1.lineCount, `${label} H1 must not become a word stack`)
    .toBeLessThanOrEqual(6);
  expect
    .soft(audit.heroTextProtected, `${label} hero text must remain readable`)
    .toBe(true);
  expect
    .soft(
      audit.navbarSiblingOverlaps,
      `${label} has colliding navbar regions at ${viewport.width}px`,
    )
    .toEqual([]);

  if (viewport.width <= 390) {
    expect
      .soft(
        audit.h1.fontSizePx,
        `${label} mobile H1 must stay within the pack range`,
      )
      .toBeLessThanOrEqual(44);
    expect
      .soft(
        audit.h1.lineHeightRatio,
        `${label} mobile H1 needs readable leading`,
      )
      .toBeGreaterThanOrEqual(1.07);
    expect
      .soft(
        audit.h1.lineHeightRatio,
        `${label} mobile H1 needs readable leading`,
      )
      .toBeLessThanOrEqual(1.15);
    expect
      .soft(
        audit.undersizedControls,
        `${label} has controls below 44px at ${viewport.width}px`,
      )
      .toEqual([]);
  }

  if (screenshotPath) {
    await page.screenshot({
      path: screenshotPath,
      animations: "disabled",
      fullPage: true,
    });
  }

  if (viewport.width !== 1440) {
    return { images: [], supportingSources: [] };
  }

  const images = await visiblePhysiotherapyImageAudit(page);
  if (pagePath === "/") {
    expect
      .soft(images.length, `${label} must render seven meaningful images`)
      .toBe(7);
  } else {
    expect
      .soft(images.length, `${label} needs at least one image`)
      .toBeGreaterThanOrEqual(1);
    expect
      .soft(images.length, `${label} must keep media density deliberate`)
      .toBeLessThanOrEqual(4);
  }
  expect
    .soft(
      new Set(images.map(({ src }) => src)).size,
      `${label} must not repeat an image`,
    )
    .toBe(images.length);
  for (const image of images) {
    expect
      .soft(image.naturalWidth, `${label} image failed to load: ${image.src}`)
      .toBeGreaterThan(0);
    expect
      .soft(image.naturalHeight, `${label} image failed to load: ${image.src}`)
      .toBeGreaterThan(0);
    expect
      .soft(image.alt.trim().length, `${label} image needs meaningful alt text`)
      .toBeGreaterThan(20);
  }

  const heroImages = await preview
    .locator('[data-section-family="hero"] img')
    .evaluateAll((items) =>
      items.map((image) => (image as HTMLImageElement).currentSrc),
    );
  expect
    .soft(heroImages, `${label} must render one hero image`)
    .toHaveLength(1);
  const heroSource = heroImages[0];
  return {
    images,
    heroSource,
    supportingSources: heroSource
      ? images.filter(({ src }) => src !== heroSource).map(({ src }) => src)
      : [],
  };
}

export async function assertPinnedPhysiotherapyLinks({
  page,
  candidateRecipeId,
  briefId,
}: {
  page: Page;
  candidateRecipeId: string;
  briefId?: string;
}) {
  const internalHrefs = await page
    .locator('[data-mi-physiotherapy-draft] a[href^="/physiotherapy-draft"]')
    .evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).href),
    );
  expect(internalHrefs.length).toBeGreaterThan(0);
  for (const href of internalHrefs) {
    const parsed = new URL(href);
    expect(parsed.searchParams.get("candidate"), href).toBe(candidateRecipeId);
    expect(parsed.searchParams.get("brief"), href).toBe(briefId ?? null);
  }
}

async function settlePhysiotherapyPage(page: Page) {
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

async function visiblePhysiotherapyImageAudit(
  page: Page,
): Promise<PhysiotherapyImageAudit[]> {
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

async function physiotherapyResponsiveAudit(page: Page) {
  return page.locator("[data-mi-physiotherapy-draft]").evaluate((preview) => {
    const root = preview as HTMLElement;
    const documentRoot = document.documentElement;
    const visible = [...root.querySelectorAll<HTMLElement>("*")].filter(
      isVisible,
    );

    const escapedElements = visible
      .filter((element) => !insideHorizontalContainment(element, root))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > documentRoot.clientWidth + 1;
      })
      .map(describeElement);
    const clippedText = visible
      .filter((element) =>
        ["H1", "H2", "H3", "P", "A", "BUTTON", "LABEL"].includes(
          element.tagName,
        ),
      )
      .filter((element) => !element.closest(".mi-form__honeypot"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const clipsX =
          (style.overflowX === "hidden" || style.overflowX === "clip") &&
          element.scrollWidth > element.clientWidth + 1;
        const clipsY =
          (style.overflowY === "hidden" || style.overflowY === "clip") &&
          element.scrollHeight > element.clientHeight + 1;
        return clipsX || clipsY;
      })
      .map(describeElement);

    const h1Elements = visible.filter((element) => element.tagName === "H1");
    const heading = h1Elements[0];
    if (!heading) throw new Error("The physiotherapy page is missing its H1");
    const headingStyle = getComputedStyle(heading);
    const headingText = heading.textContent?.trim().replace(/\s+/g, " ") ?? "";
    const headingLetters = headingText.replace(/[^a-z]/gi, "");
    const fontSizePx = Number.parseFloat(headingStyle.fontSize);
    const lineHeightPx = Number.parseFloat(headingStyle.lineHeight);

    const heroCopy = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__layout > div:first-child',
    );
    const heroMedia = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__media',
    );
    if (!heroCopy || !heroMedia) {
      throw new Error("The physiotherapy page is missing its hero composition");
    }
    const heroOverlapArea = overlapArea(
      heroCopy.getBoundingClientRect(),
      heroMedia.getBoundingClientRect(),
    );
    const copyStyle = getComputedStyle(heroCopy);
    const mediaOverlay = getComputedStyle(heroMedia, "::after");
    const copyHasSurface = ![
      "transparent",
      "rgba(0, 0, 0, 0)",
      "color(srgb 0 0 0 / 0)",
    ].includes(copyStyle.backgroundColor);
    const mediaHasOverlay =
      mediaOverlay.content !== "none" &&
      mediaOverlay.backgroundImage !== "none";

    const mobileControls = visible.filter((element) =>
      element.matches(
        ".mi-section__action, .mi-navbar__brand, .mi-nav-menu__toggle, .mi-nav-menu a, .mi-footer a, .mi-section__form input:not([type=hidden]), .mi-section__form textarea, .mi-section__form select, .mi-section__form button",
      ),
    );
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
      heroTextProtected:
        heroOverlapArea === 0 ||
        (Number.parseInt(copyStyle.zIndex, 10) >= 1 &&
          (copyHasSurface || mediaHasOverlay)),
      h1: {
        count: h1Elements.length,
        text: headingText,
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
        allCaps:
          headingLetters.length >= 4 &&
          headingLetters === headingLetters.toUpperCase(),
      },
      undersizedControls: mobileControls
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 43.5 || rect.height < 43.5;
        })
        .map(describeElement),
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

    function insideHorizontalContainment(
      element: HTMLElement,
      boundary: HTMLElement,
    ) {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== boundary) {
        const overflow = getComputedStyle(ancestor).overflowX;
        if (
          overflow === "hidden" ||
          overflow === "clip" ||
          overflow === "auto" ||
          overflow === "scroll"
        ) {
          return true;
        }
        ancestor = ancestor.parentElement;
      }
      return false;
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

    function describeElement(element: HTMLElement) {
      const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
      const family = element.closest<HTMLElement>("[data-section-family]")
        ?.dataset.sectionFamily;
      return `${family ?? "page"}:${element.tagName.toLowerCase()}${
        element.className
          ? `.${String(element.className).trim().replace(/\s+/g, ".")}`
          : ""
      }${text ? ` "${text.slice(0, 48)}"` : ""}`;
    }
  });
}
