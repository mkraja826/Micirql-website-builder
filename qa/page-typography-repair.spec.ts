import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("page typography repair is presentation-only and bounded", () => {
  const repair = readFileSync("apps/builder/app/page-typography-repair.ts", "utf8");
  expect(repair).toContain("One bounded typography repair pass");
  expect(repair).toContain("constrain-section-heading-measure");
  expect(repair).toContain("constrain-card-title-measure");
  expect(repair).toContain("constrain-copy-measure");
  expect(repair).toContain("stabilize-action-typography");
  expect(repair).toContain("constrain-eyebrow-measure");
  expect(repair).toContain("pageTypographyRepair");
  expect(repair).not.toContain("font-family:");
});

test("dental review retries typography exactly once and carries repaired Site forward", () => {
  const review = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");
  expect(review).toContain("const typographyRepair = repairPageTypography(candidateSite, pageTypographyQuality.issues)");
  expect(review).toContain("candidateSite = typographyRepair.site");
  expect(review).toContain("pageTypographyQuality = evaluatePageTypographyQuality(candidateSite)");
  expect(review).toContain("if (pageTypographyErrors.length || pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE) continue");
  expect(review).toContain("site: candidateSite");
  expect((review.match(/repairPageTypography\(/g) ?? []).length).toBe(1);
});
