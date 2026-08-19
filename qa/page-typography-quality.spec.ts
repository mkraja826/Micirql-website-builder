import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("page typography evaluator protects semantic hierarchy", () => {
  const source = readFileSync("apps/builder/app/page-typography-quality.ts", "utf8");
  expect(source).toContain("HERO_TITLE_EXTREME");
  expect(source).toContain("SECTION_TITLE_TOO_LONG");
  expect(source).toContain("CARD_TITLE_TOO_LONG");
  expect(source).toContain("PARAGRAPH_TOO_DENSE");
  expect(source).toContain("CTA_LABEL_TOO_LONG");
  expect(source).toContain("EYEBROW_TOO_LONG");
  expect(source).toContain("TYPOGRAPHY_FONT_ROLE_MISSING");
  expect(source).toContain("heroTitleWords > 16");
  expect(source).toContain("longestSectionTitleWords > 14");
});

test("dental review requires page typography quality before admission", () => {
  const review = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");
  expect(review).toContain("const MIN_PAGE_TYPOGRAPHY_SCORE = 82");
  expect(review).toContain("evaluatePageTypographyQuality(candidateSite)");
  expect(review).toContain("pageTypographyQuality.score < MIN_PAGE_TYPOGRAPHY_SCORE");
  expect(review).toContain("page typography ${pageTypographyQuality.score}/100");
  expect(review).toContain("Math.min(contentQuality.score, dentalContentQuality.score, pageRhythmQuality.score, pageTypographyQuality.score)");
});
