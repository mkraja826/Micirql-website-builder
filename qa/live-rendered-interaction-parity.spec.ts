import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function durationMs(value: string): number {
  return value.split(",").reduce((max, token) => {
    const entry = token.trim();
    const amount = Number.parseFloat(entry) || 0;
    const ms = entry.endsWith("ms") ? amount : amount * 1000;
    return Math.max(max, ms);
  }, 0);
}

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

function liveDocument(css: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>${css}</style>
</head>
<body>
  <main data-mi-site style="--mi-color-primary:#5b45ff;--mi-color-accent:#6d59ff;--mi-color-border:#d9d9e3;--mi-background:#fff;--mi-foreground:#17171d">
    <header class="mi-shell-navbar mi-shell-navbar--classic">
      <div class="mi-container">
        <div class="mi-nav-row">
          <a href="/" class="mi-shell-brand">Aurelia Dental</a>
          <nav class="mi-shell-links" aria-label="Primary navigation">
            <a href="#services">Services</a><a href="#contact">Contact</a>
          </nav>
          <div class="mi-nav-actions">
            <a class="mi-shell-cta" href="#contact">Book appointment</a>
            <details class="mi-mobile-nav">
              <summary class="mi-burger" aria-label="Open navigation menu"><span></span><span></span><span></span></summary>
              <div class="mi-mobile-drawer">
                <div class="mi-mobile-drawer__head"><strong>Aurelia Dental</strong><span aria-hidden="true">Menu</span></div>
                <nav aria-label="Mobile navigation"><a href="#services">Services</a><a href="#contact">Contact</a></nav>
                <a class="mi-shell-cta" href="#contact">Book appointment</a>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
    <section class="mi-section" id="services">
      <div class="mi-container">
        <h1>Dental care planned with clarity</h1>
        <a class="mi-section__action mi-section__action--primary" href="#contact">Book consultation</a>
      </div>
    </section>
    <section id="contact"><a class="mi-conv-btn mi-conv-btn--primary" href="mailto:hello@example.com">Contact clinic</a></section>
  </main>
</body>
</html>`;
}

let runtimeCss = "";

test.beforeAll(async () => {
  runtimeCss = await generatedLiveRuntimeCss();
  const sharedInteractionCss = (await readFile(path.join(repoRoot, "packages/sections/src/interaction-polish.css"), "utf8")).trim();
  expect(runtimeCss).toContain("packages/sections/src/interaction-polish.css");
  expect(runtimeCss).toContain(sharedInteractionCss);
});

test.describe("published live interaction parity", () => {
  test("live runtime CTA preserves pointer feedback, focus visibility and safe transitions", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent(liveDocument(runtimeCss), { waitUntil: "load" });

    const action = page.locator("[data-mi-site] .mi-section__action").first();
    await expect(action).toBeVisible();

    const resting = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, boxShadow: style.boxShadow, color: style.color, background: style.backgroundColor };
    });
    await action.hover();
    const hovered = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, boxShadow: style.boxShadow, color: style.color, background: style.backgroundColor };
    });
    expect(hovered).not.toEqual(resting);

    await action.focus();
    const focus = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: Number.parseFloat(style.outlineWidth),
        outlineOffset: Number.parseFloat(style.outlineOffset),
      };
    });
    expect(focus.outlineStyle).not.toBe("none");
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
    expect(focus.outlineOffset).toBeGreaterThanOrEqual(2);

    const transition = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return { duration: style.transitionDuration, property: style.transitionProperty };
    });
    expect(durationMs(transition.duration)).toBeGreaterThan(0);
    expect(durationMs(transition.duration)).toBeLessThanOrEqual(400);
    expect(transition.property).not.toMatch(/(?:^|,\s*)(?:all|width|height|margin|top|left|right|bottom)(?:,|$)/i);
  });

  test("live runtime mobile burger opens a keyboard-usable viewport-contained drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(liveDocument(runtimeCss), { waitUntil: "load" });

    const menu = page.locator("[data-mi-site] details.mi-mobile-nav");
    const trigger = menu.locator("summary.mi-burger");
    await expect(trigger).toBeVisible();
    const target = await trigger.boundingBox();
    expect(target?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(target?.height ?? 0).toBeGreaterThanOrEqual(44);

    await trigger.click();
    await expect(menu).toHaveAttribute("open", "");
    const drawer = menu.locator(".mi-mobile-drawer");
    await expect(drawer).toBeVisible();
    const geometry = await drawer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(391);
    expect(geometry.bottom).toBeLessThanOrEqual(845);
    expect(geometry.width).toBeGreaterThan(250);

    const firstLink = drawer.locator("a[href]").first();
    await firstLink.focus();
    const focus = await firstLink.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
    });
    expect(focus.outlineStyle).not.toBe("none");
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);

    const undersized = await page.locator("[data-mi-site] a[href],[data-mi-site] button,[data-mi-site] summary,[data-mi-site] [role=button]").evaluateAll((elements) => elements.filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false;
      return rect.width < 44 || rect.height < 44;
    }).length);
    expect(undersized).toBe(0);

    await trigger.click();
    await expect(menu).not.toHaveAttribute("open", "");
  });

  test("live runtime honors prefers-reduced-motion in computed browser styles", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.setContent(liveDocument(runtimeCss), { waitUntil: "load" });

    const action = page.locator("[data-mi-site] .mi-section__action").first();
    await expect(action).toBeVisible();
    const reduced = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      };
    });
    expect(durationMs(reduced.transitionDuration)).toBeLessThanOrEqual(1);
    expect(durationMs(reduced.animationDuration)).toBeLessThanOrEqual(1);

    const before = await action.evaluate((element) => getComputedStyle(element).transform);
    await action.hover();
    const after = await action.evaluate((element) => getComputedStyle(element).transform);
    expect(after).toBe(before);
  });
});
