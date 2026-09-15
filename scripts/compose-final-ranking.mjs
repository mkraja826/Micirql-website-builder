import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const generatedDir = '.tmp/canonical-ranking-runtime';
const runnerPath = `${generatedDir}/runner.ts`;
const bundlePath = `${generatedDir}/runner.mjs`;
fs.rmSync(generatedDir, { recursive: true, force: true });
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(
  runnerPath,
  `export { createPearlDentalBrief, generatePearlDentalCandidates, PEARL_DENTAL_KNOWLEDGE } from '../../src/benchmarks/pearl.ts';\nexport { rankCandidates } from '../../src/core/ranking/candidates.ts';\n`,
);
execFileSync(
  './node_modules/esbuild/bin/esbuild',
  [
    runnerPath,
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--target=node22',
    `--outfile=${bundlePath}`,
  ],
  { stdio: 'inherit' },
);

const canonical = await import(pathToFileURL(bundlePath).href);
const { createPearlDentalBrief, generatePearlDentalCandidates, PEARL_DENTAL_KNOWLEDGE, rankCandidates } = canonical;

const rendered = JSON.parse(fs.readFileSync('artifacts/pearl-render-audit/report.json', 'utf8'));
const perceptual = JSON.parse(fs.readFileSync('artifacts/pearl-perceptual-ranking/report.json', 'utf8'));

const canonicalRanking = rankCandidates(
  generatePearlDentalCandidates(20),
  createPearlDentalBrief(),
  PEARL_DENTAL_KNOWLEDGE,
);

const renderedById = new Map(rendered.candidates.map((candidate) => [candidate.id, candidate]));
const perceptualById = new Map(perceptual.candidates.map((candidate) => [candidate.id, candidate]));
const canonicalIds = new Set(canonicalRanking.map(({ candidate }) => candidate.id));

if (canonicalIds.size !== canonicalRanking.length) throw new Error('Canonical ranking contains duplicate candidate IDs');
if (renderedById.size !== canonicalRanking.length || perceptualById.size !== canonicalRanking.length) {
  throw new Error('Final ranking evidence must exactly cover the canonical candidate set');
}
for (const id of renderedById.keys()) if (!canonicalIds.has(id)) throw new Error(`Rendered evidence contains unknown candidate ${id}`);
for (const id of perceptualById.keys()) if (!canonicalIds.has(id)) throw new Error(`Perceptual evidence contains unknown candidate ${id}`);

const weights = { plan: 0.30, rendered: 0.25, perceptual: 0.45 };
const candidates = canonicalRanking.map(({ candidate, score, strengths: planStrengths, cautions: planCautions }) => {
  const id = candidate.id;
  const renderedCandidate = renderedById.get(id);
  const perceptualCandidate = perceptualById.get(id);
  if (!renderedCandidate || !perceptualCandidate) throw new Error(`Missing ranking signal for ${id}`);

  const planScore = score.total;
  const renderedScore = renderedCandidate.renderedScore;
  const perceptualScore = perceptualCandidate.perceptualScore;
  if (![planScore, renderedScore, perceptualScore].every(Number.isFinite)) throw new Error(`Non-finite ranking signal for ${id}`);

  const finalScore = Number((planScore * weights.plan + renderedScore * weights.rendered + perceptualScore * weights.perceptual).toFixed(2));
  return {
    id,
    finalScore,
    signals: { planScore, renderedScore, perceptualScore },
    hardFailures: renderedCandidate.failures,
    strengths: [...planStrengths, ...perceptualCandidate.strengths].slice(0, 4),
    cautions: [...planCautions, ...renderedCandidate.targets.desktop.cautions, ...renderedCandidate.targets.mobile.cautions, ...perceptualCandidate.cautions].slice(0, 6),
  };
}).sort((a, b) => b.finalScore - a.finalScore || a.id.localeCompare(b.id));

candidates.forEach((candidate, index) => { candidate.rank = index + 1; });
const report = {
  generatedAt: new Date().toISOString(),
  methodology: {
    weights,
    note: 'Plan fit comes directly from the canonical MiCirql candidate ranker; rendered health protects functional layout quality; perceptual quality receives the largest weight. Hard rendered failures remain disqualifying regardless of score.',
  },
  candidates,
  summary: {
    topFive: candidates.slice(0, 5).map(({ id, finalScore, signals }) => ({ id, finalScore, signals })),
    bottomFive: candidates.slice(-5).map(({ id, finalScore, signals }) => ({ id, finalScore, signals })),
    spread: Number((candidates[0].finalScore - candidates.at(-1).finalScore).toFixed(2)),
  },
};

fs.mkdirSync('artifacts/pearl-final-ranking', { recursive: true });
fs.writeFileSync('artifacts/pearl-final-ranking/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));

if (candidates.some((candidate) => candidate.hardFailures.length > 0)) {
  console.error('Final ranking contains candidate(s) with rendered hard failures.');
  process.exit(1);
}
if (report.summary.spread < 5) {
  console.error(`Final ranking is insufficiently discriminating: spread ${report.summary.spread} < 5`);
  process.exit(1);
}
