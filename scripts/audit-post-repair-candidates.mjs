import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const candidateIds = Array.from({ length: 20 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const targets = [
  { name: 'desktop', width: 1440, height: 1200 },
  { name: 'mobile', width: 390, height: 844 },
];
const initial = JSON.parse(fs.readFileSync('artifacts/pearl-render-audit/report.json', 'utf8'));
const repairReport = JSON.parse(fs.readFileSync('artifacts/targeted-repair-plans/report.json', 'utf8'));
const plansById = new Map(repairReport.candidates.map((plan) => [plan.candidateId, plan]));
const initialById = new Map(initial.candidates.map((candidate) => [candidate.id, candidate]));

if (plansById.size !== candidateIds.length || initialById.size !== candidateIds.length) {
  throw new Error('Post-repair audit requires exact initial-audit and repair-plan coverage for all 20 candidates');
}

const generatedDir = '.tmp/post-repair-runtime';
const runnerPath = `${generatedDir}/runner.ts`;
const bundlePath = `${generatedDir}/runner.mjs`;
fs.rmSync(generatedDir, { recursive: true, force: true });
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(runnerPath, `export { repairPlanToScopedCss } from '../../src/core/repair/executor.ts';\n`);
execFileSync('./node_modules/esbuild/bin/esbuild', [runnerPath, '--bundle', '--platform=node', '--format=esm', '--target=node22', `--outfile=${bundlePath}`], { stdio: 'inherit' });
const { repairPlanToScopedCss } = await import(pathToFileURL(bundlePath).href);

function scoreAudit(metrics, target) {
  let score = 100;
  const cautions = [];
  const failures = [];
  if (metrics.horizontalOverflow > 1) { score -= 35; failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`); }
  if (metrics.elementsOutsideViewport > 0) { score -= Math.min(20, metrics.elementsOutsideViewport * 4); cautions.push(`${metrics.elementsOutsideViewport} visible element(s) extend outside the viewport`); }
  if (metrics.overlapPairs > 0) { score -= Math.min(15, metrics.overlapPairs * 3); cautions.push(`${metrics.overlapPairs} suspicious content overlap(s)`); }
  if (metrics.h1Count !== 1) { score -= 10; cautions.push(`expected exactly one h1, found ${metrics.h1Count}`); }
  if (metrics.tinyTextCount > 0) { score -= Math.min(10, metrics.tinyTextCount * 2); cautions.push(`${metrics.tinyTextCount} text element(s) below 11px`); }
  if (target.name === 'mobile' && metrics.smallTapTargetCount > 0) { score -= Math.min(15, metrics.smallTapTargetCount * 2); cautions.push(`${metrics.smallTapTargetCount} interactive element(s) smaller than 40px in both dimensions`); }
  if (metrics.sectionCount < 5) { score -= 10; cautions.push(`only ${metrics.sectionCount} major content sections detected`); }
  if (metrics.bodyHeight < target.height) { score -= 5; cautions.push('page is shorter than the benchmark viewport'); }
  return { score: Math.max(0, score), cautions, failures };
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const visible = [...document.querySelectorAll('body *')].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    });
    const isSafelyClippedByAncestor = (element) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== body) {
        const style = getComputedStyle(ancestor);
        const clips = ['hidden', 'clip'].includes(style.overflowX) || ['hidden', 'clip'].includes(style.overflow);
        if (clips) {
          const rect = ancestor.getBoundingClientRect();
          if (rect.left >= -1 && rect.right <= window.innerWidth + 1) return true;
        }
        ancestor = ancestor.parentElement;
      }
      return false;
    };
    const outside = visible.filter((element) => {
      const rect = element.getBoundingClientRect();
      return (rect.left < -1 || rect.right > window.innerWidth + 1) && !isSafelyClippedByAncestor(element);
    });
    const textElements = visible.filter((element) => element.childElementCount === 0 && (element.textContent ?? '').trim().length > 0);
    const interactive = visible.filter((element) => ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) || element.getAttribute('role') === 'button');
    const blockCandidates = visible.filter((element) => ['SECTION', 'ARTICLE', 'HEADER', 'MAIN', 'FOOTER'].includes(element.tagName));
    let overlapPairs = 0;
    for (let index = 0; index < blockCandidates.length - 1; index += 1) {
      const a = blockCandidates[index].getBoundingClientRect();
      const b = blockCandidates[index + 1].getBoundingClientRect();
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX > 24 && overlapY > 24 && !(blockCandidates[index].contains(blockCandidates[index + 1]) || blockCandidates[index + 1].contains(blockCandidates[index]))) overlapPairs += 1;
    }
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth),
      elementsOutsideViewport: outside.length,
      tinyTextCount: textElements.filter((element) => parseFloat(getComputedStyle(element).fontSize) < 11).length,
      smallTapTargetCount: interactive.filter((element) => { const rect = element.getBoundingClientRect(); return rect.width < 40 && rect.height < 40; }).length,
      overlapPairs,
      h1Count: document.querySelectorAll('h1').length,
      sectionCount: document.querySelectorAll('main section, main > article, main > header').length,
      bodyHeight: Math.max(body.scrollHeight, root.scrollHeight),
    };
  });
}

fs.mkdirSync('artifacts/pearl-post-repair-audit', { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), evidenceState: 'post-repair', candidates: [] };

for (const candidateId of candidateIds) {
  const plan = plansById.get(candidateId);
  const before = initialById.get(candidateId);
  if (!plan || !before) throw new Error(`Missing post-repair input for ${candidateId}`);
  if (plan.allowsArbitraryCodeRewrite !== false) throw new Error(`Unsafe repair plan for ${candidateId}`);
  if (plan.requiresRegeneration) throw new Error(`Post-repair certification cannot silently satisfy regeneration for ${candidateId}`);
  const scopedCss = repairPlanToScopedCss(plan, 'main[data-repair-scope="candidate"]');
  const candidateReport = { id: candidateId, repairInstructionCount: plan.instructions.length, targets: {}, renderedScore: 0, failures: [] };

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/generated/pearl/candidates/${candidateId}`, { waitUntil: 'networkidle' });
    await page.locator('main').evaluate((element) => element.setAttribute('data-repair-scope', 'candidate'));
    if (scopedCss) await page.addStyleTag({ content: scopedCss });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const metrics = await collectMetrics(page);
    const scored = scoreAudit(metrics, target);
    candidateReport.targets[target.name] = { ...metrics, ...scored };
    candidateReport.failures.push(...scored.failures.map((failure) => `${target.name}: ${failure}`));
    await page.close();
  }

  candidateReport.renderedScore = Math.round(candidateReport.targets.desktop.score * 0.45 + candidateReport.targets.mobile.score * 0.55);
  candidateReport.initialRenderedScore = before.renderedScore;
  candidateReport.scoreDelta = candidateReport.renderedScore - before.renderedScore;
  report.candidates.push(candidateReport);
}
await browser.close();

report.candidates.sort((a, b) => b.renderedScore - a.renderedScore || a.id.localeCompare(b.id));
report.summary = {
  minScore: Math.min(...report.candidates.map((candidate) => candidate.renderedScore)),
  maxScore: Math.max(...report.candidates.map((candidate) => candidate.renderedScore)),
  averageScore: Math.round(report.candidates.reduce((sum, candidate) => sum + candidate.renderedScore, 0) / report.candidates.length),
  candidatesWithFailures: report.candidates.filter((candidate) => candidate.failures.length > 0).map((candidate) => candidate.id),
  candidatesRegressed: report.candidates.filter((candidate) => candidate.scoreDelta < 0).map((candidate) => candidate.id),
};
fs.writeFileSync('artifacts/pearl-post-repair-audit/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

if (report.summary.candidatesWithFailures.length) {
  console.error(`Post-repair rendered hard failures: ${report.summary.candidatesWithFailures.join(', ')}`);
  process.exit(1);
}
if (report.summary.minScore < 70) {
  console.error(`Post-repair score gate failed: minimum score ${report.summary.minScore} < 70`);
  process.exit(1);
}
if (report.summary.candidatesRegressed.length) {
  console.error(`Bounded repairs regressed rendered quality: ${report.summary.candidatesRegressed.join(', ')}`);
  process.exit(1);
}
