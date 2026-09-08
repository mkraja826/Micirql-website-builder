import { expect, test } from "@playwright/test";
import { buildAcceptedPearlSite } from "./pearl-v3-fixture";

const STORAGE_KEY = "micirql:qa-render-certification-site";
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=", "base64");

test("Pearl accepted V3 draft earns rendered certification from the production browser certifier", async ({ page }) => {
  const generated = buildAcceptedPearlSite();
  expect(generated.acceptance.ready, generated.acceptance.blockers.join("\n")).toBe(true);

  await page.route("https://media.micirql.test/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "image/png", body: PNG_1X1 });
  });

  await page.goto("/__qa/render-certification");
  await page.evaluate(({ key, site }) => window.sessionStorage.setItem(key, JSON.stringify(site)), { key: STORAGE_KEY, site: generated.site });
  await page.reload();

  const harness = page.getByTestId("render-certification-harness");
  await expect(harness).toHaveAttribute("data-status", "complete", { timeout: 90_000 });
  const raw = await page.getByTestId("render-certification-result").textContent();
  const results = JSON.parse(raw || "[]") as Array<{ direction: { site: unknown }; passed: boolean; repaired: boolean; failures: string[] }>;

  expect(results).toHaveLength(1);
  expect(results[0]?.passed, results[0]?.failures.join("\n")).toBe(true);
  expect(results[0]?.failures).toEqual([]);
  expect(results[0]?.direction.site).toBeTruthy();
});
