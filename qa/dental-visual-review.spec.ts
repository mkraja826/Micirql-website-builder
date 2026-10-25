import { expect, test, type Page } from "@playwright/test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { rankPresets } from "../apps/builder/app/preset-ranking";

const requestedPreset = process.env.MI_VISUAL_PRESET?.trim();
const REVIEW_LOGO_ASSET_ID = "qa-radhika-dental-logo";
const BASE_OUTPUT_DIRECTORY = path.resolve(
  process.cwd(),
  "test-results",
  "dental-visual-review",
);
const OUTPUT_DIRECTORY = requestedPreset
  ? path.join(BASE_OUTPUT_DIRECTORY, safePathSegment(requestedPreset))
  : BASE_OUTPUT_DIRECTORY;

const PAGE_PATHS = ["/", "/services", "/about", "/contact"] as const;
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test("generate a complete dental website for senior visual review", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await rm(OUTPUT_DIRECTORY, { force: true, recursive: true });
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const ranked = rankPresets({
    domain: "clinic",
    industry: "Dental clinic",
    subindustry: "dental",
    goals: ["appointment requests", "patient trust", "service education"],
    styleTags: ["friendly", "calm", "minimal", "comfortable", "people"],
    requiredCapabilities: ["appointment booking", "contact forms"],
    services: [
      "Preventive dentistry",
      "Dental implants",
      "Root canal treatment",
      "Crowns and bridges",
      "Clear aligners",
      "Children's dentistry",
    ],
    notes:
      "A calm, modern, people-first clinic experience with clear treatment information.",
  });
  const selection = requestedPreset
    ? ranked.find(({ preset }) => preset.id === requestedPreset)
    : ranked[0];
  expect(
    selection,
    "the dental visual review requires a ranked preset",
  ).toBeDefined();

  await writeFile(
    path.join(OUTPUT_DIRECTORY, "generation-report.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        preset: selection!.preset.id,
        score: selection!.score,
        reasons: selection!.reasons,
        pagePaths: PAGE_PATHS,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const pagePath of PAGE_PATHS) {
    await test.step(pagePath, async () => {
      await page.setViewportSize(VIEWPORTS[0]);
      const route = `/dental-review/${selection!.preset.id}${
        pagePath === "/" ? "" : pagePath
      }`;
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.ok(), `${route} must render`).toBeTruthy();
      await expect(
        page.locator(`[data-mi-dental-review="${selection!.preset.id}"]`),
      ).toBeVisible();
      for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await settleImages(page);
        await verifyGeneratedPageRichness(
          page,
          pagePath,
          selection!.preset.id,
          viewport.name,
        );
        await capture(page, pagePath, viewport.name);

        if (pagePath === "/" && viewport.name === "mobile") {
          await openMobileMenu(page);
          await verifyOpenMobileMenu(page);
          await page.screenshot({
            path: path.join(OUTPUT_DIRECTORY, "home-mobile-menu-open.png"),
            animations: "disabled",
          });
        }
      }
    });
  }

  await test.step("withholds an unsupported Doctors route", async () => {
    const response = await page.goto(
      `/dental-review/${selection!.preset.id}/doctors`,
      { waitUntil: "domcontentloaded" },
    );
    expect(response?.status()).toBe(404);
  });
});

async function verifyGeneratedPageRichness(
  page: Page,
  pagePath: (typeof PAGE_PATHS)[number],
  presetId: string,
  viewport: (typeof VIEWPORTS)[number]["name"],
) {
  const metrics = await page.evaluate((logoAssetId) => {
    const root = document.querySelector<HTMLElement>("[data-mi-dental-review]");
    if (!root) throw new Error("The generated Dental review root is missing.");
    const visible = (element: HTMLElement) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const sections = [
      ...root.querySelectorAll<HTMLElement>("[data-section-family]"),
    ].filter(
      (section) =>
        visible(section) &&
        !["navbar", "footer"].includes(
          section.dataset.sectionFamily?.toLowerCase() ?? "",
        ),
    );
    const images = [...root.querySelectorAll<HTMLImageElement>("img")].filter(
      (image) => visible(image) && image.dataset.miImageField !== "brandMark",
    );
    const sources = images.map((image) => image.currentSrc || image.src);
    const headings = [...root.querySelectorAll<HTMLElement>("h1, h2, h3")]
      .filter(visible)
      .map((heading) => {
        const style = getComputedStyle(heading);
        const fontSize = Number.parseFloat(style.fontSize);
        const lineHeight = Number.parseFloat(style.lineHeight);
        return {
          level: heading.tagName.toLowerCase(),
          text: heading.textContent?.trim() ?? "",
          fontSize,
          lineHeightRatio: lineHeight / Math.max(fontSize, 1),
          fontWeight: Number.parseInt(style.fontWeight, 10),
          textTransform: style.textTransform,
        };
      });
    const logos = [
      ...root.querySelectorAll<HTMLImageElement>(
        `[data-mi-logo-asset-id="${logoAssetId}"]`,
      ),
    ];
    return {
      sectionCount: sections.length,
      imageCount: images.length,
      uniqueImageCount: new Set(sources).size,
      brokenImages: images
        .filter((image) => !image.complete || image.naturalWidth <= 0)
        .map((image) => image.getAttribute("src")),
      missingAlt: images
        .filter((image) => !(image.getAttribute("alt") ?? "").trim())
        .map((image) => image.getAttribute("src")),
      wordCount: (
        sections
          .map((section) => section.innerText)
          .join(" ")
          .match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) ?? []
      ).length,
      headings,
      logoCount: logos.length,
      brokenLogos: logos.filter(
        (logo) => !logo.complete || logo.naturalWidth <= 0,
      ).length,
      horizontalOverflow:
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
          root.scrollWidth,
        ) - window.innerWidth,
    };
  }, REVIEW_LOGO_ASSET_ID);

  const minimumImages = pagePath === "/" ? 8 : 4;
  const minimumSections =
    pagePath === "/" ? 7 : pagePath === "/contact" ? 4 : 5;
  expect(
    metrics.sectionCount,
    `${presetId} ${pagePath} needs a complete multi-section journey`,
  ).toBeGreaterThanOrEqual(minimumSections);
  expect(
    metrics.imageCount,
    `${presetId} ${pagePath} must not collapse to a one-image website`,
  ).toBeGreaterThanOrEqual(minimumImages);
  expect(
    metrics.uniqueImageCount,
    `${presetId} ${pagePath} must use varied imagery`,
  ).toBe(metrics.imageCount);
  expect(
    metrics.brokenImages,
    `${presetId} ${pagePath} has broken images`,
  ).toEqual([]);
  expect(
    metrics.missingAlt,
    `${presetId} ${pagePath} has images without alt text`,
  ).toEqual([]);
  expect(
    metrics.wordCount,
    `${presetId} ${pagePath} needs substantive generated content`,
  ).toBeGreaterThanOrEqual(pagePath === "/" ? 220 : 110);
  expect(
    metrics.logoCount,
    `${presetId} ${pagePath} must render the supplied logo in header and footer`,
  ).toBe(2);
  expect(metrics.brokenLogos).toBe(0);
  expect(
    metrics.horizontalOverflow,
    `${presetId} ${pagePath} overflows horizontally at ${viewport}`,
  ).toBeLessThanOrEqual(1);

  const heroHeading = metrics.headings.find(({ level }) => level === "h1");
  expect(heroHeading).toBeDefined();
  expect(heroHeading?.fontWeight).toBeLessThanOrEqual(700);
  expect(heroHeading?.lineHeightRatio).toBeGreaterThanOrEqual(0.98);
  expect(heroHeading?.fontSize).toBeLessThanOrEqual(72.1);
  expect(heroHeading?.textTransform).toBe("none");
  for (const heading of metrics.headings.filter(
    ({ level }) => level === "h2" || level === "h3",
  )) {
    expect(
      heading.fontWeight,
      `${presetId} ${pagePath} ${heading.level} “${heading.text}” is too heavy at ${viewport}`,
    ).toBeLessThanOrEqual(heading.level === "h3" ? 650 : 700);
    expect(
      heading.lineHeightRatio,
      `${presetId} ${pagePath} ${heading.level} “${heading.text}” is too tightly set at ${viewport}`,
    ).toBeGreaterThanOrEqual(heading.level === "h3" ? 1.1 : 1);
    expect(
      heading.fontSize,
      `${presetId} ${pagePath} ${heading.level} “${heading.text}” is oversized at ${viewport}`,
    ).toBeLessThanOrEqual(heading.level === "h3" ? 24.1 : 48.1);
    expect(heading.textTransform).toBe("none");
  }
}

async function capture(
  page: Page,
  pagePath: (typeof PAGE_PATHS)[number],
  viewport: (typeof VIEWPORTS)[number]["name"],
) {
  const name = pagePath === "/" ? "home" : pagePath.slice(1);
  await page.screenshot({
    path: path.join(OUTPUT_DIRECTORY, `${name}-${viewport}-fold.png`),
    animations: "disabled",
  });
  await page.screenshot({
    path: path.join(OUTPUT_DIRECTORY, `${name}-${viewport}-full.png`),
    animations: "disabled",
    fullPage: true,
  });
}

async function settleImages(page: Page) {
  await page.evaluate(async () => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const step = Math.max(Math.floor(window.innerHeight * 0.75), 400);
    const pageBottom = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
    );

    for (let top = 0; top < pageBottom; top += step) {
      window.scrollTo(0, top);
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => resolve()),
        ),
      );
    }
    window.scrollTo(0, pageBottom);

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
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => resolve()),
    );
  });
}

async function openMobileMenu(page: Page) {
  const toggle = page.locator(".mi-nav-menu__toggle");
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

async function verifyOpenMobileMenu(page: Page) {
  const metrics = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(
      ".mi-nav-menu > ul.is-open",
    );
    const backdrop = document.querySelector<HTMLElement>(
      ".mi-nav-menu__backdrop",
    );
    if (!menu || !backdrop) {
      throw new Error("The open mobile navigation is incomplete.");
    }
    const menuRect = menu.getBoundingClientRect();
    const backdropStyle = getComputedStyle(backdrop);
    return {
      menuLeft: menuRect.left,
      menuRight: menuRect.right,
      menuWidth: menuRect.width,
      viewportWidth: window.innerWidth,
      backdropDisplay: backdropStyle.display,
      backdropPosition: backdropStyle.position,
      backdropWidth: backdrop.getBoundingClientRect().width,
    };
  });
  expect(metrics.menuLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.menuRight).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.menuWidth).toBeGreaterThanOrEqual(metrics.viewportWidth - 40);
  expect(metrics.backdropDisplay).toBe("block");
  expect(metrics.backdropPosition).toBe("fixed");
  expect(metrics.backdropWidth).toBeGreaterThanOrEqual(metrics.viewportWidth);
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100);
}
