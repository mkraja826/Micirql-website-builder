import fs from 'node:fs';

const baselinePath = 'src/benchmarks/repair-acceptance-baseline.json';
const reportPath = 'artifacts/pearl-perceptual-ranking/report.json';

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
    if (value < floor) regressions.push(`${candidateId}: ${label} ${value} < accepted ${floor}`);
  }

  const desktopCautions = desktop.cautions?.length ?? 0;
  const mobileCautions = mobile.cautions?.length ?? 0;
  if (desktopCautions > accepted.desktopCautionCount) {
    regressions.push(`${candidateId}: desktop cautions ${desktopCautions} > accepted ${accepted.desktopCautionCount}`);
  }
  if (mobileCautions > accepted.mobileCautionCount) {
    regressions.push(`${candidateId}: mobile cautions ${mobileCautions} > accepted ${accepted.mobileCautionCount}`);
  }
}

const summary = {
  protectedCandidates: Object.keys(baseline).length,
  regressions,
};

console.log(JSON.stringify(summary, null, 2));

if (regressions.length) {
  console.error('Repair acceptance gate failed: an accepted repaired candidate regressed.');
  process.exit(1);
}
