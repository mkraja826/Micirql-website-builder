export const PUBLISHED_CERTIFICATION_INDUSTRIES = [
  "healthcare",
  "restaurant",
  "real-estate",
  "construction-corporate",
  "saas-professional-services",
] as const;

export type PublishedCertificationIndustry =
  (typeof PUBLISHED_CERTIFICATION_INDUSTRIES)[number];

export const PUBLISHED_CERTIFICATION_VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
] as const;

export type PublishedFunctionalCertificationCase = {
  industry: PublishedCertificationIndustry;
  siteId: string;
  versionOneId: string;
  versionTwoId: string;
  pageSlugs: readonly string[];
  expectedCapabilityKeys: readonly string[];
};

export type PublishedFunctionalCertificationResult = {
  industry: PublishedCertificationIndustry;
  siteId: string;
  passed: boolean;
  checks: {
    publicRuntime: boolean;
    navigation: boolean;
    deepLinks: boolean;
    responsive: boolean;
    capabilities: boolean;
    publicationIdentity: boolean;
    rollbackDeterminism: boolean;
    generationIndependence: boolean;
  };
};

export function assertPublishedCertificationPortfolio(
  cases: readonly PublishedFunctionalCertificationCase[],
): void {
  const industries = new Set(cases.map((item) => item.industry));

  for (const industry of PUBLISHED_CERTIFICATION_INDUSTRIES) {
    if (!industries.has(industry)) {
      throw new Error(`Published certification portfolio is missing industry: ${industry}`);
    }
  }

  for (const item of cases) {
    if (!item.siteId.trim() || !item.versionOneId.trim() || !item.versionTwoId.trim()) {
      throw new Error(`Published certification identities are incomplete for ${item.industry}.`);
    }
    if (item.versionOneId === item.versionTwoId) {
      throw new Error(`Published certification requires distinct V1 and V2 for ${item.industry}.`);
    }
    if (item.pageSlugs.length === 0) {
      throw new Error(`Published certification requires at least one public page for ${item.industry}.`);
    }
  }
}

export function assertPublishedCertificationResult(
  result: PublishedFunctionalCertificationResult,
): void {
  const failed = Object.entries(result.checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (!result.passed || failed.length > 0) {
    throw new Error(
      `Published functional certification failed for ${result.industry}: ${failed.join(", ") || "portfolio result"}`,
    );
  }
}
