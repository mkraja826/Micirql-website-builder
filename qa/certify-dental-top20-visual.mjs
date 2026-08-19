import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const evidencePath = path.join(root, "test-results", "dental-top20-visual-evidence", "report.json");
const certificationPath = path.join(root, "test-results", "dental-top20-visual-evidence", "certification.json");
const requiredViewports = ["mobile-360", "mobile-390", "mobile-430", "tablet-768", "desktop-1024", "desktop-1440"];
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
const failures = [];

if (evidence.layouts !== 20 || !Array.isArray(evidence.report) || evidence.report.length !== 20) {
  failures.push(`Expected 20 rendered Dental layouts, received ${evidence.report?.length ?? 0}.`);
}

for (const layout of evidence.report ?? []) {
  const viewports = layout.viewports ?? {};
  for (const viewportId of requiredViewports) {
    const metrics = viewports[viewportId];
    if (!metrics) {
      failures.push(`${layout.layoutId}: missing rendered evidence for ${viewportId}.`);
      continue;
    }
    const hardMetrics = [
      ["overflowCount", metrics.overflowCount],
      ["clippedTextCount", metrics.clippedTextCount],
      ["distortedImageCount", metrics.distortedImageCount],
      ["malformedControlCount", metrics.malformedControlCount],
      ["collisionCount", metrics.collisionCount],
      ["wrappedActionCount", metrics.wrappedActionCount],
    ];
    if (viewportId.startsWith("mobile-")) {
      hardMetrics.push(["tooSmallActions", metrics.tooSmallActions], ["oversizedSectionCount", metrics.oversizedSectionCount]);
    }
    for (const [name, value] of hardMetrics) {
      if (value !== 0) failures.push(`${layout.layoutId}/${viewportId}: ${name}=${String(value)}.`);
    }
    if (typeof metrics.scrollWidth !== "number" || typeof metrics.clientWidth !== "number" || metrics.scrollWidth > metrics.clientWidth + 1) {
      failures.push(`${layout.layoutId}/${viewportId}: document overflow ${metrics.scrollWidth}/${metrics.clientWidth}.`);
    }
  }
}

const uniqueIds = new Set((evidence.report ?? []).map((entry) => entry.layoutId));
if (uniqueIds.size !== 20) failures.push(`Expected 20 unique rendered layout IDs, received ${uniqueIds.size}.`);

if (failures.length) {
  console.error("Dental Top-20 rendered certification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const certification = {
  schemaVersion: 1,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  evidenceFile: "test-results/dental-top20-visual-evidence/report.json",
  requiredViewports,
  layouts: (evidence.report ?? []).map((entry) => ({ layoutId: entry.layoutId, passed: true })),
  hardGates: [
    "no document overflow",
    "no child escape",
    "no clipped text",
    "no distorted images",
    "no malformed controls",
    "no text/control collisions",
    "no wrapped CTA labels",
    "mobile touch targets >= 44px",
    "no abnormally tall mobile sections",
  ],
};

await writeFile(certificationPath, JSON.stringify(certification, null, 2), "utf8");
console.log(`Certified 20 Dental layouts against six rendered viewports for ${currentSha}.`);
