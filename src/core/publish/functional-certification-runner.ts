import type { SitePersistenceRepository } from "../persistence/repository";
import { renderPublicSite } from "./public-runtime";
import {
  assertPublishedCertificationPortfolio,
  assertPublishedCertificationResult,
  type PublishedFunctionalCertificationCase,
  type PublishedFunctionalCertificationResult,
} from "./functional-certification";

export type PublishedCertificationRepositoryFactory = (
  testCase: PublishedFunctionalCertificationCase,
) => SitePersistenceRepository;

export type PublishedBrowserCertificationEvidence = {
  navigation: boolean;
  deepLinks: boolean;
  responsive: boolean;
  generationIndependence: boolean;
};

export type PublishedBrowserEvidenceProvider = (
  testCase: PublishedFunctionalCertificationCase,
  expectedVersionId: string,
) => Promise<PublishedBrowserCertificationEvidence>;

async function certifiesActiveVersion(
  repository: SitePersistenceRepository,
  testCase: PublishedFunctionalCertificationCase,
  expectedVersionId: string,
): Promise<boolean> {
  for (const pageSlug of testCase.pageSlugs) {
    const rendered = await renderPublicSite(repository, {
      siteId: testCase.siteId,
      pageSlug,
    });

    if (!rendered) return false;
    if (rendered.site.versionId !== expectedVersionId) return false;
    if (rendered.runtime.renderedVersionId !== expectedVersionId) return false;
    if (rendered.runtime.publishedVersionId !== expectedVersionId) return false;
    if (rendered.pageSlug !== pageSlug.replace(/^\/+|\/+$/g, "") && pageSlug !== "home") return false;
  }

  return true;
}

export async function certifyPublishedRuntimeCase(
  repository: SitePersistenceRepository,
  testCase: PublishedFunctionalCertificationCase,
  actorId: string,
  browserEvidenceProvider: PublishedBrowserEvidenceProvider,
): Promise<PublishedFunctionalCertificationResult> {
  const initial = await repository.setPublishedVersion({
    siteId: testCase.siteId,
    versionId: testCase.versionOneId,
    actorId,
  });

  const v1 =
    initial.publishedVersionId === testCase.versionOneId &&
    (await certifiesActiveVersion(repository, testCase, testCase.versionOneId));

  const v1Browser = await browserEvidenceProvider(testCase, testCase.versionOneId);

  const forward = await repository.setPublishedVersion({
    siteId: testCase.siteId,
    versionId: testCase.versionTwoId,
    actorId,
  });

  const v2 =
    forward.publishedVersionId === testCase.versionTwoId &&
    forward.previousPublishedVersionId === testCase.versionOneId &&
    (await certifiesActiveVersion(repository, testCase, testCase.versionTwoId));

  const v2Browser = await browserEvidenceProvider(testCase, testCase.versionTwoId);

  const rollback = await repository.setPublishedVersion({
    siteId: testCase.siteId,
    versionId: testCase.versionOneId,
    actorId,
  });

  const rolledBack =
    rollback.publishedVersionId === testCase.versionOneId &&
    rollback.previousPublishedVersionId === testCase.versionTwoId &&
    (await certifiesActiveVersion(repository, testCase, testCase.versionOneId));

  const rollbackBrowser = await browserEvidenceProvider(testCase, testCase.versionOneId);

  const capabilitySite = await repository.loadPublished({ siteId: testCase.siteId });
  const activeCapabilities = new Set(
    capabilitySite?.snapshot.snapshot.capabilities
      .filter((capability) => capability.state === "active")
      .map((capability) => capability.id) ?? [],
  );
  const capabilities = testCase.expectedCapabilityKeys.every((key) => activeCapabilities.has(key));

  const browserEvidence = [v1Browser, v2Browser, rollbackBrowser];
  const checks = {
    publicRuntime: v1 && v2 && rolledBack,
    navigation: browserEvidence.every((evidence) => evidence.navigation),
    deepLinks: browserEvidence.every((evidence) => evidence.deepLinks),
    responsive: browserEvidence.every((evidence) => evidence.responsive),
    capabilities,
    publicationIdentity: v1 && v2 && rolledBack,
    rollbackDeterminism: v1 && v2 && rolledBack,
    generationIndependence: browserEvidence.every((evidence) => evidence.generationIndependence),
  };

  const result: PublishedFunctionalCertificationResult = {
    industry: testCase.industry,
    siteId: testCase.siteId,
    passed: Object.values(checks).every(Boolean),
    checks,
  };

  assertPublishedCertificationResult(result);
  return result;
}

export async function certifyPublishedRuntimePortfolio(
  cases: readonly PublishedFunctionalCertificationCase[],
  actorId: string,
  repositoryFactory: PublishedCertificationRepositoryFactory,
  browserEvidenceProvider: PublishedBrowserEvidenceProvider,
): Promise<readonly PublishedFunctionalCertificationResult[]> {
  assertPublishedCertificationPortfolio(cases);
  if (!actorId.trim()) throw new Error("Published certification requires an authenticated actor identity.");

  const results: PublishedFunctionalCertificationResult[] = [];
  for (const testCase of cases) {
    results.push(
      await certifyPublishedRuntimeCase(
        repositoryFactory(testCase),
        testCase,
        actorId,
        browserEvidenceProvider,
      ),
    );
  }
  return results;
}
