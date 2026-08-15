import { expect, test } from "@playwright/test";
import { seedSectionCatalog } from "@micirql/sections";

const requiredMobileWidths = [320, 360, 390, 430] as const;
const desktopWidth = 1280;
const full = process.env.MI_QA_FULL === "1";

const entries = full
  ? seedSectionCatalog
  : seedSectionCatalog.filter((entry) => entry.variant === 1);

const widths = full ? [...requiredMobileWidths, desktopWidth] : [320, 390, desktopWidth];

for (const entry of entries) {
  test.describe(entry.id, () => {
    for (const width of widths) {
      test(`${width}px protocol smoke`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: width >= 1000 ? 900 : 844 });
        const response = await page.goto(`/library/${entry.id}`, { waitUntil: "networkidle" });
        expect(response?.ok()).toBeTruthy();

        const root = page.locator(`[data-mi-preview-id="${entry.id}"]`);
        await expect(root).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, "horizontal overflow must be zero").toBeLessThanOrEqual(1);

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

        if (!full && (width === 390 || width === desktopWidth)) {
          await testInfo.attach(`${entry.id}-${width}`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: "image/png",
          });
        }
      });
    }
  });
}
