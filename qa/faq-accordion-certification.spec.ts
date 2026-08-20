import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { faqAccordionRuntimeScript } from "@micirql/sections";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function durationMs(value: string): number {
  return value.split(",").reduce((max, token) => {
    const entry = token.trim();
    const amount = Number.parseFloat(entry) || 0;
    return Math.max(max, entry.endsWith("ms") ? amount : amount * 1000);
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

function item(id: string, question: string, answer: string) {
  return `<details id="${id}" class="mi-faq-item" data-mi-faq-item>
    <summary id="${id}-question" class="mi-faq-summary" data-mi-faq-summary aria-controls="${id}-answer" aria-expanded="false">
      <span class="mi-faq-question">${question}</span><span class="mi-faq-icon" aria-hidden="true">+</span>
    </summary>
    <div id="${id}-answer" class="mi-faq-answer" data-mi-faq-panel role="region" aria-labelledby="${id}-question"><p>${answer}</p></div>
  </details>`;
}

function faqDocument(css: string, mode: "single" | "multi" = "single") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>
  <body><main data-mi-site style="--mi-color-primary:#5b45ff;--mi-color-accent:#6d59ff;--mi-color-border:#d9d9e3;--mi-color-surface:#fff;--mi-color-surface-elevated:#fff;--mi-color-text:#17171d;--mi-color-text-muted:#676774;--mi-color-secondary:#17171d;--mi-color-secondary-contrast:#fff;--mi-radius-card:1rem">
    <section class="mi-section mi-faq-section mi-faq-section--stacked">
      <div class="mi-container">
        <div class="mi-faq-list" data-mi-faq data-mi-faq-mode="${mode}" data-mi-faq-group="faq-implant-questions-1">
          ${item("faq-implant-questions-1-first-visit-1", "What happens at the first visit?", "We review your goals, oral health and suitable next steps before treatment is confirmed.")}
          ${item("faq-implant-questions-1-healing-time-2", "How long does healing take?", "Healing varies by patient and procedure. Your clinician will explain the expected stages for your case.")}
          ${item("faq-implant-questions-1-costs-3", "How are costs explained?", "You receive a treatment plan with the proposed stages and applicable fees before proceeding.")}
        </div>
      </div>
    </section>
  </main>${faqAccordionRuntimeScript()}</body></html>`;
}

let runtimeCss = "";

test.beforeAll(async () => {
  runtimeCss = await generatedLiveRuntimeCss();
  expect(runtimeCss).toContain("packages/sections/src/faq-accordion.css");
  expect(runtimeCss).toContain(".mi-faq-summary");
});

test.describe("FAQ accordion accessibility and navigation", () => {
  test("single mode keeps native open state and aria-expanded synchronized", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.setContent(faqDocument(runtimeCss, "single"), { waitUntil: "load" });

    const items = page.locator("details[data-mi-faq-item]");
    const firstSummary = items.nth(0).locator("summary");
    const secondSummary = items.nth(1).locator("summary");

    await firstSummary.focus();
    await page.keyboard.press("Enter");
    await expect(items.nth(0)).toHaveAttribute("open", "");
    await expect(firstSummary).toHaveAttribute("aria-expanded", "true");
    await expect(items.nth(0)).toHaveAttribute("data-mi-faq-state", "open");

    await secondSummary.focus();
    await page.keyboard.press("Enter");
    await expect(items.nth(1)).toHaveAttribute("open", "");
    await expect(secondSummary).toHaveAttribute("aria-expanded", "true");
    await expect(items.nth(0)).not.toHaveAttribute("open", "");
    await expect(firstSummary).toHaveAttribute("aria-expanded", "false");
    await expect(items.nth(0)).toHaveAttribute("data-mi-faq-state", "closed");
  });

  test("ArrowUp ArrowDown Home and End move focus without changing disclosure state", async ({ page }) => {
    await page.setContent(faqDocument(runtimeCss, "single"), { waitUntil: "load" });
    const summaries = page.locator("[data-mi-faq-summary]");

    await summaries.nth(0).focus();
    await page.keyboard.press("ArrowDown");
    await expect(summaries.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(summaries.nth(2)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(summaries.nth(0)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(summaries.nth(2)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(summaries.nth(0)).toBeFocused();

    expect(await page.locator("details[data-mi-faq-item][open]").count()).toBe(0);
  });

  test("multi mode allows independent disclosures while keeping ARIA accurate", async ({ page }) => {
    await page.setContent(faqDocument(runtimeCss, "multi"), { waitUntil: "load" });
    const items = page.locator("details[data-mi-faq-item]");

    await items.nth(0).locator("summary").click();
    await items.nth(1).locator("summary").click();
    await expect(items.nth(0)).toHaveAttribute("open", "");
    await expect(items.nth(1)).toHaveAttribute("open", "");
    await expect(items.nth(0).locator("summary")).toHaveAttribute("aria-expanded", "true");
    await expect(items.nth(1).locator("summary")).toHaveAttribute("aria-expanded", "true");
  });

  test("deep links open the addressed answer and enforce single mode", async ({ page }) => {
    await page.route("https://clinic.test/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/html", body: faqDocument(runtimeCss, "single") });
    });
    await page.goto("https://clinic.test/#faq-implant-questions-1-healing-time-2", { waitUntil: "load" });

    const target = page.locator("#faq-implant-questions-1-healing-time-2");
    await expect(target).toHaveAttribute("open", "");
    await expect(target.locator("summary")).toHaveAttribute("aria-expanded", "true");
    expect(await page.locator("details[data-mi-faq-item][open]").count()).toBe(1);
  });

  test("mobile summaries are touch-safe, overflow-safe and reduced-motion compliant", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(faqDocument(runtimeCss, "single"), { waitUntil: "load" });

    const summaries = page.locator("[data-mi-faq-summary]");
    for (let index = 0; index < await summaries.count(); index += 1) {
      const box = await summaries.nth(index).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    const overflow = await page.locator("[data-mi-faq]").evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await summaries.first().click();
    const iconTransition = await page.locator(".mi-faq-icon").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(durationMs(iconTransition)).toBeLessThanOrEqual(1);
  });
});
