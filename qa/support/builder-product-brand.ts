import { expect, type Page } from "@playwright/test";

export async function expectProductBrand(page: Page) {
  const lockup = page.locator('[aria-label="MiCirql Website builder"]');
  const mark = lockup.locator('img[src="/micirql-mark.svg"]');

  await expect(lockup.first()).toBeVisible();
  await expect(mark.first()).toBeVisible();
  await expect
    .poll(async () =>
      mark.first().evaluate((image: HTMLImageElement) => ({
        complete: image.complete,
        height: image.naturalHeight,
        width: image.naturalWidth,
      })),
    )
    .toEqual({ complete: true, height: 64, width: 64 });
}
