import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('artifacts/benchmark', { recursive: true });
fs.mkdirSync('artifacts/section-lab', { recursive: true });
fs.mkdirSync('artifacts/generated-pearl', { recursive: true });
fs.mkdirSync('artifacts/pearl-candidates', { recursive: true });
fs.mkdirSync('artifacts/pearl-rendered-candidates', { recursive: true });
fs.mkdirSync('artifacts/multi-industry-rendered', { recursive: true });
const browser = await chromium.launch({ headless: true });

const targets = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];

const renderedCandidateIds = Array.from({ length: 20 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const multiIndustryCandidateIds = Array.from({ length: 4 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const multiIndustryFixtures = ['luxury-hotel','restaurant','saas','construction','law-firm'];

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/benchmark/${target.name}.png`, fullPage: true });
  await page.goto('http://127.0.0.1:3000/section-lab', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/section-lab/${target.name}.png`, fullPage: true });
  await page.goto('http://127.0.0.1:3000/generated/pearl', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/generated-pearl/${target.name}.png`, fullPage: true });
  await page.goto('http://127.0.0.1:3000/generated/pearl/candidates', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/pearl-candidates/${target.name}.png`, fullPage: true });
  for (const candidateId of renderedCandidateIds) {
    await page.goto(`http://127.0.0.1:3000/generated/pearl/candidates/${candidateId}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `artifacts/pearl-rendered-candidates/${candidateId}-${target.name}.png`, fullPage: true });
  }
  for (const fixture of multiIndustryFixtures) {
    for (const candidateId of multiIndustryCandidateIds) {
      await page.goto(`http://127.0.0.1:3000/generated/benchmarks/${fixture}/${candidateId}`, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `artifacts/multi-industry-rendered/${fixture}-${candidateId}-${target.name}.png`, fullPage: true });
    }
  }
  await page.close();
}

await browser.close();
