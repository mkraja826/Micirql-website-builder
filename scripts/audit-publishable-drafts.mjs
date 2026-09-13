import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data','salon','gym','manufacturing','automotive-service','architecture-studio','ngo','ecommerce','consultancy','travel-agency','home-services','events'];
const candidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);

fs.mkdirSync('artifacts/publishable-draft-audit', { recursive:true });
const browser = await chromium.launch({ headless:true });
const report = { generatedAt:new Date().toISOString(), candidates:[], summary:{} };

for (const fixture of fixtures) {
  for (const candidateId of candidateIds) {
    const page = await browser.newPage({ viewport:{ width:1200, height:900 }, deviceScaleFactor:1 });
    const response = await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${candidateId}/draft`, { waitUntil:'networkidle' });
    const status = response?.status() ?? 0;
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const capabilityNodes = [...document.querySelectorAll('[data-draft-capability]')];
      return {
        renderedFixture:main?.getAttribute('data-benchmark-fixture') ?? '',
        candidateId:main?.getAttribute('data-candidate-id') ?? '',
        readiness:main?.getAttribute('data-draft-readiness') ?? '',
        pageCount:Number(main?.getAttribute('data-draft-page-count') ?? 0),
        blockerCount:Number(main?.getAttribute('data-draft-blocker-count') ?? 0),
        warningCount:Number(main?.getAttribute('data-draft-warning-count') ?? 0),
        capabilityCount:Number(main?.getAttribute('data-draft-capability-count') ?? 0),
        activeCapabilityCount:Number(main?.getAttribute('data-draft-active-capability-count') ?? 0),
        disabledCapabilityCount:Number(main?.getAttribute('data-draft-disabled-capability-count') ?? 0),
        capabilityStates:capabilityNodes.map((node) => ({ id:node.getAttribute('data-draft-capability') ?? '', state:node.getAttribute('data-draft-capability-state') ?? '' })),
        pages:[...document.querySelectorAll('[data-draft-page]')].map((node) => ({ slug:node.getAttribute('data-draft-page') ?? '', sectionCount:Number(node.getAttribute('data-draft-section-count') ?? 0) })),
      };
    });

    const failures = [];
    if (status < 200 || status >= 400) failures.push(`HTTP ${status}`);
    if (metrics.renderedFixture !== fixture) failures.push(`fixture mismatch: expected ${fixture}, found ${metrics.renderedFixture || 'missing'}`);
    if (metrics.candidateId !== candidateId) failures.push(`candidate mismatch: expected ${candidateId}, found ${metrics.candidateId || 'missing'}`);
    if (metrics.readiness !== 'ready') failures.push(`draft readiness is ${metrics.readiness || 'missing'}`);
    if (metrics.blockerCount !== 0) failures.push(`draft has ${metrics.blockerCount} blockers`);
    if (metrics.pageCount < 1) failures.push('draft has no pages');
    if (metrics.pages.some((item) => !item.slug || item.sectionCount < 1)) failures.push('draft contains an invalid page contract');
    if (metrics.capabilityCount < 1) failures.push('draft has no capability plan');
    if (metrics.capabilityStates.some((item) => !['active','disabled_preview','disabled_needs_configuration'].includes(item.state))) failures.push('draft exposes an invalid capability state');
    if (metrics.activeCapabilityCount + metrics.disabledCapabilityCount !== metrics.capabilityCount) failures.push('capability state counts do not reconcile');

    report.candidates.push({ fixture, candidateId, ...metrics, failures });
    await page.close();
  }
}

await browser.close();
const failed = report.candidates.filter((candidate) => candidate.failures.length);
report.summary = {
  candidateCount:report.candidates.length,
  fixtureCount:fixtures.length,
  readyDrafts:report.candidates.filter((candidate) => candidate.readiness === 'ready').length,
  candidatesWithFailures:failed.map((candidate) => `${candidate.fixture}/${candidate.candidateId}`),
  maximumBlockerCount:Math.max(...report.candidates.map((candidate) => candidate.blockerCount)),
  draftsWithDisabledCapabilities:report.candidates.filter((candidate) => candidate.disabledCapabilityCount > 0).length,
};
fs.writeFileSync('artifacts/publishable-draft-audit/report.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (failed.length) process.exit(1);
