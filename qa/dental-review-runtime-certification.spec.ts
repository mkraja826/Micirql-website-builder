import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("dental review withholds raw directions until runtime render certification passes", () => {
  const review = readFileSync("apps/builder/app/first-build-review.tsx", "utf8");
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");

  expect(review).toContain("DentalReviewRenderCertifier");
  expect(review).toContain("certifiedDentalPool");
  expect(review).toContain("const pool = dentalReview ? (certifiedDentalPool ?? []) : rawPool");
  expect(review).toContain(".filter((result) => result.passed)");
  expect(review).toContain("...result.direction");
  expect(review).toContain("snapshot: direction.site");

  expect(certifier).toContain("width: 390");
  expect(certifier).toContain("width: 1440");
  expect(certifier).toContain("planRenderedFirstScreenRepair");
  expect(certifier).toContain("persistFirstScreenRepair(current.site, plan)");
  expect(certifier).toContain("attempt === 0 && plan.required");
  expect(certifier).toContain("passed: false");
});

test("runtime certification does not expose structural failures as CSS repairs", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  const planner = readFileSync("apps/builder/app/rendered-first-screen-repair.ts", "utf8");

  expect(certifier).toContain('failures.push("missing-visible-h1")');
  expect(certifier).toContain('failures.push("missing-visible-hero-cta")');
  expect(planner).toContain("Structural absence is intentionally not \"repaired\" with CSS");
});
