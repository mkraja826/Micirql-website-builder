import { expect, test } from "@playwright/test";

const navbarDesigns = ["MIN-NAV-001", "COR-NAV-001", "LUX-NAV-001"] as const;

for (const designId of navbarDesigns) {
  test(`${designId} mobile navigation is operable`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`/library/${designId}`, { waitUntil: "networkidle" });
    expect(response?.ok(), `${designId} preview must load`).toBeTruthy();

    const root = page.locator(`[data-mi-preview-id="${designId}"]`);
    await expect(root).toBeVisible();

    const menu = root.locator("details.mi-mobile-nav");
    const trigger = menu.locator("summary.mi-burger");
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-label", /navigation/i);
    expect(await menu.evaluate((element) => (element as HTMLDetailsElement).open)).toBeFalsy();

    await trigger.click();
    expect(await menu.evaluate((element) => (element as HTMLDetailsElement).open)).toBeTruthy();
    const drawer = menu.locator(".mi-mobile-drawer");
    await expect(drawer).toBeVisible();

    const invalidLinks = await drawer.locator("a").evaluateAll((links) => links.filter((link) => {
      const href = link.getAttribute("href")?.trim() ?? "";
      return !href || href === "#" || /^(?:javascript|data|file|vbscript):/i.test(href);
    }).length);
    expect(invalidLinks, "mobile drawer links need safe destinations").toBe(0);

    await trigger.click();
    expect(await menu.evaluate((element) => (element as HTMLDetailsElement).open)).toBeFalsy();
  });
}

test("certified contact section exposes usable form controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/library/MIN-CONT-001", { waitUntil: "networkidle" });
  expect(response?.ok(), "contact preview must load").toBeTruthy();

  const root = page.locator('[data-mi-preview-id="MIN-CONT-001"]');
  await expect(root).toBeVisible();
  const controls = root.locator("input:not([type=hidden]), select, textarea, button[type=submit]");
  expect(await controls.count(), "contact section should expose interactive form controls").toBeGreaterThan(0);

  const unusable = await controls.evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height < 44;
  }).length);
  expect(unusable, "visible form controls need mobile-sized interaction targets").toBe(0);
});
