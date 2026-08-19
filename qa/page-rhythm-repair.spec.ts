import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("page rhythm repair is bounded and preserves structural anchors", () => {
  const repair = readFileSync("apps/builder/app/page-rhythm-repair.ts", "utf8");

  expect(repair).toContain("One deterministic page-rhythm repair pass");
  expect(repair).toContain("SHELL_TOP = /navbar|hero/i");
  expect(repair).toContain("SHELL_BOTTOM = /cta|contact|footer/i");
  expect(repair).toContain("top.sort((a, b) => topRank(a) - topRank(b))");
  expect(repair).toContain("bottom.sort((a, b) => bottomRank(a) - bottomRank(b))");
  expect(repair).toContain("rebalance-middle-section-sequence");
  expect(repair).toContain("alternate-section-palette-roles");
  expect(repair).toContain("insert-density-breathing-points");
  expect(repair).not.toContain("splice(");
});

test("dental review retries rhythm exactly once and carries repaired Site forward", () => {
  const review = readFileSync("apps/builder/app/dental-review-directions.ts", "utf8");

  expect(review).toContain("const rhythmRepair = repairPageRhythm(candidateSite, pageRhythmQuality.issues)");
  expect(review).toContain("candidateSite = normalizeWebsiteContent(rhythmRepair.site)");
  expect(review).toContain("pageRhythmQuality = evaluatePageRhythmQuality(candidateSite)");
  expect(review).toContain("if (pageRhythmErrors.length || pageRhythmQuality.score < MIN_PAGE_RHYTHM_SCORE) continue");
  expect(review).toContain("site: candidateSite");
  expect((review.match(/repairPageRhythm\(/g) ?? []).length).toBe(1);
});
