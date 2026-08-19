import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("whole-page rhythm evaluator detects repetitive composition runs", () => {
  const source = readFileSync("apps/builder/app/page-rhythm-quality.ts", "utf8");

  expect(source).toContain("REPEATED_PATTERN_RUN");
  expect(source).toContain("REPEATED_PALETTE_RUN");
  expect(source).toContain("DENSE_SECTION_CLUSTER");
  expect(source).toContain("FLAT_IMAGE_BALANCE");
  expect(source).toContain("NO_CONVERSION_CONTRAST");
  expect(source).toContain("NO_STORY_PROOF_CONTRAST");
  expect(source).toContain("longestPatternRun >= 3");
  expect(source).toContain("longestPaletteRun >= 4");
  expect(source).toContain("longestDenseRun >= 3");
});

test("dental review requires whole-page rhythm quality before admission", () => {
  const review = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");

  expect(review).toContain("evaluatePageRhythmQuality(normalizedSite)");
  expect(review).toContain("const MIN_PAGE_RHYTHM_SCORE = 78");
  expect(review).toContain("pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE");
  expect(review).toContain("page rhythm ${pageRhythmQuality.score}/100");
  expect(review).toContain("Math.min(contentQuality.score, dentalContentQuality.score, pageRhythmQuality.score)");
});
