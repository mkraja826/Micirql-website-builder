import {
  PUBLISHED_CERTIFICATION_VIEWPORTS,
  type PublishedFunctionalCertificationCase,
} from "./functional-certification";
import type {
  PublishedBrowserCertificationEvidence,
  PublishedBrowserEvidenceProvider,
} from "./functional-certification-runner";

export type PublishedBrowserPageObservation = {
  url: string;
  status: number;
  versionId: string | null;
  horizontalOverflow: boolean;
  navigationTargets: readonly string[];
  consoleErrors: readonly string[];
  failedRequests: readonly string[];
};

export type PublishedBrowserViewportObservation = {
  width: number;
  height: number;
  pages: readonly PublishedBrowserPageObservation[];
};

export type PublishedBrowserProbe = (input: {
  testCase: PublishedFunctionalCertificationCase;
  expectedVersionId: string;
  width: number;
  height: number;
}) => Promise<PublishedBrowserViewportObservation>;

function normalizeSlug(slug: string): string {
  return slug.trim().replace(/^\/+|\/+$/g, "") || "home";
}

function pageMatchesExpectedVersion(
  page: PublishedBrowserPageObservation,
  expectedVersionId: string,
): boolean {
  return page.status >= 200 && page.status < 400 && page.versionId === expectedVersionId;
}

export function createPublishedBrowserEvidenceProvider(
  probe: PublishedBrowserProbe,
): PublishedBrowserEvidenceProvider {
  return async (testCase, expectedVersionId): Promise<PublishedBrowserCertificationEvidence> => {
    const observations = await Promise.all(
      PUBLISHED_CERTIFICATION_VIEWPORTS.map(({ width, height }) =>
        probe({ testCase, expectedVersionId, width, height }),
      ),
    );

    if (observations.length !== PUBLISHED_CERTIFICATION_VIEWPORTS.length) {
      throw new Error(`Browser certification returned an incomplete viewport matrix for ${testCase.industry}.`);
    }

    const expectedSlugs = testCase.pageSlugs.map(normalizeSlug);
    const allPages = observations.flatMap((observation) => observation.pages);

    const responsive = observations.every(
      (observation, index) =>
        observation.width === PUBLISHED_CERTIFICATION_VIEWPORTS[index].width &&
        observation.height === PUBLISHED_CERTIFICATION_VIEWPORTS[index].height &&
        observation.pages.length >= expectedSlugs.length &&
        observation.pages.every(
          (page) =>
            pageMatchesExpectedVersion(page, expectedVersionId) &&
            !page.horizontalOverflow &&
            page.consoleErrors.length === 0,
        ),
    );

    const deepLinks = observations.every((observation) =>
      expectedSlugs.every((slug) =>
        observation.pages.some(
          (page) =>
            pageMatchesExpectedVersion(page, expectedVersionId) &&
            new URL(page.url).pathname.replace(/^\/+|\/+$/g, "").endsWith(slug === "home" ? "" : slug),
        ),
      ),
    );

    const navigation = observations.every((observation) => {
      const targets = new Set(observation.pages.flatMap((page) => page.navigationTargets.map(normalizeSlug)));
      return expectedSlugs.filter((slug) => slug !== "home").every((slug) => targets.has(slug));
    });

    const forbiddenRuntimeDependencies = /generate|generation|candidate|art-director|media-provider|openai|anthropic|gemini/i;
    const generationIndependence = allPages.every(
      (page) =>
        pageMatchesExpectedVersion(page, expectedVersionId) &&
        page.failedRequests.every((request) => !forbiddenRuntimeDependencies.test(request)),
    );

    return { navigation, deepLinks, responsive, generationIndependence };
  };
}
