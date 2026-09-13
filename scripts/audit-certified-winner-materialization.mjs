import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data','salon','gym','manufacturing','automotive-service','architecture-studio','ngo','ecommerce','consultancy','travel-agency','home-services','events'];

fs.mkdirSync('artifacts/certified-winner-materialization-audit', { recursive:true });
const browser = await chromium.launch({ headless:true });
const report = { generatedAt:new Date().toISOString(), fixtures:[], summary:{} };

for (const fixture of fixtures) {
  const page = await browser.newPage({ viewport:{ width:1200, height:900 }, deviceScaleFactor:1 });
  const response = await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/certified`, { waitUntil:'networkidle' });
  const status = response?.status() ?? 0;
  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    return {
      renderedFixture: main?.getAttribute('data-benchmark-fixture') ?? '',
      winner: main?.getAttribute('data-certified-winner') ?? '',
      rank: Number(main?.getAttribute('data-certified-rank') ?? 0),
      score: Number(main?.getAttribute('data-certified-score') ?? 0),
      repairAccepted: main?.getAttribute('data-repair-accepted') ?? '',
      siteId: main?.getAttribute('data-site-id') ?? '',
      siteCandidate: main?.getAttribute('data-site-candidate') ?? '',
      fingerprint: main?.getAttribute('data-site-fingerprint') ?? '',
      pageCount: Number(main?.getAttribute('data-site-page-count') ?? 0),
    };
  });

  const failures = [];
  if (status < 200 || status >= 400) failures.push(`HTTP ${status}`);
  if (metrics.renderedFixture !== fixture) failures.push(`fixture mismatch: ${metrics.renderedFixture || 'missing'}`);
  if (metrics.rank !== 1) failures.push(`winner rank is ${metrics.rank}`);
  if (!metrics.winner) failures.push('winner missing');
  if (metrics.siteCandidate !== metrics.winner) failures.push(`materialized candidate ${metrics.siteCandidate || 'missing'} does not match winner ${metrics.winner || 'missing'}`);
  if (metrics.repairAccepted !== 'true') failures.push('winner repair acceptance is not true');
  if (!metrics.siteId) failures.push('site id missing');
  if (!metrics.fingerprint) failures.push('site fingerprint missing');
  if (metrics.pageCount < 1) failures.push('materialized site has no pages');
  if (!Number.isFinite(metrics.score) || metrics.score <= 0) failures.push('winner score invalid');

  report.fixtures.push({ fixture, ...metrics, failures });
  await page.close();
}

await browser.close();
const failed = report.fixtures.filter((item) => item.failures.length);
report.summary = {
  fixtureCount: fixtures.length,
  certifiedSites: report.fixtures.filter((item) => !item.failures.length).length,
  winnersMatchedToSites: report.fixtures.filter((item) => item.winner && item.siteCandidate === item.winner).length,
  failedFixtures: failed.map((item) => item.fixture),
};
fs.writeFileSync('artifacts/certified-winner-materialization-audit/report.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (failed.length) process.exit(1);
