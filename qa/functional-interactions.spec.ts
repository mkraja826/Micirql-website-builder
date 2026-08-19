import { expect, test } from "@playwright/test";
import { seedSectionCatalog } from "@micirql/sections";

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

const actionEntries = seedSectionCatalog.filter((entry) =>
  entry.variant === 1 && ["hero", "cta", "contact", "services", "team"].includes(entry.family),
);

for (const entry of actionEntries) {
  test(`${entry.id} exposes only usable visible actions`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`/library/${entry.id}`, { waitUntil: "networkidle" });
    expect(response?.ok(), `${entry.id} preview must load`).toBeTruthy();

    const root = page.locator(`[data-mi-preview-id="${entry.id}"]`);
    await expect(root).toBeVisible();

    const visibleActions = root.locator("a[href], button").filter({ visible: true });
    const actionCount = await visibleActions.count();
    if (["hero", "cta", "contact"].includes(entry.family)) {
      expect(actionCount, `${entry.id} should expose at least one primary interaction`).toBeGreaterThan(0);
    }

    const unusable = await root.locator("a[href], button").evaluateAll((elements) => elements.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false;
      if (rect.width < 44 || rect.height < 44) return true;

      if (element instanceof HTMLAnchorElement) {
        const href = element.getAttribute("href")?.trim() ?? "";
        return !href || href === "#" || /^(?:javascript|data|file|vbscript):/i.test(href);
      }

      if (element instanceof HTMLButtonElement) {
        return element.disabled || element.getAttribute("aria-disabled") === "true";
      }
      return false;
    }).length);

    expect(unusable, `${entry.id} visible actions need safe destinations, enabled state, and mobile-sized targets`).toBe(0);
  });
}

test("certified contact section exposes usable contact actions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto("/library/MIN-CONT-001", { waitUntil: "networkidle" });
  expect(response?.ok(), "contact preview must load").toBeTruthy();

  const root = page.locator('[data-mi-preview-id="MIN-CONT-001"]');
  await expect(root).toBeVisible();
  const actions = root.locator("a[href], button");
  expect(await actions.count(), "contact section should expose at least one interaction").toBeGreaterThan(0);

  const unusable = await actions.evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height < 44) return true;
    if (element instanceof HTMLAnchorElement) {
      const href = element.getAttribute("href")?.trim() ?? "";
      return !href || href === "#" || /^(?:javascript|data|file|vbscript):/i.test(href);
    }
    return false;
  }).length);
  expect(unusable, "visible contact actions need safe destinations and mobile-sized targets").toBe(0);
});
