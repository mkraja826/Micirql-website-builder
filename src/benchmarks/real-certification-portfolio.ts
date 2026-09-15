import { MULTI_INDUSTRY_BENCHMARKS } from "./multi-industry";
import { PUBLISHED_CERTIFICATION_PORTFOLIO } from "./published-functional-certification-portfolio";

export type RealCertificationPortfolioEntry = {
  industry: (typeof PUBLISHED_CERTIFICATION_PORTFOLIO)[number]["industry"];
  benchmarkName: string;
  minimalBrief: string;
  fixtureId: string;
  candidateCount: 20;
};

// These fixtures are the generation/certification inputs for persisted production
// certification sites. They deliberately live outside generic core so no industry
// specialization leaks into the certification engine.
const FIXTURE_BY_INDUSTRY = {
  healthcare: "pearl",
  restaurant: "restaurant",
  "real-estate": "real-estate",
  "construction-corporate": "construction",
  "saas-professional-services": "saas",
} as const;

export const REAL_CERTIFICATION_PORTFOLIO: readonly RealCertificationPortfolioEntry[] =
  PUBLISHED_CERTIFICATION_PORTFOLIO.map((seed) => ({
    industry: seed.industry,
    benchmarkName: seed.benchmarkName,
    minimalBrief: seed.minimalBrief,
    fixtureId: FIXTURE_BY_INDUSTRY[seed.industry],
    candidateCount: 20,
  }));

export function assertRealCertificationPortfolio() {
  if (REAL_CERTIFICATION_PORTFOLIO.length !== 5) {
    throw new Error("Real certification portfolio must contain exactly five industries.");
  }

  const industries = new Set(REAL_CERTIFICATION_PORTFOLIO.map((entry) => entry.industry));
  const fixtureIds = new Set(REAL_CERTIFICATION_PORTFOLIO.map((entry) => entry.fixtureId));
  if (industries.size !== REAL_CERTIFICATION_PORTFOLIO.length || fixtureIds.size !== REAL_CERTIFICATION_PORTFOLIO.length) {
    throw new Error("Real certification portfolio contains duplicate industry or fixture bindings.");
  }

  const available = new Set(MULTI_INDUSTRY_BENCHMARKS.map((fixture) => fixture.id));
  for (const entry of REAL_CERTIFICATION_PORTFOLIO) {
    if (entry.fixtureId !== "pearl" && !available.has(entry.fixtureId)) {
      throw new Error(`Real certification fixture is unavailable: ${entry.fixtureId}`);
    }
    if (entry.candidateCount !== 20) {
      throw new Error(`Real certification must evaluate 20 candidates: ${entry.industry}`);
    }
  }

  return REAL_CERTIFICATION_PORTFOLIO;
}
