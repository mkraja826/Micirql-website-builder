import fs from 'node:fs';

const rendered = JSON.parse(fs.readFileSync('artifacts/pearl-render-audit/report.json', 'utf8'));
const perceptual = JSON.parse(fs.readFileSync('artifacts/pearl-perceptual-ranking/report.json', 'utf8'));

const PLAN_SCORES = {
  'candidate-01': 89.9, 'candidate-02': 78.3, 'candidate-03': 79.7, 'candidate-04': 85.9,
  'candidate-05': 85.5, 'candidate-06': 83.9, 'candidate-07': 80.9, 'candidate-08': 77.1,
  'candidate-09': 75.3, 'candidate-10': 78.9, 'candidate-11': 80.3, 'candidate-12': 77.7,
  'candidate-13': 79.9, 'candidate-14': 84.5, 'candidate-15': 83.9, 'candidate-16': 84.6,
  'candidate-17': 81.3, 'candidate-18': 81.3, 'candidate-19': 83.3, 'candidate-20': 80.3,
};

const renderedById = new Map(rendered.candidates.map((candidate) => [candidate.id, candidate]));
const perceptualById = new Map(perceptual.candidates.map((candidate) => [candidate.id, candidate]));

const weights = { plan: 0.30, rendered: 0.25, perceptual: 0.45 };
const candidates = Object.entries(PLAN_SCORES).map(([id, planScore]) => {
  const renderedCandidate = renderedById.get(id);
  const perceptualCandidate = perceptualById.get(id);
  if (!renderedCandidate || !perceptualCandidate) throw new Error(`Missing ranking signal for ${id}`);
  const renderedScore = renderedCandidate.renderedScore;
  const perceptualScore = perceptualCandidate.perceptualScore;
  const finalScore = Number((planScore * weights.plan + renderedScore * weights.rendered + perceptualScore * weights.perceptual).toFixed(2));
  return {
    id,
    finalScore,
    signals: { planScore, renderedScore, perceptualScore },
    hardFailures: renderedCandidate.failures,
    strengths: perceptualCandidate.strengths.slice(0, 4),
    cautions: [...renderedCandidate.targets.desktop.cautions, ...renderedCandidate.targets.mobile.cautions, ...perceptualCandidate.cautions].slice(0, 6),
  };
}).sort((a, b) => b.finalScore - a.finalScore || a.id.localeCompare(b.id));

candidates.forEach((candidate, index) => { candidate.rank = index + 1; });
const report = {
  generatedAt: new Date().toISOString(),
  methodology: {
    weights,
    note: 'Plan fit protects business intent; rendered health protects functional layout quality; perceptual quality receives the largest weight because Phase 11 exists to surface the strongest rendered design. Hard rendered failures remain disqualifying regardless of score.',
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
