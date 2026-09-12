import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const fixtures = ['luxury-hotel','restaurant','saas','construction','law-firm'];
const candidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const targets = [
  { name:'desktop', width:1440, height:1200 },
  { name:'mobile', width:390, height:844 },
];
const forbiddenText = ['Pearl Dental','patient-friendly','the clinic'];
const expectedPrimaryCapabilities = {
  'luxury-hotel': new Set(['booking_enquiry','contact']),
  restaurant: new Set(['reservation','contact']),
  saas: new Set(['demo_request','lead_capture','contact']),
  construction: new Set(['lead_capture','contact']),
  'law-firm': new Set(['lead_capture','contact']),
};
const expectedMedia = {
  'luxury-hotel': { industry:'hospitality', hero:'property' },
  restaurant: { industry:'food-beverage', hero:'food' },
  saas: { industry:'technology', hero:'product ui' },
  construction: { industry:'construction', hero:'projects' },
  'law-firm': { industry:'professional-services', hero:'professional context' },
};

fs.mkdirSync('artifacts/multi-industry-render-audit', { recursive:true });

function score(metrics, target, fixture) {
  let value = 100;
  const failures = [];
  const cautions = [];
  if (metrics.horizontalOverflow > 1) { value -= 35; failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`); }
  if (metrics.h1Count !== 1) { value -= 15; failures.push(`expected exactly one h1, found ${metrics.h1Count}`); }
  if (metrics.sectionCount < 5) { value -= 20; failures.push(`only ${metrics.sectionCount} major sections detected`); }
  if (metrics.forbiddenMatches.length) { value -= 30; failures.push(`cross-industry leakage: ${metrics.forbiddenMatches.join(', ')}`); }
  if (metrics.renderedFixture !== fixture) { value -= 40; failures.push(`cross-fixture render contamination: expected ${fixture}, found ${metrics.renderedFixture || 'missing'}`); }
  if (!metrics.primaryCapability) { value -= 30; failures.push('missing canonical primary capability metadata'); }
  else if (!expectedPrimaryCapabilities[fixture]?.has(metrics.primaryCapability)) { value -= 30; failures.push(`unexpected primary capability ${metrics.primaryCapability}`); }
  if (metrics.primaryCapabilityStatus !== 'preview') { value -= 30; failures.push(`expected unconfigured primary workflow to remain preview, found ${metrics.primaryCapabilityStatus || 'missing'}`); }
  if (!['provider','fallback'].includes(metrics.mediaSource)) { value -= 30; failures.push(`unexpected media source state ${metrics.mediaSource || 'missing'}`); }
  if (metrics.providerMediaCount < 0) { value -= 30; failures.push(`invalid provider media count ${metrics.providerMediaCount}`); }
  if (metrics.mediaSource === 'provider' && metrics.providerMediaCount === 0) { value -= 30; failures.push('media source reports provider with zero resolved provider assets'); }
  if (metrics.mediaSource === 'fallback' && metrics.providerMediaCount > 0) { value -= 30; failures.push(`media source reports fallback with ${metrics.providerMediaCount} provider asset(s)`); }
  if (metrics.mediaSource === 'fallback') cautions.push('neutral media fallback used');
  if (metrics.elementsOutsideViewport > 0) { value -= Math.min(15, metrics.elementsOutsideViewport * 3); cautions.push(`${metrics.elementsOutsideViewport} visible element(s) outside viewport`); }
  if (target.name === 'mobile' && metrics.smallTapTargetCount > 0) { value -= Math.min(12, metrics.smallTapTargetCount * 2); cautions.push(`${metrics.smallTapTargetCount} small tap target(s)`); }
  if (metrics.tinyTextCount > 0) { value -= Math.min(8, metrics.tinyTextCount * 2); cautions.push(`${metrics.tinyTextCount} tiny text element(s)`); }
  return { score:Math.max(0,value), failures, cautions };
}

function auditMediaPlan(metrics, fixture) {
  const failures = [];
  const expected = expectedMedia[fixture];
  if (!expected) return failures;
  if (metrics.renderedFixture !== fixture) failures.push(`media cross-fixture contamination: expected ${fixture}, found ${metrics.renderedFixture || 'missing'}`);
  if (metrics.industry !== expected.industry) failures.push(`media taxonomy mismatch: expected ${expected.industry}, found ${metrics.industry || 'missing'}`);
  if (metrics.intentCount !== 3) failures.push(`expected 3 media intents, found ${metrics.intentCount}`);
  for (const role of ['hero','services','about']) if (!metrics.roles.includes(role)) failures.push(`missing ${role} media intent`);
  if (metrics.sourceIntents.some((value) => value !== 'curated')) failures.push(`unexpected media source intent: ${metrics.sourceIntents.join(', ')}`);
  if (metrics.verificationStates.some((value) => value !== 'generic-safe')) failures.push(`unsafe media verification state: ${metrics.verificationStates.join(', ')}`);
  if (!metrics.heroSubject.toLowerCase().includes(expected.hero)) failures.push(`hero media subject mismatch: expected ${expected.hero}, found ${metrics.heroSubject || 'missing'}`);
  return failures;
}

const browser = await chromium.launch({ headless:true });
const report = { generatedAt:new Date().toISOString(), fixtures:[], summary:{} };

for (const fixture of fixtures) {
  const fixtureReport = { fixture, candidates:[] };
  for (const candidateId of candidateIds) {
    const candidate = { id:candidateId, targets:{}, mediaPlan:{}, failures:[], renderedScore:0 };

    const mediaPage = await browser.newPage({ viewport:{ width:1200, height:900 }, deviceScaleFactor:1 });
    const mediaResponse = await mediaPage.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${candidateId}/media`, { waitUntil:'networkidle' });
    const mediaStatus = mediaResponse?.status() ?? 0;
    const mediaMetrics = await mediaPage.evaluate(() => {
      const main = document.querySelector('main');
      const intents = [...document.querySelectorAll('[data-media-role]')];
      const hero = intents.find((element) => element.getAttribute('data-media-role') === 'hero');
      return {
        renderedFixture:main?.getAttribute('data-benchmark-fixture') ?? '',
        industry:main?.getAttribute('data-media-industry') ?? '',
        subIndustry:main?.getAttribute('data-media-sub-industry') ?? '',
        businessType:main?.getAttribute('data-media-business-type') ?? '',
        intentCount:Number(main?.getAttribute('data-media-intent-count') ?? 0),
        roles:intents.map((element) => element.getAttribute('data-media-role') ?? ''),
        sourceIntents:intents.map((element) => element.getAttribute('data-media-source-intent') ?? ''),
        verificationStates:intents.map((element) => element.getAttribute('data-media-verification') ?? ''),
        heroSubject:hero?.getAttribute('data-media-subject') ?? '',
      };
    });
    const mediaFailures = auditMediaPlan(mediaMetrics, fixture);
    if (mediaStatus < 200 || mediaStatus >= 400) mediaFailures.push(`media probe HTTP ${mediaStatus}`);
    candidate.mediaPlan = { ...mediaMetrics, failures:mediaFailures };
    candidate.failures.push(...mediaFailures.map((item)=>`media: ${item}`));
    await mediaPage.close();

    for (const target of targets) {
      const page = await browser.newPage({ viewport:{ width:target.width, height:target.height }, deviceScaleFactor:1 });
      const response = await page.goto(`${BASE_URL}/generated/benchmarks/${fixture}/${candidateId}`, { waitUntil:'networkidle' });
      const status = response?.status() ?? 0;
      const metrics = await page.evaluate((forbidden) => {
        const root = document.documentElement;
        const body = document.body;
        const main = document.querySelector('main');
        const visible = [...document.querySelectorAll('body *')].filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
        });
        const interactive = visible.filter((element) => ['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(element.tagName) || element.getAttribute('role') === 'button');
        const textElements = visible.filter((element) => element.childElementCount === 0 && (element.textContent ?? '').trim());
        const bodyText = body.innerText;
        return {
          horizontalOverflow:Math.max(0,root.scrollWidth-window.innerWidth,body.scrollWidth-window.innerWidth),
          elementsOutsideViewport:visible.filter((element)=>{ const r=element.getBoundingClientRect(); return r.left < -1 || r.right > window.innerWidth + 1; }).length,
          smallTapTargetCount:interactive.filter((element)=>{ const r=element.getBoundingClientRect(); return r.width < 40 && r.height < 40; }).length,
          tinyTextCount:textElements.filter((element)=>parseFloat(getComputedStyle(element).fontSize) < 11).length,
          h1Count:document.querySelectorAll('h1').length,
          sectionCount:document.querySelectorAll('main section').length,
          forbiddenMatches:forbidden.filter((term)=>bodyText.toLowerCase().includes(term.toLowerCase())),
          renderedFixture:main?.getAttribute('data-benchmark-fixture') ?? '',
          primaryCapability:main?.getAttribute('data-primary-capability') ?? '',
          primaryCapabilityStatus:main?.getAttribute('data-primary-capability-status') ?? '',
          mediaSource:main?.getAttribute('data-media-source') ?? '',
          providerMediaCount:Number(main?.getAttribute('data-media-provider-count') ?? -1),
        };
      }, forbiddenText);
      if (status < 200 || status >= 400) metrics.forbiddenMatches.push(`HTTP ${status}`);
      const result = score(metrics,target,fixture);
      candidate.targets[target.name] = { ...metrics, ...result };
      candidate.failures.push(...result.failures.map((item)=>`${target.name}: ${item}`));
      await page.close();
    }
    candidate.renderedScore = Math.round(candidate.targets.desktop.score * .45 + candidate.targets.mobile.score * .55);
    fixtureReport.candidates.push(candidate);
  }
  report.fixtures.push(fixtureReport);
}

await browser.close();
const all = report.fixtures.flatMap((fixture)=>fixture.candidates.map((candidate)=>({ fixture:fixture.fixture, ...candidate })));
const providerPages = all.filter((item)=>item.targets.desktop.mediaSource === 'provider').length;
const fallbackPages = all.filter((item)=>item.targets.desktop.mediaSource === 'fallback').length;
report.summary = {
  pageCount:all.length,
  mediaPlanCount:all.length,
  providerPages,
  fallbackPages,
  minScore:Math.min(...all.map((item)=>item.renderedScore)),
  maxScore:Math.max(...all.map((item)=>item.renderedScore)),
  averageScore:Math.round(all.reduce((sum,item)=>sum+item.renderedScore,0)/all.length),
  pagesWithFailures:all.filter((item)=>item.failures.length).map((item)=>`${item.fixture}/${item.id}`),
};
fs.writeFileSync('artifacts/multi-industry-render-audit/report.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (report.summary.pagesWithFailures.length) process.exit(1);
if (report.summary.minScore < 70) process.exit(1);
