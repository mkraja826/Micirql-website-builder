import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const themeStudio = readFileSync(resolve(process.cwd(), "apps/builder/app/theme-studio.tsx"), "utf8");

test("Theme Studio region is described by the existing site-wide scope note", () => {
  expect(themeStudio).toContain('role="region" aria-label="Site-wide design studio" aria-describedby="theme-studio-scope"');
  expect(themeStudio).toContain('className={styles.scopeNote} id="theme-studio-scope"');
  expect(themeStudio).toContain('Changes here update the visual system across every page and section.');
});
