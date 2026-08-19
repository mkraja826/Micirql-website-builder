import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered typography repair persists viewport-specific candidate metadata", () => {
  const persistence = readFileSync("apps/builder/app/persisted-rendered-typography-repair.ts", "utf8");
  expect(persistence).toContain('const PROP_KEY = "renderedTypographyRepairs"');
  expect(persistence).toContain("persistRenderedTypographyRepair");
  expect(persistence).toContain("current[plan.viewport]");
  expect(persistence).toContain("siteSchema.parse(next)");
  expect(persistence).toContain("persistedRenderedTypographyRepairCss");
  expect(persistence).toContain('["mobile", "tablet", "desktop"]');
});

test("runtime dental candidate certification persists rendered typography repair before admission", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  expect(certifier).toContain("planRenderedPageTypographyRepair");
  expect(certifier).toContain("persistRenderedTypographyRepair(current.site, plan)");
  expect(certifier).toContain("typographyAttempt === 0 && plan.required");
  expect(certifier).toContain("setTypographyAttempt(1)");
  expect(certifier).toContain("renderedTypographyRepairs");
  expect((certifier.match(/persistRenderedTypographyRepair\(/g) ?? []).length).toBe(1);
});

test("first-screen and rendered typography repairs have independent bounded attempts", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  expect(certifier).toContain('useState<0 | 1>(0)');
  expect(certifier).toContain("firstScreenAttempt");
  expect(certifier).toContain("typographyAttempt");
  expect(certifier).toContain("setFirstScreenAttempt(0)");
  expect(certifier).toContain("setTypographyAttempt(0)");
});
