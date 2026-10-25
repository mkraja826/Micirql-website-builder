import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PHYSIOTHERAPY_DRAFT_CANDIDATES } from "../apps/builder/app/industry-packs/drafts";

const OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "physiotherapy-top20-catalog",
);
const VIEWPORTS = [
  { width: 320, height: 800, label: "mobile" },
  { width: 1440, height: 900, label: "desktop" },
] as const;
const CANDIDATES = process.env.MI_QA_PHYSIO_CANDIDATE
  ? PHYSIOTHERAPY_DRAFT_CANDIDATES.filter(
      (candidate) =>
        candidate.id === process.env.MI_QA_PHYSIO_CANDIDATE ||
        candidate.recipeId === process.env.MI_QA_PHYSIO_CANDIDATE,
    )
  : PHYSIOTHERAPY_DRAFT_CANDIDATES;

test.describe("Physiotherapy Top 20: draft rendered catalog", () => {
  test("all candidates render distinct responsive home experiences without entering production", async ({
    page,
  }) => {
    test.setTimeout(600_000);
    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    const fingerprints = new Set<string>();

    expect(CANDIDATES.length).toBeGreaterThan(0);
    for (const candidate of CANDIDATES) {
      for (const viewport of VIEWPORTS) {
        await test.step(`${candidate.rankSeed.toString().padStart(2, "0")} ${candidate.name} at ${viewport.width}px`, async () => {
          await page.setViewportSize(viewport);
          const route = `/physiotherapy-draft?candidate=${encodeURIComponent(candidate.recipeId)}`;
          const response = await page.goto(route, {
            waitUntil: "domcontentloaded",
          });
          expect(response?.ok(), `${candidate.id} must render`).toBeTruthy();
          await settlePage(page);

          const preview = page.locator(
            '[data-mi-physiotherapy-draft="calm-clinical-movement"]',
          );
          await expect(preview).toHaveAttribute(
            "data-mi-physiotherapy-candidate",
            candidate.recipeId,
          );
          const main = preview.locator("main[data-mi-site]");
          await expect(main).toHaveAttribute("data-mi-candidate", candidate.id);
          await expect(main).toHaveAttribute(
            "data-mi-theme",
            candidate.theme.family,
          );

          const audit = await responsiveAudit(page);
          expect
            .soft(audit.documentOverflowPx, candidate.id)
            .toBeLessThanOrEqual(1);
          expect.soft(audit.escapedElements, candidate.id).toEqual([]);
          expect.soft(audit.clippedText, candidate.id).toEqual([]);
          expect.soft(audit.h1.count, candidate.id).toBe(1);
          expect
            .soft(audit.h1.fontWeight, candidate.id)
            .toBeGreaterThanOrEqual(600);
          expect
            .soft(audit.h1.fontWeight, candidate.id)
            .toBeLessThanOrEqual(700);
          expect.soft(audit.h1.wordBreak, candidate.id).toBe("normal");
          expect.soft(audit.h1.overflowWrap, candidate.id).toBe("normal");
          expect.soft(audit.h1.textTransform, candidate.id).toBe("none");
          expect
            .soft(audit.h1.fontSizePx, candidate.id)
            .toBeGreaterThanOrEqual(32);
          expect.soft(audit.h1.lineCount, candidate.id).toBeLessThanOrEqual(6);
          expect
            .soft(audit.heroTextProtected, `${candidate.id} hero readability`)
            .toBe(true);
          if (viewport.width === 320) {
            expect
              .soft(audit.h1.fontSizePx, candidate.id)
              .toBeLessThanOrEqual(44);
            expect.soft(audit.undersizedControls, candidate.id).toEqual([]);
          }

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
          const images = await preview.locator("img").evaluateAll((items) =>
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
          expect(images).toHaveLength(7);
          expect(new Set(images.map((image) => image.src)).size).toBe(7);
          for (const image of images) {
            expect(image.naturalWidth).toBeGreaterThan(0);
            expect(image.naturalHeight).toBeGreaterThan(0);
            expect(image.alt.trim().length).toBeGreaterThan(20);
          }

          if (viewport.width === 1440) {
            fingerprints.add(await visualFingerprint(page));
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

    expect(
      fingerprints.size,
      "each candidate needs a recognisably different rendered fingerprint",
    ).toBe(CANDIDATES.length);
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

async function visualFingerprint(page: Page) {
  return page.locator("main[data-mi-candidate]").evaluate((root) => {
    const capture = (element: HTMLElement) => {
      const computed = getComputedStyle(element);
      return {
        display: computed.display,
        columns: computed.gridTemplateColumns,
        borderRadius: computed.borderRadius,
        borderTop: computed.borderTop,
        borderBottom: computed.borderBottom,
        boxShadow: computed.boxShadow,
        background: computed.backgroundImage,
        clipPath: computed.clipPath,
        aspectRatio: computed.aspectRatio,
        transform: computed.transform,
      };
    };
    const style = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing fingerprint target ${selector}`);
      return capture(element);
    };
    return JSON.stringify({
      components: [
        ...root.querySelectorAll<HTMLElement>("[data-section-family]"),
      ].map((element) => ({
        family: element.dataset.sectionFamily,
        theme: element.dataset.sectionTheme,
        variant: element.dataset.sectionVariant,
      })),
      page: capture(root as HTMLElement),
      heroLayout: style('[data-section-family="hero"] .mi-section__layout'),
      heroMedia: style('[data-section-family="hero"] .mi-section__media'),
      card: style('[data-section-family="services"] .mi-section__card'),
      process: style('[data-section-family="process"] .mi-stats'),
    });
  });
}

async function responsiveAudit(page: Page) {
  return page.locator("[data-mi-physiotherapy-draft]").evaluate((preview) => {
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
    const describe = (element: HTMLElement) =>
      `${element.tagName.toLowerCase()}.${String(element.className).replace(/\s+/g, ".")}`;
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
    const heroCopy = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__layout > div:first-child',
    );
    const heroMedia = root.querySelector<HTMLElement>(
      '[data-section-family="hero"] .mi-section__media',
    );
    if (!heroCopy || !heroMedia)
      throw new Error("Candidate hero is incomplete");
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
    const mediaOverlay = getComputedStyle(heroMedia, "::after");
    const copyHasSurface = ![
      "transparent",
      "rgba(0, 0, 0, 0)",
      "color(srgb 0 0 0 / 0)",
    ].includes(copyStyle.backgroundColor);
    const mediaHasOverlay =
      mediaOverlay.content !== "none" &&
      mediaOverlay.backgroundImage !== "none";
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
      heroOverlapArea,
      heroTextProtected:
        heroOverlapArea === 0 ||
        (Number.parseInt(copyStyle.zIndex, 10) >= 1 &&
          (copyHasSurface || mediaHasOverlay)),
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
