import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const themeStudio = readFileSync(resolve(process.cwd(), "apps/builder/app/theme-studio.tsx"), "utf8");

test("layout and motion selects reference their existing helper text", () => {
  expect(themeStudio).toContain('id="theme-density-help"');
  expect(themeStudio).toContain('aria-describedby="theme-density-help"');
  expect(themeStudio).toContain('id="theme-shape-help"');
  expect(themeStudio).toContain('aria-describedby="theme-shape-help"');
  expect(themeStudio).toContain('id="theme-motion-help"');
  expect(themeStudio).toContain('aria-describedby="theme-motion-help"');
});
