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

fs.mkdirSync('artifacts/multi-industry-render-audit', { recursive:true });

function score(metrics, target, fixture) {
  let value = 100;
  const failures = [];
  const cautions = [];
  if (metrics.horizontalOverflow > 1) { value -= 35; failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`); }
  if (metrics.h1Count !== 1) { value -= 15; failures.push(`expected exactly one h1, found ${metrics.h1Count}`); }
  if (metrics.sectionCount < 5) { value -= 20; failures.push(`only ${metrics.sectionCount} major sections detected`); }
  if (metrics.forbiddenMatches.length) { value -= 30; failures.push(`cross-industry leakage: ${metrics.forbiddenMatches.join(', ')}`); }
  if (!metrics.primaryCapability) { value -= 30; failures.push('missing canonical primary capability metadata'); }
  else if (!expectedPrimaryCapabilities[fixture]?.has(metrics.primaryCapability)) { value -= 30; failures.push(`unexpected primary capability ${metrics.primaryCapability}`); }
  if (metrics.primaryCapabilityStatus !== 'preview') { value -= 30; failures.push(`expected unconfigured primary workflow to remain preview, found ${metrics.primaryCapabilityStatus || 'missing'}`); }
  if (metrics.elementsOutsideViewport > 0) { value -= Math.min(15, metrics.elementsOutsideViewport * 3); cautions.push(`${metrics.elementsOutsideViewport} visible element(s) outside viewport`); }
  if (target.name === 'mobile' && metrics.smallTapTargetCount > 0) { value -= Math.min(12, metrics.smallTapTargetCount * 2); cautions.push(`${metrics.smallTapTargetCount} small tap target(s)`); }
  if (metrics.tinyTextCount > 0) { value -= Math.min(8, metrics.tinyTextCount * 2); cautions.push(`${metrics.tinyTextCount} tiny text element(s)`); }
  return { score:Math.max(0,value), failures, cautions };
}

const browser = await chromium.launch({ headless:true });
const report = { generatedAt:new Date().toISOString(), fixtures:[], summary:{} };

for (const fixture of fixtures) {
  const fixtureReport = { fixture, candidates:[] };
  for (const candidateId of candidateIds) {
    const candidate = { id:candidateId, targets:{}, failures:[], renderedScore:0 };
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
          primaryCapability:main?.getAttribute('data-primary-capability') ?? '',
          primaryCapabilityStatus:main?.getAttribute('data-primary-capability-status') ?? '',
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
report.summary = {
  pageCount:all.length,
  minScore:Math.min(...all.map((item)=>item.renderedScore)),
  maxScore:Math.max(...all.map((item)=>item.renderedScore)),
  averageScore:Math.round(all.reduce((sum,item)=>sum+item.renderedScore,0)/all.length),
  pagesWithFailures:all.filter((item)=>item.failures.length).map((item)=>`${item.fixture}/${item.id}`),
};
fs.writeFileSync('artifacts/multi-industry-render-audit/report.json', JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if (report.summary.pagesWithFailures.length) process.exit(1);
if (report.summary.minScore < 70) process.exit(1);
