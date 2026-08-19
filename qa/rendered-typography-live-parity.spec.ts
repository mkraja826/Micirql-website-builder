import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("persisted rendered typography is consumed by builder preview", () => {
  const persistence = readFileSync("apps/builder/app/persisted-rendered-typography-repair.ts", "utf8");
  const previewBridge = readFileSync("apps/builder/app/persisted-first-screen-repair.ts", "utf8");
  const preview = readFileSync("apps/builder/app/renderer-preview.tsx", "utf8");

  expect(persistence).toContain('const PROP_KEY = "renderedTypographyRepairs"');
  expect(previewBridge).toContain("persistedRenderedTypographyRepairCss");
  expect(previewBridge).toContain("[data-mi-first-screen-repair='1']");
  expect(preview).toContain("persistedFirstScreenRepairCss(site, viewport, path)");
  expect(preview).toContain('data-mi-first-screen-repair={repairCss ? "1" : undefined}');
});

test("persisted rendered typography is mirrored into published responsive CSS", () => {
  const persistence = readFileSync("apps/builder/app/persisted-rendered-typography-repair.ts", "utf8");
  const live = readFileSync("packages/live-runtime/src/index.ts", "utf8");

  expect(persistence).toContain("renderedResponsive");
  expect(persistence).toContain("@media (max-width:430px)");
  expect(persistence).toContain("@media (min-width:431px) and (max-width:1024px)");
  expect(persistence).toContain("@media (min-width:1025px)");
  expect(persistence).toContain("[data-mi-page-typography-repair='1']");
  expect(live).toContain("livePageTypographyRepair(site, path)");
  expect(live).toContain('data-mi-persisted-page-typography-repair');
  expect(live).toContain('data-mi-page-typography-repair=\"1\"');
});

test("rendered typography persistence keeps independent viewport entries", () => {
  const persistence = readFileSync("apps/builder/app/persisted-rendered-typography-repair.ts", "utf8");

  expect(persistence).toContain('for (const viewport of ["mobile", "tablet", "desktop"] as const)');
  expect(persistence).toContain("current[plan.viewport]");
  expect(persistence).toContain("previousResponsive[plan.viewport]");
  expect(persistence).toContain("siteSchema.parse(next)");
});
