import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const certificationPath = path.join(root, "test-results", "certification", "report.json");
const reviewQueuePath = path.join(root, "test-results", "visual-review", "queue.json");

const certification = JSON.parse(await readFile(certificationPath, "utf8"));
const reviewQueue = JSON.parse(await readFile(reviewQueuePath, "utf8"));

const REQUIRED_VIEWPORTS = [
  { label: "mobile-360", width: 360, height: 800 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "mobile-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

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
assert.equal(reviewQueue.promotionThreshold, 90, "premium visual promotion threshold must remain 90/100");
assert.equal(reviewQueue.minimumCategoryScore, 8, "premium visual category floor must remain 8/10");
assert.deepEqual(reviewQueue.requiredViewports, REQUIRED_VIEWPORTS, "premium visual review must retain the complete five-viewport matrix");

for (const item of reviewQueue.queue ?? []) {
  assert.equal(item.minimumScore, 90, `${item.designId}: premium visual threshold must remain 90/100`);
  assert.equal(item.minimumCategoryScore, 8, `${item.designId}: premium visual category floor must remain 8/10`);
  assert.deepEqual(item.requiredViewports, REQUIRED_VIEWPORTS, `${item.designId}: complete five-viewport review matrix is required`);
  assert.ok(item.rubric?.mobilePolish, `${item.designId}: mobile polish rubric is required`);
  assert.ok(item.rubric?.premiumFinish, `${item.designId}: premium finish rubric is required`);
}

console.log(
  `Premium certification gate passed: ${certification.machinePassed}/${certification.total} designs cleared machine QA and entered visual review.`,
);
