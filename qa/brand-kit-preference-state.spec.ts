import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const brandKit = readFileSync(resolve(process.cwd(), "apps/builder/app/brand-kit.tsx"), "utf8");

test("logo color preference is exposed as a named group with selected state", () => {
  expect(brandKit).toContain('className={styles.preference} role="group" aria-label="Logo color preference"');
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

test("Brand Kit header status is announced politely", () => {
  expect(brandKit).toContain('className={styles.status} role="status" aria-live="polite"');
  expect(brandKit).toContain('{busy?"Working…":ready?"Ready":"Awaiting logo"}');
});

test("logo and favicon previews are exposed as a named group", () => {
  expect(brandKit).toContain('className={styles.assetGrid} role="group" aria-label="Logo and favicon previews"');
});

test("social share card preview is exposed as a named group", () => {
  expect(brandKit).toContain('className={styles.social} role="group" aria-label="Social share card preview"');
});

test("approved website palette is exposed as a named group", () => {
  expect(brandKit).toContain('className={styles.palette} role="group" aria-label="Approved website palette"');
});

test("brand metadata is exposed as a named group", () => {
  expect(brandKit).toContain('className={styles.details} role="group" aria-label="Brand asset details"');
});

test("brand history is exposed as a named group", () => {
  expect(brandKit).toContain('className={styles.history} role="group" aria-label="Brand history"');
});

test("brand history restore actions identify the saved version accessibly", () => {
  expect(brandKit).toContain('aria-label={`Restore ${historyReason(entry.reason)} from ${formatHistoryDate(entry.createdAt)}`}');
  expect(brandKit).toContain('onClick={()=>restoreBrand(entry)}');
  expect(brandKit).toContain('disabled={busy}>Restore</button>');
});
