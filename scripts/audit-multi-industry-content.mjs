import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm','real-estate','school','recruitment','ai-data','salon','gym','manufacturing','automotive-service','architecture-studio','ngo'];
const candidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const expectedIndustry = {
  'luxury-hotel':'hospitality', restaurant:'food-beverage', saas:'technology', construction:'construction', 'law-firm':'professional-services', 'real-estate':'real-estate', school:'education', recruitment:'recruitment-hr', 'ai-data':'ai-data', salon:'beauty-wellness', gym:'fitness', manufacturing:'manufacturing', 'automotive-service':'automotive-services', 'architecture-studio':'architecture-design', ngo:'nonprofit',
};
const forbiddenText = ['Pearl Dental','patient-friendly','the clinic','5-star','award-winning','guaranteed results','years of experience'];
const requiredSections = ['navbar','hero','services','about','cta','contact','footer'];

fs.mkdirSync('artifacts/multi-industry-content-audit', { recursive:true });
const browser = await chromium.launch({ headless:true });
const report = { generatedAt:new Date().toISOString(), candidates:[], summary:{} };

for (const fixture of fixtures) {
  for (const candidateId of candidateIds) {
    const page = await browser.newPage({ viewport:{ width:1200, height:900 }, deviceScaleFactor:1 });
    const response = await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${candidateId}/content`, { waitUntil:'networkidle' });
    const status = response?.status() ?? 0;
    const metrics = await page.evaluate((forbidden) => {
      const main = document.querySelector('main');
      const sections = [...document.querySelectorAll('[data-content-section]')];
      const bodyText = document.body.innerText;
      const primaryCtas = [...document.querySelectorAll('[data-content-primary-cta]')].map((node) => node.getAttribute('data-content-primary-cta') ?? '').filter(Boolean);
      return {
        renderedFixture:main?.getAttribute('data-benchmark-fixture') ?? '', candidateId:main?.getAttribute('data-candidate-id') ?? '', industry:main?.getAttribute('data-content-industry') ?? '', subIndustry:main?.getAttribute('data-content-sub-industry') ?? '', pageCount:Number(main?.getAttribute('data-content-page-count') ?? 0), sectionCount:Number(main?.getAttribute('data-content-section-count') ?? 0), warningCount:Number(main?.getAttribute('data-content-warning-count') ?? 0), primaryAction:main?.getAttribute('data-content-primary-action') ?? '', sectionTypes:sections.map((node) => node.getAttribute('data-content-section') ?? ''), claimCounts:sections.map((node) => Number(node.getAttribute('data-content-claim-count') ?? -1)), primaryCtas, seoDescription:(document.querySelector('[data-content-seo-description]')?.textContent ?? '').trim(), forbiddenMatches:forbidden.filter((term) => bodyText.toLowerCase().includes(term.toLowerCase())), faqCount:document.querySelectorAll('[data-content-faq]').length,
      };
    }, forbiddenText);

    const failures = [];
    if (status < 200 || status >= 400) failures.push(`HTTP ${status}`);
    if (metrics.renderedFixture !== fixture) failures.push(`fixture mismatch: expected ${fixture}, found ${metrics.renderedFixture || 'missing'}`);
    if (metrics.candidateId !== candidateId) failures.push(`candidate mismatch: expected ${candidateId}, found ${metrics.candidateId || 'missing'}`);
    if (metrics.industry !== expectedIndustry[fixture]) failures.push(`industry mismatch: expected ${expectedIndustry[fixture]}, found ${metrics.industry || 'missing'}`);
    if (metrics.pageCount < 1) failures.push('content plan has no pages');
    if (metrics.sectionCount < requiredSections.length) failures.push(`content plan has only ${metrics.sectionCount} home sections`);
    for (const section of requiredSections) if (!metrics.sectionTypes.includes(section)) failures.push(`missing required content section ${section}`);
    if (metrics.claimCounts.some((count) => count < 0)) failures.push('missing claims array metadata');
    if (!metrics.primaryAction) failures.push('missing primary conversion action');
    if (!metrics.primaryCtas.length) failures.push('content plan exposes no primary CTA');
    if (!metrics.seoDescription) failures.push('missing SEO description');
    if (metrics.faqCount < 3) failures.push(`expected at least 3 safe FAQ items, found ${metrics.faqCount}`);
    if (metrics.forbiddenMatches.length) failures.push(`unsafe/cross-industry content: ${metrics.forbiddenMatches.join(', ')}`);
    report.candidates.push({ fixture, candidateId, ...metrics, failures });
    await page.close();
  }
}

await browser.close();
const failed = report.candidates.filter((candidate) => candidate.failures.length);
report.summary = { candidateCount:report.candidates.length, fixtureCount:fixtures.length, candidatesWithFailures:failed.map((candidate) => `${candidate.fixture}/${candidate.candidateId}`), minimumSectionCount:Math.min(...report.candidates.map((candidate) => candidate.sectionCount)), maximumWarningCount:Math.max(...report.candidates.map((candidate) => candidate.warningCount)), faqPlans:report.candidates.filter((candidate) => candidate.faqCount >= 3).length };
fs.writeFileSync('artifacts/multi-industry-content-audit/report.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (failed.length) process.exit(1);
