import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("builder preview includes persisted page typography repair CSS", () => {
  const persisted = readFileSync("apps/builder/app/persisted-first-screen-repair.ts", "utf8");
  const typography = readFileSync("apps/builder/app/page-typography-repair.ts", "utf8");
  const preview = readFileSync("apps/builder/app/renderer-preview.tsx", "utf8");

  expect(persisted).toContain('import { persistedPageTypographyRepairCss } from "./page-typography-repair"');
  expect(persisted).toContain("const typographyCss = persistedPageTypographyRepairCss(site, path)");
  expect(persisted).toContain('[firstScreenCss, typographyCss]');
  expect(typography).toContain('const root = ":where(body,.renderer-preview-document)"');
  expect(preview).toContain("persistedFirstScreenRepairCss(site, viewport, path)");
  expect(preview).toContain("data-mi-persisted-first-screen-repair");
});

test("published live runtime emits the same persisted typography repair CSS", () => {
  const live = readFileSync("packages/live-runtime/src/index.ts", "utf8");

  expect(live).toContain("export function livePageTypographyRepair(site: Site, path: string)");
  expect(live).toContain("const typographyRepair = livePageTypographyRepair(site, path)");
  expect(live).toContain("data-mi-persisted-page-typography-repair");
  expect(live).toContain('data-mi-page-typography-repair="1"');
  expect(live).toContain("pageDocument(prepared.value.seo, content, brandMeta, firstScreenRepair, typographyRepair)");
});

test("typography repair remains presentation-only across preview and production", () => {
  const typography = readFileSync("apps/builder/app/page-typography-repair.ts", "utf8");

  expect(typography).toContain("never rewrites copy");
  expect(typography).toContain("changes font");
  expect(typography).not.toContain("font-family:");
  expect(typography).not.toContain("splice(");
});
