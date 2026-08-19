import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("dental review runtime certification includes tablet between mobile and desktop", () => {
  const source = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");

  const mobile = source.indexOf('{ viewport: "mobile" as const, width: 390, foldHeight: 844 }');
  const tablet = source.indexOf('{ viewport: "tablet" as const, width: 768, foldHeight: 1024 }');
  const desktop = source.indexOf('{ viewport: "desktop" as const, width: 1440, foldHeight: 900 }');

  expect(mobile).toBeGreaterThan(-1);
  expect(tablet).toBeGreaterThan(mobile);
  expect(desktop).toBeGreaterThan(tablet);
  expect(source).toContain("viewport={target.viewport}");
  expect(source).toContain('data-mi-certification-viewport={target.viewport}');
});

test("tablet has bounded first-screen and rendered typography repair paths", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  const firstScreenPersistence = readFileSync("apps/builder/app/persisted-first-screen-repair.ts", "utf8");
  const typographyPersistence = readFileSync("apps/builder/app/persisted-rendered-typography-repair.ts", "utf8");

  expect(certifier).toContain("planRenderedFirstScreenRepair");
  expect(certifier).toContain("persistFirstScreenRepair");
  expect(certifier).toContain("planRenderedPageTypographyRepair");
  expect(certifier).toContain("persistRenderedTypographyRepair");
  expect(certifier).toContain('target.viewport === "tablet" ? 4 : 5');
  expect(certifier).toContain("setFirstScreenAttempt(0)");
  expect(certifier).toContain("setTypographyAttempt(0)");

  expect(firstScreenPersistence).toContain('["mobile", "tablet", "desktop"] as const');
  expect(typographyPersistence).toContain('["mobile", "tablet", "desktop"] as const');
});

test("tablet first-screen thresholds are distinct from mobile and desktop", () => {
  const source = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");

  expect(source).toContain("const tablet = width > 430 && width <= 1024");
  expect(source).toContain("const minH1 = mobile ? 28 : tablet ? 34 : 40");
  expect(source).toContain("const maxLines = mobile ? 4 : tablet ? 4 : 3");
  expect(source).toContain("const maxNav = mobile ? 96 : tablet ? 104 : 116");
  expect(source).toContain("const maxHeadlineGap = mobile ? 260 : tablet ? 290 : 320");
});
