import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { seedSectionCatalog } from "@micirql/sections";

const requiredWidths = [320, 360, 390, 430, 1280] as const;
const full = process.env.MI_QA_FULL === "1";
const core = process.env.MI_QA_CORE === "1";
// Full certification uses this same protocol across every catalog entry.
// This is the incremental JavaScript budget for a section route, excluding the
// Next.js preview shell/framework that every QA page has to load.
const sectionClientJsBudgetBytes = 180 * 1024;
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

        // Establish the preview application's framework/shell baseline first.
        // A component should only be charged for JavaScript introduced by its
        // library route, not for React/Next chunks shared by every preview.
        await page.goto("/", { waitUntil: "networkidle" });
        const baselineJsUrls = new Set(await page.evaluate(() =>
          performance
            .getEntriesByType("resource")
            .filter((resource) => resource.name.includes("/_next/") && resource.name.includes(".js"))
            .map((resource) => resource.name),
        ));

        const response = await page.goto(`/library/${entry.id}`, { waitUntil: "networkidle" });
        const routePassed = Boolean(response?.ok());
        const root = page.locator(`[data-mi-preview-id="${entry.id}"]`);
        const rootVisible = await root.isVisible().catch(() => false);

        // Measure overflow of the exported section itself. A child with its own
        // overflow-x:auto (for example an intentional carousel/rail) is contained
        // by that child and must not count as page-level horizontal overflow.
        const overflowPx = rootVisible
          ? await root.evaluate((element) => {
              const viewportWidth = window.innerWidth;
              const rect = element.getBoundingClientRect();
              return Math.max(
                0,
                Math.ceil(element.scrollWidth - element.clientWidth),
                Math.ceil(-rect.left),
                Math.ceil(rect.right - viewportWidth),
              );
            })
          : 1;

        // Section certification must measure only the section under test. Next.js
        // dev tooling may inject controls elsewhere in the document that are not
        // part of the exported section and must not affect component evidence.
        const undersizedTargets = await root.locator("a, button, summary, input, select, textarea").evaluateAll((elements) =>
          elements
            .filter((element) => {
              if (element.getAttribute("aria-hidden") === "true") return false;
              if (element instanceof HTMLInputElement && element.type === "hidden") return false;
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
            })
            .filter((element) => {
              const isChoice = element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio");
              const target = isChoice ? element.closest("label") ?? element : element;
              const rect = target.getBoundingClientRect();
              return rect.width < 44 || rect.height < 44;
            })
            .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 40) ?? "" })),
        );

        const imagesWithoutAlt = await root.locator("img:not([alt])").count();
        const unlabeledControls = await root.locator("input:not([type=hidden]), select, textarea").evaluateAll((elements) =>
          elements.filter((element) => {
            if (element.getAttribute("aria-hidden") === "true") return false;
            const id = element.getAttribute("id");
            const ariaLabel = element.getAttribute("aria-label");
            const ariaLabelledBy = element.getAttribute("aria-labelledby");
            const wrappedByLabel = Boolean(element.closest("label"));
            const hasForLabel = Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
            return !ariaLabel && !ariaLabelledBy && !wrappedByLabel && !hasForLabel;
          }).length,
        );

        const invalidActions = await root.locator("a, button").evaluateAll((elements) =>
          elements.filter((element) => {
            if (element instanceof HTMLAnchorElement) {
              const href = element.getAttribute("href")?.trim();
              return !href || href === "#" || href.toLowerCase().startsWith("javascript:");
            }
            return false;
          }).length,
        );

        const sectionClientJsBytes = await page.evaluate((baselineUrls) => {
          const baseline = new Set(baselineUrls);
          const byUrl = new Map<string, number>();
          for (const resource of performance.getEntriesByType("resource")) {
            if (!resource.name.includes("/_next/") || !resource.name.includes(".js") || baseline.has(resource.name)) continue;
            const timing = resource as PerformanceResourceTiming;
            const bytes = timing.transferSize || timing.encodedBodySize || 0;
            byUrl.set(resource.name, Math.max(byUrl.get(resource.name) ?? 0, bytes));
          }
          return [...byUrl.values()].reduce((sum, bytes) => sum + bytes, 0);
        }, [...baselineJsUrls]);

        // Only visible text can clip for a user. Responsive shells deliberately
        // keep desktop actions/links in the DOM with display:none on mobile; those
        // nodes can retain a non-zero scrollWidth while clientWidth is zero and
        // must not be reported as visible text overflow.
        const textOverflowCount = rootVisible
          ? await root.locator("h1,h2,h3,p,a,button").evaluateAll((elements) =>
              elements.filter((element) => {
                const style = getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false;
                return element.scrollWidth > element.clientWidth + 2;
              }).length,
            )
          : 1;

        const passed = routePassed
          && rootVisible
          && overflowPx <= 1
          && undersizedTargets.length === 0
          && imagesWithoutAlt === 0
          && unlabeledControls === 0
          && invalidActions === 0
          && textOverflowCount === 0
          && sectionClientJsBytes <= sectionClientJsBudgetBytes;

        const screenshotPath = testInfo.outputPath(`${entry.id}-${width}.png`);
        if (width === 390 || width === 1280) {
          await page.screenshot({ fullPage: true, path: screenshotPath });
          await testInfo.attach(`${entry.id}-${width}`, { path: screenshotPath, contentType: "image/png" });
        }

        // Always persist evidence before assertions so failed QA runs still
        // produce an actionable certification report.
        const evidenceDirectory = path.join(process.cwd(), "test-results", "evidence-raw");
        await mkdir(evidenceDirectory, { recursive: true });
        await writeFile(
          path.join(evidenceDirectory, `${entry.id}-${width}.json`),
          JSON.stringify({
            designId: entry.id,
            version: entry.version,
            width,
            passed,
            routePassed,
            rootVisible,
            overflowPx,
            undersizedTargets: undersizedTargets.length,
            missingAltImages: imagesWithoutAlt,
            unlabeledControls,
            invalidActions,
            textOverflowCount,
            clientJsKb: Math.round((sectionClientJsBytes / 1024) * 10) / 10,
            clientJsMeasurement: "incremental-over-preview-shell",
            accessibilityPassed: imagesWithoutAlt === 0 && unlabeledControls === 0,
            functionalityPassed: routePassed && rootVisible && invalidActions === 0,
            performancePassed: sectionClientJsBytes <= sectionClientJsBudgetBytes,
          }, null, 2),
          "utf8",
        );

        expect(routePassed, "section preview route must load").toBeTruthy();
        expect(rootVisible, "section preview root must be visible").toBeTruthy();
        expect(overflowPx, "horizontal overflow must be zero").toBeLessThanOrEqual(1);
        expect(undersizedTargets, `touch targets under 44px: ${JSON.stringify(undersizedTargets)}`).toEqual([]);
        expect(imagesWithoutAlt, "all images require alt attributes").toBe(0);
        expect(unlabeledControls, "form controls require accessible labels").toBe(0);
        expect(invalidActions, "interactive actions must have a valid destination").toBe(0);
        expect(sectionClientJsBytes, "incremental section JavaScript must remain within MiCirql budget").toBeLessThanOrEqual(sectionClientJsBudgetBytes);
        expect(textOverflowCount, "text must not clip horizontally").toBe(0);
      });
    }
  });
}
