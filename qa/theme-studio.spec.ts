import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const themeStudio = readFileSync(resolve(process.cwd(), "apps/builder/app/theme-studio.tsx"), "utf8");
const themeCss = readFileSync(resolve(process.cwd(), "apps/builder/app/theme-studio.module.css"), "utf8");
const workspace = readFileSync(resolve(process.cwd(), "apps/builder/app/workspace-client.tsx"), "utf8");

test("site-wide design controls stay on the certified theme.set mutation path", () => {
  expect(workspace).toContain('<ThemeStudio theme={state.site.theme} onChange={theme=>commit({type:"theme.set",theme})}/>');
  expect(themeStudio).toContain('<strong>Site-wide styles</strong>');
  expect(themeStudio).toContain('Changes here update the visual system across every page and section.');
});

test("theme palette and typography presets expose persisted active state accessibly", () => {
  expect(themeStudio).toContain('function sameRecord');
  expect(themeStudio).toContain('const active=sameRecord(theme.brand.colors,p.colors);');
  expect(themeStudio).toContain('const active=sameRecord(theme.brand.typography,t.value);');
  expect(themeStudio).toContain('aria-pressed={theme.family===f}');
  expect(themeStudio).toContain('aria-pressed={active}');
  expect(themeStudio).toContain('className={active?styles.active:undefined}');
  expect(themeCss).toContain('.chips button.active,.palette button.active,.type button.active{');
});

test("density shape and motion explain their site-wide effect without changing persistence", () => {
  expect(themeStudio).toContain('Controls overall spacing and content breathing room.');
  expect(themeStudio).toContain('Controls how sharp or rounded the site feels.');
  expect(themeStudio).toContain('Controls the amount of site-wide interface animation.');
  expect(themeStudio).toContain('patchBrand({density:e.target.value as ThemeConfig["brand"]["density"]})');
  expect(themeStudio).toContain('patchBrand({shape:e.target.value as ThemeConfig["brand"]["shape"]})');
  expect(themeStudio).toContain('patchBrand({motion:e.target.value as ThemeConfig["brand"]["motion"]})');
});
