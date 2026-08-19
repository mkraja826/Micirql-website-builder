export type BuildDiagnosticRow = {
  outcome?: unknown;
  duration_ms?: unknown;
  fallback_count?: unknown;
  quality_score?: unknown;
};

export function summarizeBuildDiagnostics(rows: readonly BuildDiagnosticRow[]) {
  const qualityScores = rows
    .map((row) => Number(row.quality_score))
    .filter(Number.isFinite);

  return {
    total: rows.length,
    success: rows.filter((row) => row.outcome === "success").length,
    recovered: rows.filter((row) => row.outcome === "recovered").length,
    failed: rows.filter((row) => row.outcome === "failed").length,
    fallbackBuilds: rows.filter((row) => Number(row.fallback_count) > 0).length,
    averageDurationMs: rows.length
      ? Math.round(rows.reduce((sum, row) => sum + finiteNumber(row.duration_ms), 0) / rows.length)
      : 0,
    averageQualityScore: qualityScores.length
      ? Math.round(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
      : null,
  };
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
