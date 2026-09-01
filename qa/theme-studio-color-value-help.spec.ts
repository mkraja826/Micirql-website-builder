import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const themeStudio = readFileSync(resolve(process.cwd(), "apps/builder/app/theme-studio.tsx"), "utf8");

test("fine tune color pickers expose their current displayed values", () => {
  expect(themeStudio).toContain('id="theme-primary-value"');
  expect(themeStudio).toContain('aria-describedby="theme-primary-value"');
  expect(themeStudio).toContain('id="theme-accent-value"');
  expect(themeStudio).toContain('aria-describedby="theme-accent-value"');
  expect(themeStudio).toContain('id="theme-background-value"');
  expect(themeStudio).toContain('aria-describedby="theme-background-value"');
});
