import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { seedSectionCatalog } from "@micirql/sections";

const requiredWidths = [320, 360, 390, 430, 1280] as const;
const full = process.env.MI_QA_FULL === "1";
const core = process.env.MI_QA_CORE === "1";
const clientJsBudgetBytes = 180 * 1024;
const coreFamilies = new Set(["hero", "services", "testimonials", "team", "cta", "contact"]);
const coreThemes = new Set(["minimalist", "corporate", "luxury"]);

const entries = full
  ? seedSectionCatalog
  : core
    ? seedSectionCatalog.filter((entry) => coreFamilies.has(entry.family) && coreThemes.has(entry.theme))
    : seedSectionCatalog.filter((entry) => entry.variant === 1);

for (const entry of entries) {
  test.describe(entry.id, () => {
    for (const width of requiredWidths) {
      test(`${width}px protocol smoke`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 });
        const response = await page.goto(`/library/${entry.id}`, { waitUntil: "networkidle" });
        const routePassed = Boolean(response?.ok());
        expect(routePassed).toBeTruthy();

        const root = page.locator(`[data-mi-preview-id="${entry.id}"]`);
        await expect(root).toBeVisible();

        const overflowPx = Math.max(0, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
        expect(overflowPx, "horizontal overflow must be zero").toBeLessThanOrEqual(1);

        const undersizedTargets = await page.locator("a, button, summary, input, select, textarea").evaluateAll((elements) =>
          elements
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
            })
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.width < 44 || rect.height < 44;
            })
            .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 40) ?? "" })),
        );
        expect(undersizedTargets, `touch targets under 44px: ${JSON.stringify(undersizedTargets)}`).toEqual([]);

        const imagesWithoutAlt = await page.locator("img:not([alt])").count();
        expect(imagesWithoutAlt, "all images require alt attributes").toBe(0);

        const unlabeledControls = await page.locator("input:not([type=hidden]), select, textarea").evaluateAll((elements) =>
          elements.filter((element) => {
            const id = element.getAttribute("id");
            const ariaLabel = element.getAttribute("aria-label");
            const ariaLabelledBy = element.getAttribute("aria-labelledby");
            const wrappedByLabel = Boolean(element.closest("label"));
            const hasForLabel = Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
            return !ariaLabel && !ariaLabelledBy && !wrappedByLabel && !hasForLabel;
          }).length,
        );
        expect(unlabeledControls, "form controls require accessible labels").toBe(0);

        const invalidActions = await page.locator("a, button").evaluateAll((elements) =>
          elements.filter((element) => {
            if (element instanceof HTMLAnchorElement) {
              const href = element.getAttribute("href")?.trim();
              return !href || href === "#" || href.toLowerCase().startsWith("javascript:");
            }
            return false;
          }).length,
        );
        expect(invalidActions, "interactive actions must have a valid destination").toBe(0);

        const clientJsBytes = await page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((resource) => resource.name.includes("/_next/") && resource.name.includes(".js"))
            .reduce((sum, resource) => {
              const timing = resource as PerformanceResourceTiming;
              return sum + (timing.transferSize || timing.encodedBodySize || 0);
            }, 0),
        );
        expect(clientJsBytes, "client JavaScript must remain within MiCirql budget").toBeLessThanOrEqual(clientJsBudgetBytes);

        const textOverflowCount = await root.locator("h1,h2,h3,p,a,button").evaluateAll((elements) =>
          elements.filter((element) => element.scrollWidth > element.clientWidth + 2).length,
        );
        expect(textOverflowCount, "text must not clip horizontally").toBe(0);

        const screenshotPath = testInfo.outputPath(`${entry.id}-${width}.png`);
        if (width === 390 || width === 1280) {
          await page.screenshot({ fullPage: true, path: screenshotPath });
          await testInfo.attach(`${entry.id}-${width}`, { path: screenshotPath, contentType: "image/png" });
        }

        const evidenceDirectory = path.join(process.cwd(), "test-results", "evidence-raw");
        await mkdir(evidenceDirectory, { recursive: true });
        await writeFile(
          path.join(evidenceDirectory, `${entry.id}-${width}.json`),
          JSON.stringify({
            designId: entry.id,
            version: entry.version,
            width,
            passed: routePassed && overflowPx <= 1 && undersizedTargets.length === 0 && imagesWithoutAlt === 0 && unlabeledControls === 0 && invalidActions === 0 && textOverflowCount === 0 && clientJsBytes <= clientJsBudgetBytes,
            overflowPx,
            undersizedTargets: undersizedTargets.length,
            missingAltImages: imagesWithoutAlt,
            unlabeledControls,
            invalidActions,
            textOverflowCount,
            clientJsKb: Math.round((clientJsBytes / 1024) * 10) / 10,
            accessibilityPassed: imagesWithoutAlt === 0 && unlabeledControls === 0,
            functionalityPassed: routePassed && invalidActions === 0,
            performancePassed: clientJsBytes <= clientJsBudgetBytes,
          }, null, 2),
          "utf8",
        );
      });
    }
  });
}
