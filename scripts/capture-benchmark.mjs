import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('artifacts/benchmark', { recursive: true });
fs.mkdirSync('artifacts/section-lab', { recursive: true });
const browser = await chromium.launch({ headless: true });

const targets = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/benchmark/${target.name}.png`, fullPage: true });
  await page.goto('http://127.0.0.1:3000/section-lab', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `artifacts/section-lab/${target.name}.png`, fullPage: true });
  await page.close();
}

await browser.close();
