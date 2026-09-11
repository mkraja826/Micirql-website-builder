import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const candidateIds = Array.from({ length: 20 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const targets = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];

fs.mkdirSync('artifacts/pearl-render-audit', { recursive: true });

function scoreAudit(metrics, target) {
  let score = 100;
  const cautions = [];
  const failures = [];

  if (metrics.horizontalOverflow > 1) {
    score -= 35;
    failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
  }
  if (metrics.elementsOutsideViewport > 0) {
    score -= Math.min(20, metrics.elementsOutsideViewport * 4);
    cautions.push(`${metrics.elementsOutsideViewport} visible element(s) extend outside the viewport`);
  }
  if (metrics.overlapPairs > 0) {
    score -= Math.min(15, metrics.overlapPairs * 3);
    cautions.push(`${metrics.overlapPairs} suspicious content overlap(s)`);
  }
  if (metrics.h1Count !== 1) {
    score -= 10;
    cautions.push(`expected exactly one h1, found ${metrics.h1Count}`);
  }
  if (metrics.tinyTextCount > 0) {
    score -= Math.min(10, metrics.tinyTextCount * 2);
    cautions.push(`${metrics.tinyTextCount} text element(s) below 11px`);
  }
  if (target.name === 'mobile' && metrics.smallTapTargetCount > 0) {
    score -= Math.min(15, metrics.smallTapTargetCount * 2);
    cautions.push(`${metrics.smallTapTargetCount} interactive element(s) smaller than 40px in both dimensions`);
  }
  if (metrics.sectionCount < 5) {
    score -= 10;
    cautions.push(`only ${metrics.sectionCount} major content sections detected`);
  }
  if (metrics.bodyHeight < target.height) {
    score -= 5;
    cautions.push('page is shorter than the benchmark viewport');
  }

  return { score: Math.max(0, score), cautions, failures };
}

const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), candidates: [] };

for (const candidateId of candidateIds) {
  const candidateReport = { id: candidateId, targets: {}, renderedScore: 0, failures: [] };

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/generated/pearl/candidates/${candidateId}`, { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const visible = [...document.querySelectorAll('body *')].filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
      });

      const elementsOutsideViewport = visible.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > window.innerWidth + 1;
      }).length;
      const textElements = visible.filter((element) => element.childElementCount === 0 && (element.textContent ?? '').trim().length > 0);
      const tinyTextCount = textElements.filter((element) => parseFloat(getComputedStyle(element).fontSize) < 11).length;
      const interactive = visible.filter((element) => ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) || element.getAttribute('role') === 'button');
      const smallTapTargetCount = interactive.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 40 && rect.height < 40;
      }).length;

      const blockCandidates = visible.filter((element) => ['SECTION', 'ARTICLE', 'HEADER', 'MAIN', 'FOOTER'].includes(element.tagName));
      let overlapPairs = 0;
      for (let index = 0; index < blockCandidates.length - 1; index += 1) {
        const a = blockCandidates[index].getBoundingClientRect();
        const b = blockCandidates[index + 1].getBoundingClientRect();
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > 24 && overlapY > 24 && !(blockCandidates[index].contains(blockCandidates[index + 1]) || blockCandidates[index + 1].contains(blockCandidates[index]))) {
          overlapPairs += 1;
        }
      }

      return {
        horizontalOverflow: Math.max(0, root.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth),
        elementsOutsideViewport,
        tinyTextCount,
        smallTapTargetCount,
        overlapPairs,
        h1Count: document.querySelectorAll('h1').length,
        sectionCount: document.querySelectorAll('main section, main > article, main > header').length,
        bodyHeight: Math.max(body.scrollHeight, root.scrollHeight),
      };
    });

    const scored = scoreAudit(metrics, target);
    candidateReport.targets[target.name] = { ...metrics, ...scored };
    candidateReport.failures.push(...scored.failures.map((failure) => `${target.name}: ${failure}`));
    await page.close();
  }

  candidateReport.renderedScore = Math.round((candidateReport.targets.desktop.score * 0.45) + (candidateReport.targets.mobile.score * 0.55));
  report.candidates.push(candidateReport);
}

await browser.close();

report.candidates.sort((a, b) => b.renderedScore - a.renderedScore || a.id.localeCompare(b.id));
report.summary = {
  minScore: Math.min(...report.candidates.map((candidate) => candidate.renderedScore)),
  maxScore: Math.max(...report.candidates.map((candidate) => candidate.renderedScore)),
  averageScore: Math.round(report.candidates.reduce((sum, candidate) => sum + candidate.renderedScore, 0) / report.candidates.length),
  candidatesWithFailures: report.candidates.filter((candidate) => candidate.failures.length > 0).map((candidate) => candidate.id),
};

fs.writeFileSync('artifacts/pearl-render-audit/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

if (report.summary.candidatesWithFailures.length > 0) {
  console.error(`Rendered candidate hard failures: ${report.summary.candidatesWithFailures.join(', ')}`);
  process.exit(1);
}
if (report.summary.minScore < 70) {
  console.error(`Rendered candidate score gate failed: minimum score ${report.summary.minScore} < 70`);
  process.exit(1);
}
