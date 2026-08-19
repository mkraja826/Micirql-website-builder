import { expect, test } from "@playwright/test";
import { summarizeBuildDiagnostics } from "../apps/builder/app/build-diagnostics-summary";

test("summarizes success recovery failure fallback duration and quality", () => {
  const summary = summarizeBuildDiagnostics([
    { outcome: "success", duration_ms: 1000, fallback_count: 0, quality_score: 90 },
    { outcome: "recovered", duration_ms: 3000, fallback_count: 1, quality_score: 84 },
    { outcome: "failed", duration_ms: 2000, fallback_count: 2, quality_score: null },
  ]);

  expect(summary).toEqual({
    total: 3,
    success: 1,
    recovered: 1,
    failed: 1,
    fallbackBuilds: 2,
    averageDurationMs: 2000,
    averageQualityScore: 87,
  });
});

test("empty diagnostics remain stable", () => {
  expect(summarizeBuildDiagnostics([])).toEqual({
    total: 0,
    success: 0,
    recovered: 0,
    failed: 0,
    fallbackBuilds: 0,
    averageDurationMs: 0,
    averageQualityScore: null,
  });
});
