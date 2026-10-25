import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { listIndustryDesignPresets } from "../apps/builder/app/industry-design-preset-data";

const PAGE_PATHS = [
  "/",
  "/services",
  "/doctors",
  "/about",
  "/contact",
] as const;

// These adjacent catalog recipes exercise the two desktop composition modes
// that have historically leaked into the fixed-width mobile builder frame.
const REGRESSION_PRESETS = [
  { recipeId: "warm-authority", expectedRankSeed: 16, variant: 4 },
  { recipeId: "evidence-first", expectedRankSeed: 17, variant: 5 },
] as const;

const builderStylesPromise = loadBuilderPreviewStyles();

test.describe("dental builder embedded mobile frame", () => {
  test.describe.configure({ mode: "serial" });

  for (const regression of REGRESSION_PRESETS) {
    test(`rank-seed ${regression.expectedRankSeed} variant ${regression.variant} stays inside the 390px frame`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const preset = listIndustryDesignPresets("clinic", "dental").find(
        (candidate) => candidate.recipeId === regression.recipeId,
      );
      expect(
        preset,
        `${regression.recipeId} must remain in the dental catalog`,
      ).toBeDefined();
      expect(preset!.rankSeed).toBe(regression.expectedRankSeed);

      // This is the important condition: the browser is desktop-sized while
      // RendererPreview emulates a phone through a nested fixed-width frame.
      await page.setViewportSize({ width: 1440, height: 1000 });

      for (const pagePath of PAGE_PATHS) {
        await test.step(pagePath, async () => {
          const route = `/dental-review/${preset!.id}${
            pagePath === "/" ? "" : pagePath
          }`;
          const response = await page.goto(route, { waitUntil: "networkidle" });
          expect(response?.ok(), `${route} must render`).toBeTruthy();
          const review = page.locator(
            `[data-mi-dental-review="${preset!.id}"]`,
          );
          await expect(review).toBeVisible();
          await settleImages(page);

          const styles = await builderStylesPromise;
          await page.addStyleTag({ content: styles.workspace });
          await page.addStyleTag({ content: styles.responsivePreview });
          await mountInsideBuilderMobileFrame(page, preset!.id);

          const metrics = await measureEmbeddedMobileFrame(page);
          expect(metrics.frameClientWidth).toBeGreaterThanOrEqual(386);
          expect(metrics.frameClientWidth).toBeLessThanOrEqual(390);
          expect(
            metrics.frameOverflowPx,
            `${preset!.id} ${pagePath} overflowed the embedded mobile frame`,
          ).toBeLessThanOrEqual(1);
          expect(
            metrics.documentOverflowPx,
            `${preset!.id} ${pagePath} overflowed its rendered document`,
          ).toBeLessThanOrEqual(1);
          expect(
            metrics.sectionOverflows,
            `${preset!.id} ${pagePath} sections with horizontal overflow: ${JSON.stringify(metrics.sectionOverflows)}`,
          ).toEqual([]);
          expect(
            metrics.escapedElements,
            `${preset!.id} ${pagePath} content escaped the clipped frame: ${JSON.stringify(metrics.escapedElements)}`,
          ).toEqual([]);
          expect(
            metrics.clippedText,
            `${preset!.id} ${pagePath} text was horizontally clipped: ${JSON.stringify(metrics.clippedText)}`,
          ).toEqual([]);
          expect(
            metrics.multiColumnCompositions,
            `${preset!.id} ${pagePath} retained a desktop section composition in mobile preview: ${JSON.stringify(metrics.multiColumnCompositions)}`,
          ).toEqual([]);
          expect(
            metrics.heroTrackCount,
            `${preset!.id} ${pagePath} hero must resolve to one mobile grid track`,
          ).toBeLessThanOrEqual(1);
          expect(
            metrics.heroOverlapArea,
            `${preset!.id} ${pagePath} hero copy and media must not overlap in mobile preview`,
          ).toBeLessThanOrEqual(1);
        });
      }
    });
  }

  test("expressive dental themes keep the mobile hero readable", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const recipeId of [
      "story-led",
      "immersive-narrative",
      "vibrant-practice",
    ]) {
      const preset = listIndustryDesignPresets("clinic", "dental").find(
        (candidate) => candidate.recipeId === recipeId,
      );
      expect(preset, `${recipeId} must remain in the dental catalog`).toBeDefined();
      const response = await page.goto(`/dental-review/${preset!.id}`, {
        waitUntil: "networkidle",
      });
      expect(response?.ok()).toBeTruthy();
      await settleImages(page);
      const styles = await builderStylesPromise;
      await page.addStyleTag({ content: styles.workspace });
      await page.addStyleTag({ content: styles.responsivePreview });
      await mountInsideBuilderMobileFrame(page, preset!.id);
      const metrics = await measureEmbeddedMobileFrame(page);
      expect(metrics.heroText).toBe("Mamatha Dental Care");
      expect(metrics.heroFontSizePx, `${recipeId} hero is oversized`).toBeLessThanOrEqual(36);
      expect(metrics.heroFontWeight, `${recipeId} hero is too heavy`).toBeLessThanOrEqual(600);
      expect(
        metrics.heroFontFamily,
        `${recipeId} hero uses a condensed display face on mobile`,
      ).not.toMatch(/Impact|Haettenschweiler|Arial Narrow/i);
      expect(metrics.heroTextTransform).toBe("none");
      expect(metrics.heroLineCount, `${recipeId} hero uses too many lines`).toBeLessThanOrEqual(3);
    }
  });
});

async function loadBuilderPreviewStyles() {
  const workspacePath = path.resolve(
    process.cwd(),
    "apps",
    "builder",
    "app",
    "workspace-interactive.css",
  );
  const rendererPath = path.resolve(
    process.cwd(),
    "apps",
    "builder",
    "app",
    "renderer-preview.tsx",
  );
  const [workspace, rendererSource] = await Promise.all([
    readFile(workspacePath, "utf8"),
    readFile(rendererPath, "utf8"),
  ]);
  const responsivePreview = rendererSource.match(
    /const RESPONSIVE_PREVIEW_CSS = `([\s\S]*?)`;/,
  )?.[1];
  if (!responsivePreview) {
    throw new Error("Could not read RendererPreview's responsive CSS contract");
  }
  return { workspace, responsivePreview };
}

async function mountInsideBuilderMobileFrame(page: Page, presetId: string) {
  await page.evaluate((candidateId) => {
    const review = document.querySelector<HTMLElement>(
      `[data-mi-dental-review="${candidateId}"]`,
    );
    if (!review) throw new Error("The generated dental review root is missing");

    review.classList.add("renderer-preview-document");
    const stage = document.createElement("div");
    stage.className = "renderer-preview-stage viewport-mobile";
    stage.dataset.qaEmbeddedMobileStage = "true";
    const frame = document.createElement("div");
    frame.className = "site-preview renderer-site-preview viewport-mobile";
    frame.dataset.qaEmbeddedMobileFrame = "true";
    frame.style.width = "390px";
    frame.style.transform = "scale(1)";
    frame.style.containerType = "inline-size";

    document.body.replaceChildren(stage);
    stage.append(frame);
    frame.append(review);
  }, presetId);

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function measureEmbeddedMobileFrame(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector<HTMLElement>(
      '[data-qa-embedded-mobile-frame="true"]',
    );
    const root = frame?.querySelector<HTMLElement>(
      ".renderer-preview-document",
    );
    if (!frame || !root)
      throw new Error("The embedded mobile frame is missing");

    const frameRect = frame.getBoundingClientRect();
    const contentLeft = frameRect.left + frame.clientLeft;
    const contentRight = contentLeft + frame.clientWidth;
    const sections = [
      ...root.querySelectorAll<HTMLElement>("[data-section-family]"),
    ].filter(isVisible);
    const sectionOverflows = sections
      .filter((section) => section.scrollWidth > section.clientWidth + 1)
      .map((section) => ({
        family: section.dataset.sectionFamily ?? "unknown",
        overflowPx: section.scrollWidth - section.clientWidth,
      }));

    const keyElements = [
      ...root.querySelectorAll<HTMLElement>(
        [
          ".mi-section__layout",
          ".mi-section__composition",
          ".mi-section__heading",
          ".mi-section__media",
          ".mi-section__form",
          "form",
          "img",
          "h1",
          "h2",
          "h3",
          "p",
          "a",
          "button",
          "input",
          "select",
          "textarea",
        ].join(","),
      ),
    ].filter(isVisible);
    const escapedElements = keyElements
      .filter((element) => !insideHorizontalScroller(element, root))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < contentLeft - 1 || rect.right > contentRight + 1;
      })
      .map(describeElement);

    const clippedText = keyElements
      .filter((element) =>
        ["H1", "H2", "H3", "P", "A", "BUTTON"].includes(element.tagName),
      )
      .filter((element) => !insideHorizontalScroller(element, root))
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map(describeElement);

    const multiColumnCompositions = sections
      .filter(
        (section) =>
          !["navbar", "hero", "contact", "footer"].includes(
            section.dataset.sectionFamily ?? "",
          ),
      )
      .flatMap((section) => {
        const composition = section.querySelector<HTMLElement>(
          ".mi-section__composition",
        );
        if (!composition || !isVisible(composition)) return [];
        const columns = gridTrackCount(composition);
        return columns > 1
          ? [
              {
                family: section.dataset.sectionFamily ?? "unknown",
                columns,
                template: getComputedStyle(composition).gridTemplateColumns,
              },
            ]
          : [];
      });

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
      throw new Error("The dental page is missing its hero composition");
    }
    const heroHeading = heroLayout.querySelector<HTMLElement>("h1");
    if (!heroHeading) throw new Error("The dental page is missing its hero heading");
    const heroHeadingStyle = getComputedStyle(heroHeading);
    const heroFontSizePx = Number.parseFloat(heroHeadingStyle.fontSize);
    const heroLineHeightPx = Number.parseFloat(heroHeadingStyle.lineHeight);

    return {
      frameClientWidth: frame.clientWidth,
      frameOverflowPx: Math.max(0, frame.scrollWidth - frame.clientWidth),
      documentOverflowPx: Math.max(0, root.scrollWidth - root.clientWidth),
      sectionOverflows,
      escapedElements,
      clippedText,
      multiColumnCompositions,
      heroTrackCount: gridTrackCount(heroLayout),
      heroOverlapArea: overlapArea(
        heroCopy.getBoundingClientRect(),
        heroMedia.getBoundingClientRect(),
      ),
      heroText: heroHeading.textContent?.trim().replace(/\s+/g, " ") ?? "",
      heroFontSizePx,
      heroFontWeight: Number.parseInt(heroHeadingStyle.fontWeight, 10),
      heroFontFamily: heroHeadingStyle.fontFamily,
      heroTextTransform: heroHeadingStyle.textTransform,
      heroLineCount:
        Number.isFinite(heroLineHeightPx) && heroLineHeightPx > 0
          ? Math.round(heroHeading.getBoundingClientRect().height / heroLineHeightPx)
          : 0,
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
      return `${family ?? "unknown"}:${element.tagName.toLowerCase()}${
        element.className
          ? `.${String(element.className).trim().replace(/\s+/g, ".")}`
          : ""
      }${text ? ` \"${text.slice(0, 48)}\"` : ""}`;
    }
  });
}

async function settleImages(page: Page) {
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
      new Promise<void>((resolve) => window.setTimeout(resolve, 5_000)),
    ]);
    await document.fonts.ready;
  });
}
