import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE_URL = process.env.MICIRQL_BENCHMARK_URL ?? 'http://127.0.0.1:3000';
const candidateIds = Array.from({ length: 20 }, (_, index) => `candidate-${String(index + 1).padStart(2, '0')}`);
const targets = [
  { name: 'desktop', width: 1440, height: 1200, weight: 0.45 },
  { name: 'mobile', width: 390, height: 844, weight: 0.55 },
];

fs.mkdirSync('artifacts/pearl-perceptual-ranking', { recursive: true });

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreMetrics(metrics) {
  let score = 100;
  const strengths = [];
  const cautions = [];

  if (metrics.headingScaleRatio >= 1.8 && metrics.headingScaleRatio <= 4.8) strengths.push('Clear heading hierarchy');
  else { score -= 10; cautions.push('Weak or extreme heading scale'); }

  if (metrics.sectionSpacingCv <= 0.55) strengths.push('Consistent section rhythm');
  else { score -= 10; cautions.push('Inconsistent vertical rhythm'); }

  if (metrics.distinctBackgrounds >= 2 && metrics.distinctBackgrounds <= 6) strengths.push('Useful section contrast');
  else if (metrics.distinctBackgrounds < 2) { score -= 8; cautions.push('Low visual contrast between sections'); }
  else { score -= 4; cautions.push('Too many competing section backgrounds'); }

  if (metrics.narrowTextBlocksRatio >= 0.55) strengths.push('Readable text measure');
  else { score -= 8; cautions.push('Too much wide body copy'); }

  if (metrics.heroDominance >= 0.18 && metrics.heroDominance <= 0.55) strengths.push('Balanced hero dominance');
  else { score -= 8; cautions.push('Hero scale feels disproportionate'); }

  if (metrics.imageCount > 0) strengths.push('Uses visual media');
  else { score -= 6; cautions.push('No rendered imagery detected'); }

  if (metrics.imageAspectVariety >= 2) strengths.push('Varied image composition');
  else if (metrics.imageCount >= 2) { score -= 4; cautions.push('Image treatment is visually repetitive'); }

  if (metrics.fontFamilyCount >= 1 && metrics.fontFamilyCount <= 3) strengths.push('Controlled typography system');
  else { score -= 6; cautions.push('Typography system is overly fragmented'); }

  if (metrics.largeHeadingCount >= 2) strengths.push('Strong typographic moments');
  else { score -= 5; cautions.push('Few strong typographic moments'); }

  if (metrics.sectionCount >= 6) strengths.push('Substantial page composition');
  else { score -= 6; cautions.push('Page composition is thin'); }

  return { score: clamp(Math.round(score)), strengths, cautions };
}

const browser = await chromium.launch({ headless: true });
const report = { generatedAt: new Date().toISOString(), candidates: [] };

for (const candidateId of candidateIds) {
  const candidate = { id: candidateId, targets: {}, perceptualScore: 0, strengths: [], cautions: [] };

  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
    await page.goto(`${BASE_URL}/generated/pearl/candidates/${candidateId}`, { waitUntil: 'networkidle' });

    const metrics = await page.evaluate(() => {
      const visible = (selector) => [...document.querySelectorAll(selector)].filter((el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
      });

      const sections = visible('main section, main > article, main > header');
      const headings = visible('h1,h2,h3');
      const bodyText = visible('p,li').filter((el) => (el.textContent ?? '').trim().length > 24);
      const images = visible('img,picture img');
      const fonts = new Set([...headings, ...bodyText].map((el) => getComputedStyle(el).fontFamily));
      const fontSizes = headings.map((el) => parseFloat(getComputedStyle(el).fontSize)).filter(Number.isFinite);
      const bodySizes = bodyText.map((el) => parseFloat(getComputedStyle(el).fontSize)).filter(Number.isFinite);
      const maxHeading = fontSizes.length ? Math.max(...fontSizes) : 0;
      const medianBody = bodySizes.length ? [...bodySizes].sort((a,b) => a-b)[Math.floor(bodySizes.length / 2)] : 16;

      const gaps = [];
      for (let i = 0; i < sections.length - 1; i += 1) {
        const a = sections[i].getBoundingClientRect();
        const b = sections[i + 1].getBoundingClientRect();
        gaps.push(Math.max(0, b.top - a.bottom));
      }
      const gapMean = gaps.length ? gaps.reduce((a,b) => a+b, 0) / gaps.length : 0;
      const gapStd = gaps.length ? Math.sqrt(gaps.reduce((sum, gap) => sum + Math.pow(gap - gapMean, 2), 0) / gaps.length) : 0;

      const backgrounds = new Set(sections.map((el) => getComputedStyle(el).backgroundColor).filter((value) => value && value !== 'rgba(0, 0, 0, 0)'));
      const narrowTextBlocks = bodyText.filter((el) => el.getBoundingClientRect().width <= Math.min(760, window.innerWidth * 0.82)).length;
      const hero = sections[0]?.getBoundingClientRect();
      const bodyHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      const aspects = new Set(images.map((img) => {
        const rect = img.getBoundingClientRect();
        if (!rect.height) return 'unknown';
        const ratio = rect.width / rect.height;
        if (ratio > 1.35) return 'landscape';
        if (ratio < 0.8) return 'portrait';
        return 'square';
      }));

      return {
        sectionCount: sections.length,
        headingScaleRatio: medianBody ? maxHeading / medianBody : 0,
        sectionSpacingCv: gapMean > 0 ? gapStd / gapMean : 0,
        distinctBackgrounds: backgrounds.size,
        narrowTextBlocksRatio: bodyText.length ? narrowTextBlocks / bodyText.length : 1,
        heroDominance: hero && bodyHeight ? hero.height / bodyHeight : 0,
        imageCount: images.length,
        imageAspectVariety: aspects.size,
        fontFamilyCount: fonts.size,
        largeHeadingCount: fontSizes.filter((size) => size >= Math.max(36, medianBody * 2)).length,
      };
    });

    const scored = scoreMetrics(metrics);
    candidate.targets[target.name] = { ...metrics, ...scored };
    candidate.strengths.push(...scored.strengths.map((item) => `${target.name}: ${item}`));
    candidate.cautions.push(...scored.cautions.map((item) => `${target.name}: ${item}`));
    await page.close();
  }

  candidate.perceptualScore = Math.round(targets.reduce((sum, target) => sum + candidate.targets[target.name].score * target.weight, 0));
  report.candidates.push(candidate);
}

await browser.close();

report.candidates.sort((a, b) => b.perceptualScore - a.perceptualScore || a.id.localeCompare(b.id));
report.summary = {
  minScore: Math.min(...report.candidates.map((candidate) => candidate.perceptualScore)),
  maxScore: Math.max(...report.candidates.map((candidate) => candidate.perceptualScore)),
  averageScore: Math.round(report.candidates.reduce((sum, candidate) => sum + candidate.perceptualScore, 0) / report.candidates.length),
  topFive: report.candidates.slice(0, 5).map(({ id, perceptualScore }) => ({ id, perceptualScore })),
};

fs.writeFileSync('artifacts/pearl-perceptual-ranking/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

if (report.summary.minScore < 55) {
  console.error(`Perceptual score gate failed: minimum score ${report.summary.minScore} < 55`);
  process.exit(1);
}
