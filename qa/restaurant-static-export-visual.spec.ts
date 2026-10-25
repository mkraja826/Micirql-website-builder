import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  buildStaticProject,
  type StaticProjectFile,
} from "../apps/builder/app/api/publish/export-utils";
import {
  applyRestaurantDraftMedia,
  createRestaurantDraftScaffold,
} from "../apps/builder/app/industry-packs/drafts";
import {
  REFERENCE_BRIEF,
  baseSite,
  qaBrandMark,
} from "../apps/preview/app/restaurant-draft/[[...slug]]/page";

const ORIGIN = "https://restaurant-static.test";
const states = [
  { name: "home", path: "/", file: "index.html", images: 6 },
  { name: "menu", path: "/menu/", file: "menu/index.html", images: 3 },
  { name: "visit", path: "/visit/", file: "visit/index.html", images: 3 },
  {
    name: "reservations",
    path: "/reservations/",
    file: "reservations/index.html",
    images: 1,
  },
  { name: "story", path: "/story/", file: "story/index.html", images: 2 },
  { name: "contact", path: "/contact/", file: "contact/index.html", images: 1 },
] as const;
const viewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
] as const;

test.describe("Restaurant static-export visual parity", () => {
  let files: StaticProjectFile[];

  test.beforeAll(async () => {
    const brandMark = qaBrandMark();
    const site = applyRestaurantDraftMedia(
      createRestaurantDraftScaffold(
        baseSite(),
        REFERENCE_BRIEF,
        { logoAssetId: brandMark.assetId, colors: {} },
        { logo: "user-upload", colors: {} },
      ),
    );
    files = await buildStaticProject({
      published: {
        siteId: site.siteId,
        versionId: "restaurant-static-reference-v1",
        snapshot: site,
        snapshotHash: "e".repeat(64),
      },
      requestOrigin: "https://builder.micirql.com",
      publicFunctionsOrigin: "https://forms.micirql.com",
      brandMark,
      generatedAt: "2026-10-24T00:00:00.000Z",
    });
  });

  test("keeps all six exported routes usable at five release widths", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await serveStaticProject(page, () => files);
    const allImageSources = new Set<string>();
    const heroSources = new Set<string>();

    for (const state of states) {
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        const response = await page.goto(`${ORIGIN}${state.path}`, {
          waitUntil: "networkidle",
        });
        expect(response?.ok(), `${state.name} must load`).toBe(true);
        await expect(page.locator("body")).toHaveAttribute(
          "data-mi-domain",
          "restaurant",
        );
        await expect(page.locator("body")).toHaveAttribute(
          "data-mi-subtype",
          "restaurant",
        );
        await expect(page.locator("h1")).toHaveCount(1);
        await assertNoHorizontalEscape(page, state.name, viewport.width);
        await assertHeroComposition(page, viewport.width);
        await assertControlTargets(page, state.name, viewport.width);

        const h1 = page.locator("h1");
        const h1Style = await h1.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            family: style.fontFamily,
            size: Number.parseFloat(style.fontSize),
            weight: Number.parseInt(style.fontWeight, 10),
          };
        });
        expect(h1Style.family).toContain("Source Serif 4");
        expect(h1Style.weight).toBeLessThanOrEqual(650);
        expect(h1Style.size).toBeLessThanOrEqual(
          viewport.width < 768 ? 46 : 69,
        );

        const logos = page.locator("img[data-mi-logo-asset-id]");
        await expect(logos).toHaveCount(2);
        await expect(logos.first()).toHaveAttribute("loading", "eager");
        await expect(logos.last()).toHaveAttribute("loading", "lazy");

        const contentImages = page.locator("img:not([data-mi-logo-asset-id])");
        await expect(contentImages).toHaveCount(state.images);
        expect(
          await contentImages.evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement &&
                image.complete &&
                image.naturalWidth > 0 &&
                image.alt.toLowerCase().includes("not a verified"),
            ),
          ),
          `${state.name} imagery must load with active stock disclosure`,
        ).toBe(true);

        if (viewport.width === 320) {
          for (const source of await contentImages.evaluateAll((images) =>
            images.map((image) => (image as HTMLImageElement).currentSrc),
          )) {
            allImageSources.add(source);
          }
          const heroSource = await page
            .locator(".mi-section--hero .mi-media img")
            .getAttribute("src");
          expect(heroSource).toBeTruthy();
          heroSources.add(heroSource!);
        }

        if (state.name === "menu") {
          await expect(page.locator(".mi-item-group")).toHaveCount(3);
          await expect(page.locator(".mi-card__meta")).toHaveCount(8);
          await expect(page.locator(".mi-gallery__item")).toHaveCount(2);
        }
        if (state.name === "reservations") {
          await expect(page.locator('input[name="requestedDate"]')).toHaveCount(
            1,
          );
          await expect(page.locator('input[name="requestedTime"]')).toHaveCount(
            1,
          );
          await expect(page.locator('input[name="partySize"]')).toHaveCount(1);
          await expect(page.locator('button[type="submit"]')).toHaveText(
            "Request a table",
          );
        }
        if (state.name === "contact") {
          await expect(page.locator('input[name="requestedDate"]')).toHaveCount(
            0,
          );
          await expect(page.locator('button[type="submit"]')).toHaveText(
            "Send enquiry",
          );
        }

        if (state.name === "home" && viewport.width === 320) {
          const toggle = page.locator(".mi-menu-toggle");
          await toggle.click();
          await expect(toggle).toHaveAttribute("aria-expanded", "true");
          await expect(page.locator(".mi-nav")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(toggle).toHaveAttribute("aria-expanded", "false");
          await expect(toggle).toBeFocused();
        }

        await page.screenshot({
          path: screenshotPath(testInfo, state.name, viewport.width),
          fullPage: true,
        });
      }
    }

    expect(allImageSources.size).toBe(16);
    expect(heroSources.size).toBe(6);
  });
});

async function serveStaticProject(
  page: Page,
  files: () => StaticProjectFile[],
) {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = filePath(url.pathname);
    const file = files().find((candidate) => candidate.path === path);
    if (!file) {
      await route.fulfill({ status: 404, body: "Not found" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: contentType(file.path),
      body: Buffer.from(file.bytes),
    });
  });
}

function filePath(pathname: string) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (!decoded) return "index.html";
  return decoded.endsWith("/") ? `${decoded}index.html` : decoded;
}

function contentType(path: string) {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function assertNoHorizontalEscape(
  page: Page,
  route: string,
  width: number,
) {
  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const escaped = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((node) => {
        if (node.closest(".mi-form__honeypot")) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          (rect.left < -1 || rect.right > viewport + 1)
        );
      })
      .map((node) => ({
        tag: node.tagName,
        className: node.className,
        rect: node.getBoundingClientRect().toJSON(),
      }));
    return {
      documentOverflow: document.documentElement.scrollWidth - viewport,
      escaped,
    };
  });
  expect(
    result.documentOverflow,
    `${route} must not overflow at ${width}px`,
  ).toBeLessThanOrEqual(1);
  expect(result.escaped, `${route} has escaped elements at ${width}px`).toEqual(
    [],
  );
}

async function assertHeroComposition(page: Page, width: number) {
  const boxes = await page.evaluate(() => {
    const heading = document
      .querySelector<HTMLElement>(".mi-section--hero .mi-heading")
      ?.getBoundingClientRect();
    const media = document
      .querySelector<HTMLElement>(".mi-section--hero .mi-media")
      ?.getBoundingClientRect();
    return heading && media
      ? { heading: heading.toJSON(), media: media.toJSON() }
      : null;
  });
  expect(boxes).not.toBeNull();
  const horizontal =
    Math.min(boxes!.heading.right, boxes!.media.right) -
    Math.max(boxes!.heading.left, boxes!.media.left);
  const vertical =
    Math.min(boxes!.heading.bottom, boxes!.media.bottom) -
    Math.max(boxes!.heading.top, boxes!.media.top);
  expect(
    horizontal > 1 && vertical > 1,
    `hero content must not overlap at ${width}px`,
  ).toBe(false);
}

async function assertControlTargets(page: Page, route: string, width: number) {
  const undersized = await page
    .locator("a,button,input,select,textarea")
    .evaluateAll((controls) =>
      controls
        .filter((control) => {
          if (control.closest(".mi-form__honeypot")) return false;
          const rect = control.getBoundingClientRect();
          const style = getComputedStyle(control);
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            (rect.width < 44 || rect.height < 44)
          );
        })
        .map((control) => ({
          tag: control.tagName,
          text: control.textContent?.trim().slice(0, 40),
          rect: control.getBoundingClientRect().toJSON(),
        })),
    );
  expect(undersized, `${route} has controls below 44px at ${width}px`).toEqual(
    [],
  );
}

function screenshotPath(testInfo: TestInfo, route: string, width: number) {
  return testInfo.outputPath(`restaurant-static-${route}-${width}.png`);
}
