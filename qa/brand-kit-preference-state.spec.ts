import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const brandKit = readFileSync(resolve(process.cwd(), "apps/builder/app/brand-kit.tsx"), "utf8");

test("logo color preference exposes its selected state accessibly", () => {
  expect(brandKit).toContain('aria-label="Logo color preference"');
  expect(brandKit).toContain('aria-pressed={colorPreference==="keep"}');
  expect(brandKit).toContain('aria-pressed={colorPreference==="match"}');
  expect(brandKit).toContain('className={colorPreference==="keep"?styles.preferenceActive:undefined}');
  expect(brandKit).toContain('className={colorPreference==="match"?styles.preferenceActive:undefined}');
});

test("preference state stays local to the existing safe logo replacement request", () => {
  expect(brandKit).toContain('const [colorPreference,setColorPreference]=useState<ColorPreference>("keep")');
  expect(brandKit).toContain('logoColors,colorPreference,brand');
  expect(brandKit).not.toContain('type:"theme.set"');
});
