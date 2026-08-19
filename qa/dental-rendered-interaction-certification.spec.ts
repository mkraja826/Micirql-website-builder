import { expect, test } from "@playwright/test";

const designs = ["DENTAL-NAV-01", "DENTAL-HERO-01", "DENTAL-CTA-01", "DENTAL-CONTACT-01"] as const;

function durationMs(value: string): number {
  return value.split(",").reduce((max, token) => {
    const entry = token.trim();
    const amount = Number.parseFloat(entry) || 0;
    const ms = entry.endsWith("ms") ? amount : amount * 1000;
    return Math.max(max, ms);
  }, 0);
}

test.describe("Dental rendered interaction certification", () => {
  test("desktop CTA exposes visible focus and restrained pointer feedback", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto("/library/DENTAL-HERO-01", { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();

    const root = page.locator('[data-mi-preview-id="DENTAL-HERO-01"]');
    await expect(root).toBeVisible();
    const action = root.locator(".mi-section__action, .mi-conv-btn, .mi-shell-cta").first();
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
      return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth), outlineOffset: Number.parseFloat(style.outlineOffset) };
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

  test("mobile navigation opens as a usable viewport-contained drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto("/library/DENTAL-NAV-01", { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();

    const root = page.locator('[data-mi-preview-id="DENTAL-NAV-01"]');
    await expect(root).toBeVisible();
    const menu = root.locator("details.mi-mobile-nav");
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
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        overflowY: style.overflowY,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.top).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(391);
    expect(geometry.bottom).toBeLessThanOrEqual(845);
    expect(geometry.width).toBeGreaterThan(300);
    expect(["auto", "scroll"]).toContain(geometry.overflowY);

    const firstLink = drawer.locator("a[href]").first();
    if (await firstLink.count()) {
      await firstLink.focus();
      const focus = await firstLink.evaluate((element) => {
        const style = getComputedStyle(element);
        return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
      });
      expect(focus.outlineStyle).not.toBe("none");
      expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
    }

    await trigger.click();
    await expect(menu).not.toHaveAttribute("open", "");
  });

  test("reduced motion collapses generated interaction movement", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const response = await page.goto("/library/DENTAL-HERO-01", { waitUntil: "networkidle" });
    expect(response?.ok()).toBeTruthy();

    const root = page.locator('[data-mi-preview-id="DENTAL-HERO-01"]');
    const action = root.locator(".mi-section__action, .mi-conv-btn, .mi-shell-cta").first();
    await expect(action).toBeVisible();

    const reduced = await action.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transitionDuration: style.transitionDuration, animationDuration: style.animationDuration, animationIterationCount: style.animationIterationCount };
    });
    expect(durationMs(reduced.transitionDuration)).toBeLessThanOrEqual(1);
    expect(durationMs(reduced.animationDuration)).toBeLessThanOrEqual(1);

    const before = await action.evaluate((element) => getComputedStyle(element).transform);
    await action.hover();
    const after = await action.evaluate((element) => getComputedStyle(element).transform);
    expect(after).toBe(before);
  });

  for (const designId of designs) {
    test(`${designId} has no sub-44px visible interactive target on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const response = await page.goto(`/library/${designId}`, { waitUntil: "networkidle" });
      expect(response?.ok()).toBeTruthy();
      const root = page.locator(`[data-mi-preview-id="${designId}"]`);
      await expect(root).toBeVisible();

      const undersized = await root.locator("a[href],button,summary,[role=button]").evaluateAll((elements) => elements.filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false;
        return rect.width < 44 || rect.height < 44;
      }).length);
      expect(undersized).toBe(0);
    });
  }
});
