import fs from 'node:fs';

const baselinePath = 'src/benchmarks/repair-acceptance-baseline.json';
const reportPath = 'artifacts/pearl-perceptual-ranking/report.json';
const scoreTolerance = 6;
const cautionTolerance = 1;
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const byId = new Map(report.candidates.map((candidate) => [candidate.id, candidate]));
const regressions = [];

for (const [candidateId, accepted] of Object.entries(baseline)) {
  const current = byId.get(candidateId);
  if (!current) {
    regressions.push(`${candidateId}: missing from perceptual report`);
    continue;
  }
  const desktop = current.targets?.desktop;
  const mobile = current.targets?.mobile;
  if (!desktop || !mobile) {
    regressions.push(`${candidateId}: missing desktop/mobile perceptual target`);
    continue;
  }

  const checks = [
    ['perceptualScore', current.perceptualScore, accepted.perceptualScore],
    ['desktopScore', desktop.score, accepted.desktopScore],
    ['mobileScore', mobile.score, accepted.mobileScore],
  ];
  for (const [label, value, floor] of checks) {
    if (value < floor - scoreTolerance) {
      regressions.push(`${candidateId}: ${label} ${value} < tolerated floor ${floor - scoreTolerance}`);
    }
  }

  const desktopCautions = desktop.cautions?.length ?? 0;
  const mobileCautions = mobile.cautions?.length ?? 0;
  if (desktopCautions > accepted.desktopCautionCount + cautionTolerance) {
    regressions.push(`${candidateId}: desktop cautions ${desktopCautions} > tolerated maximum ${accepted.desktopCautionCount + cautionTolerance}`);
  }
  if (mobileCautions > accepted.mobileCautionCount + cautionTolerance) {
    regressions.push(`${candidateId}: mobile cautions ${mobileCautions} > tolerated maximum ${accepted.mobileCautionCount + cautionTolerance}`);
  }
}

const summary = {
  protectedCandidates: Object.keys(baseline).length,
  scoreTolerance,
  cautionTolerance,
  regressions,
};
console.log(JSON.stringify(summary, null, 2));
if (regressions.length) {
  console.error('Repair acceptance gate failed: a protected candidate materially regressed.');
  process.exit(1);
}
