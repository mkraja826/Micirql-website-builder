import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { galleryLightboxRuntimeScript } from "@micirql/sections";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

async function generatedLiveRuntimeCss(): Promise<string> {
  execFileSync(pnpm, ["--filter", "@micirql/live", "generate:runtime-css"], {
    cwd: repoRoot,
    stdio: "pipe",
    env: process.env,
  });
  const generated = await readFile(path.join(repoRoot, "apps/live/generated/runtime-css.ts"), "utf8");
  const match = generated.match(/export const MICIRQL_RUNTIME_CSS = (.*);\s*$/s);
  if (!match?.[1]) throw new Error("Unable to read generated live runtime CSS artifact");
  return JSON.parse(match[1]) as string;
}

function imageData(label: string, tone: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="${tone}"/><text x="60" y="120" font-size="72" fill="white">${label}</text></svg>`)}`;
}

function galleryItem(index: number, title: string, description: string, src: string) {
  return `<figure class="mi-gallery-card mi-gallery-card--grid" data-mi-gallery-item>
    <button type="button" class="mi-gallery-trigger" data-mi-gallery-open data-mi-gallery-src="${src}" data-mi-gallery-alt="${title}" data-mi-gallery-title="${title}" data-mi-gallery-description="${description}" aria-label="Open ${title} image">
      <img src="${src}" alt="${title}">
    </button>
    <figcaption><strong>${title}</strong><span>${description}</span></figcaption>
  </figure>`;
}

function documentFor(css: string) {
  const images = [
    imageData("Consultation room", "#6f64d9"),
    imageData("Implant planning", "#4e8a86"),
    imageData("Treatment suite", "#a06e65"),
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
  <body><main data-mi-site style="--mi-color-primary:#5b45ff;--mi-color-accent:#6d59ff;--mi-color-border:#d9d9e3;--mi-color-surface:#fff;--mi-color-surface-elevated:#fff;--mi-color-text:#17171d;--mi-color-text-muted:#676774">
    <section class="mi-section mi-gallery-section mi-gallery-section--grid">
      <div class="mi-container"><div class="mi-gallery-struct-grid">
        ${galleryItem(0, "Consultation room", "Calm consultation environment", images[0]!)}
        ${galleryItem(1, "Implant planning", "Digital implant planning", images[1]!)}
        ${galleryItem(2, "Treatment suite", "Modern treatment suite", images[2]!)}
      </div></div>
      <dialog class="mi-gallery-lightbox" data-mi-gallery-lightbox aria-label="Gallery image viewer">
        <div class="mi-gallery-lightbox__surface">
          <button type="button" class="mi-gallery-lightbox__close" data-mi-gallery-close aria-label="Close image viewer">×</button>
          <button type="button" class="mi-gallery-lightbox__nav mi-gallery-lightbox__nav--prev" data-mi-gallery-prev aria-label="Previous image">←</button>
          <figure class="mi-gallery-lightbox__figure">
            <img data-mi-gallery-lightbox-image src="" alt="">
            <figcaption><strong data-mi-gallery-lightbox-title></strong><span data-mi-gallery-lightbox-description></span><small data-mi-gallery-lightbox-position aria-live="polite"></small></figcaption>
          </figure>
          <button type="button" class="mi-gallery-lightbox__nav mi-gallery-lightbox__nav--next" data-mi-gallery-next aria-label="Next image">→</button>
        </div>
      </dialog>
    </section>
  </main>${galleryLightboxRuntimeScript()}</body></html>`;
}

let runtimeCss = "";

test.beforeAll(async () => {
  runtimeCss = await generatedLiveRuntimeCss();
  expect(runtimeCss).toContain("packages/sections/src/gallery-lightbox.css");
  expect(runtimeCss).toContain(".mi-gallery-lightbox");
});

test.describe("gallery lightbox accessibility and navigation", () => {
  test("keyboard open, arrow navigation, Escape close and focus restoration are deterministic", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.setContent(documentFor(runtimeCss), { waitUntil: "load" });

    const triggers = page.locator("[data-mi-gallery-open]");
    const first = triggers.first();
    const dialog = page.locator("[data-mi-gallery-lightbox]");
    await first.focus();
    await expect(first).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveAttribute("open", "");
    await expect(dialog.locator("[data-mi-gallery-close]")).toBeFocused();
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("1 of 3");
    await expect(dialog.locator("[data-mi-gallery-lightbox-title]")).toHaveText("Consultation room");

    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("2 of 3");
    await expect(dialog.locator("[data-mi-gallery-lightbox-title]")).toHaveText("Implant planning");

    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("1 of 3");

    await page.keyboard.press("Escape");
    await expect(dialog).not.toHaveAttribute("open", "");
    await expect(first).toBeFocused();
  });

  test("explicit previous/next/close controls are labelled and restore the invoking trigger", async ({ page }) => {
    await page.setContent(documentFor(runtimeCss), { waitUntil: "load" });
    const second = page.locator("[data-mi-gallery-open]").nth(1);
    await second.click();
    const dialog = page.locator("[data-mi-gallery-lightbox]");
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("2 of 3");
    await expect(dialog.locator("[data-mi-gallery-prev]")).toHaveAttribute("aria-label", "Previous image");
    await expect(dialog.locator("[data-mi-gallery-next]")).toHaveAttribute("aria-label", "Next image");
    await expect(dialog.locator("[data-mi-gallery-close]")).toHaveAttribute("aria-label", "Close image viewer");

    await dialog.locator("[data-mi-gallery-next]").click();
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("3 of 3");
    await dialog.locator("[data-mi-gallery-close]").click();
    await expect(second).toBeFocused();
  });

  test("mobile lightbox stays viewport-contained with 44px controls and safe horizontal swipe", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(documentFor(runtimeCss), { waitUntil: "load" });
    await page.locator("[data-mi-gallery-open]").first().click();

    const dialog = page.locator("[data-mi-gallery-lightbox]");
    const geometry = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(391);
    expect(geometry.bottom).toBeLessThanOrEqual(845);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);

    for (const selector of ["[data-mi-gallery-close]", "[data-mi-gallery-prev]", "[data-mi-gallery-next]"]) {
      const box = await dialog.locator(selector).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const image = dialog.locator("[data-mi-gallery-lightbox-image]");
    await image.evaluate((element) => {
      const start = new Touch({ identifier: 1, target: element, clientX: 310, clientY: 360 });
      element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
      const end = new Touch({ identifier: 1, target: element, clientX: 205, clientY: 365 });
      element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
    });
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("2 of 3");

    await image.evaluate((element) => {
      const start = new Touch({ identifier: 2, target: element, clientX: 260, clientY: 320 });
      element.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [start], changedTouches: [start] }));
      const end = new Touch({ identifier: 2, target: element, clientX: 225, clientY: 430 });
      element.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [], changedTouches: [end] }));
    });
    await expect(dialog.locator("[data-mi-gallery-lightbox-position]")).toHaveText("2 of 3");
  });
});
