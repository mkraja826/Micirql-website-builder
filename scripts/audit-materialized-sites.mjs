import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data','salon','gym','manufacturing','automotive-service','architecture-studio','ngo','ecommerce','consultancy','travel-agency','home-services','events'];
const candidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);

fs.mkdirSync('artifacts/materialized-site-audit', { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), candidates: [], summary: {} };

async function inspect(page, fixture, candidateId) {
  const response = await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${candidateId}/materialized`, { waitUntil: 'networkidle' });
  const status = response?.status() ?? 0;
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      fixture: main?.getAttribute('data-benchmark-fixture') ?? '',
      candidateId: main?.getAttribute('data-candidate-id') ?? '',
      siteId: main?.getAttribute('data-site-id') ?? '',
      revision: Number(main?.getAttribute('data-site-revision') ?? 0),
      status: main?.getAttribute('data-site-status') ?? '',
      fingerprint: main?.getAttribute('data-site-fingerprint') ?? '',
      sourceKey: main?.getAttribute('data-site-source-key') ?? '',
      sourceCandidate: main?.getAttribute('data-site-source-candidate') ?? '',
      pageCount: Number(main?.getAttribute('data-site-page-count') ?? 0),
      contentPageCount: Number(main?.getAttribute('data-site-content-page-count') ?? 0),
      contentSectionCount: Number(main?.getAttribute('data-site-content-section-count') ?? 0),
      seoTitle: main?.getAttribute('data-site-seo-title') ?? '',
      capabilityCount: Number(main?.getAttribute('data-site-capability-count') ?? 0),
      mediaCount: Number(main?.getAttribute('data-site-media-count') ?? -1),
      pages: [...document.querySelectorAll('[data-site-page]')].map((node) => ({
        slug: node.getAttribute('data-site-page') ?? '',
        sectionCount: Number(node.getAttribute('data-site-section-count') ?? 0),
        contentSectionCount: Number(node.getAttribute('data-site-content-section-count') ?? 0),
      })),
    };
  });
  return { status, ...metrics };
}

for (const fixture of fixtures) {
  for (const candidateId of candidateIds) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    const first = await inspect(page, fixture, candidateId);
    const second = await inspect(page, fixture, candidateId);
    const failures = [];

    if (first.status < 200 || first.status >= 400) failures.push(`HTTP ${first.status}`);
    if (first.fixture !== fixture) failures.push(`fixture mismatch: ${first.fixture || 'missing'}`);
    if (first.candidateId !== candidateId) failures.push(`candidate mismatch: ${first.candidateId || 'missing'}`);
    if (!first.siteId.startsWith('site-')) failures.push('missing deterministic site id');
    if (first.revision !== 1) failures.push(`unexpected revision ${first.revision}`);
    if (first.status !== 'draft') failures.push(`unexpected status ${first.status || 'missing'}`);
    if (!first.fingerprint.startsWith('v1-')) failures.push('missing snapshot fingerprint');
    if (first.sourceKey !== fixture) failures.push(`source key mismatch: ${first.sourceKey || 'missing'}`);
    if (first.sourceCandidate !== candidateId) failures.push(`source candidate mismatch: ${first.sourceCandidate || 'missing'}`);
    if (first.pageCount < 1 || first.pages.some((item) => !item.slug || item.sectionCount < 1)) failures.push('invalid persisted page snapshot');
    if (first.contentPageCount !== first.pageCount) failures.push(`content/page mismatch ${first.contentPageCount}/${first.pageCount}`);
    if (first.contentSectionCount < 1 || first.pages.some((item) => item.contentSectionCount < 1)) failures.push('missing persisted renderable section content');
    if (!first.seoTitle.trim()) failures.push('missing persisted SEO title');
    if (first.capabilityCount < 1) failures.push('missing persisted capability state');
    if (!Number.isInteger(first.mediaCount) || first.mediaCount < 0) failures.push('invalid persisted media manifest count');
    if (first.siteId !== second.siteId) failures.push('site id changed across reload');
    if (first.fingerprint !== second.fingerprint) failures.push('snapshot fingerprint changed across reload');
    if (first.contentPageCount !== second.contentPageCount || first.contentSectionCount !== second.contentSectionCount || first.seoTitle !== second.seoTitle) failures.push('content snapshot changed across reload');
    if (first.mediaCount !== second.mediaCount) failures.push('media snapshot changed across reload');
    if (JSON.stringify(first.pages) !== JSON.stringify(second.pages)) failures.push('page snapshot changed across reload');

    report.candidates.push({ fixture, candidateId, first, second, failures });
    await page.close();
  }
}

await browser.close();
const failed = report.candidates.filter((candidate) => candidate.failures.length);
const uniqueSiteIds = new Set(report.candidates.map((candidate) => candidate.first.siteId));
report.summary = {
  candidateCount: report.candidates.length,
  fixtureCount: fixtures.length,
  stableReloads: report.candidates.filter((candidate) => candidate.first.siteId === candidate.second.siteId && candidate.first.fingerprint === candidate.second.fingerprint).length,
  renderableContentSnapshots: report.candidates.filter((candidate) => candidate.first.contentPageCount === candidate.first.pageCount && candidate.first.contentSectionCount > 0 && candidate.first.seoTitle).length,
  stableMediaSnapshots: report.candidates.filter((candidate) => candidate.first.mediaCount === candidate.second.mediaCount && candidate.first.mediaCount >= 0).length,
  candidatesWithPersistedMedia: report.candidates.filter((candidate) => candidate.first.mediaCount > 0).length,
  uniqueSiteIds: uniqueSiteIds.size,
  candidatesWithFailures: failed.map((candidate) => `${candidate.fixture}/${candidate.candidateId}`),
};
fs.writeFileSync('artifacts/materialized-site-audit/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
if (uniqueSiteIds.size !== report.candidates.length) {
  console.error(`Materialized site IDs are not unique: ${uniqueSiteIds.size}/${report.candidates.length}`);
  process.exit(1);
}
if (failed.length) process.exit(1);
