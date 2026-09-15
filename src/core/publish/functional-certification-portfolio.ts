import type { PublishedFunctionalCertificationCase } from "./functional-certification";

export type PublishedCertificationPortfolioSeed = {
  industry: PublishedFunctionalCertificationCase["industry"];
  benchmarkName: string;
  minimalBrief: string;
  pageSlugs: readonly string[];
  expectedCapabilityKeys: readonly string[];
};

// Permanent cross-industry certification portfolio. These are benchmark identities,
// not generated business facts. Runtime site/version UUIDs are supplied by the
// certification environment after materialization and publication.
export const PUBLISHED_CERTIFICATION_PORTFOLIO = [
  {
    industry: "healthcare",
    benchmarkName: "Pearl Dental",
    minimalBrief: "Pearl Dental, Hyderabad",
    pageSlugs: ["home"],
    expectedCapabilityKeys: ["lead.request@1"],
  },
  {
    industry: "restaurant",
    benchmarkName: "Saffron Table",
    minimalBrief: "Saffron Table, Hyderabad — contemporary Indian restaurant",
    pageSlugs: ["home"],
    expectedCapabilityKeys: ["lead.request@1"],
  },
  {
    industry: "real-estate",
    benchmarkName: "Northstar Realty",
    minimalBrief: "Northstar Realty, Hyderabad — residential property advisory",
    pageSlugs: ["home"],
    expectedCapabilityKeys: ["lead.request@1"],
  },
  {
    industry: "construction-corporate",
    benchmarkName: "Apex Infra",
    minimalBrief: "Apex Infra — construction and infrastructure company",
    pageSlugs: ["home"],
    expectedCapabilityKeys: ["lead.request@1"],
  },
  {
    industry: "saas-professional-services",
    benchmarkName: "OrbitOps",
    minimalBrief: "OrbitOps — B2B operations software company",
    pageSlugs: ["home"],
    expectedCapabilityKeys: ["lead.request@1"],
  },
] as const satisfies readonly PublishedCertificationPortfolioSeed[];

export type PublishedCertificationEnvironmentBinding = {
  industry: PublishedFunctionalCertificationCase["industry"];
  siteId: string;
  versionOneId: string;
  versionTwoId: string;
};

export function bindPublishedCertificationPortfolio(
  bindings: readonly PublishedCertificationEnvironmentBinding[],
): readonly PublishedFunctionalCertificationCase[] {
  const byIndustry = new Map(bindings.map((binding) => [binding.industry, binding]));

  return PUBLISHED_CERTIFICATION_PORTFOLIO.map((seed) => {
    const binding = byIndustry.get(seed.industry);
    if (!binding) throw new Error(`Missing published certification environment binding: ${seed.industry}`);

    return {
      industry: seed.industry,
      siteId: binding.siteId,
      versionOneId: binding.versionOneId,
      versionTwoId: binding.versionTwoId,
      pageSlugs: seed.pageSlugs,
      expectedCapabilityKeys: seed.expectedCapabilityKeys,
    };
  });
}
