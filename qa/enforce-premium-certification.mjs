import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const certificationPath = path.join(root, "test-results", "certification", "report.json");
const reviewQueuePath = path.join(root, "test-results", "visual-review", "queue.json");

const certification = JSON.parse(await readFile(certificationPath, "utf8"));
const reviewQueue = JSON.parse(await readFile(reviewQueuePath, "utf8"));

assert.ok(certification.total > 0, "premium certification requires at least one QA evidence entry");
assert.equal(
  certification.machineBlocked,
  0,
  `premium certification blocked: ${certification.machineBlocked} design(s) failed machine QA`,
);
assert.equal(
  certification.machinePassed,
  certification.total,
  "every design in the certification scope must pass machine QA",
);
assert.equal(
  reviewQueue.total,
  certification.machinePassed,
  "every machine-passing design must be present in the visual review queue",
);

for (const item of reviewQueue.queue ?? []) {
  assert.equal(item.minimumScore, 80, `${item.designId}: premium visual threshold must remain 80/100`);
  assert.equal(item.requiredDesktopPreview, 1280, `${item.designId}: 1280px desktop preview is required`);
  assert.equal(item.requiredMobilePreview, 390, `${item.designId}: 390px mobile preview is required`);
  assert.ok(item.rubric?.mobilePolish, `${item.designId}: mobile polish rubric is required`);
  assert.ok(item.rubric?.premiumFinish, `${item.designId}: premium finish rubric is required`);
}

console.log(
  `Premium certification gate passed: ${certification.machinePassed}/${certification.total} designs cleared machine QA and entered visual review.`,
);
