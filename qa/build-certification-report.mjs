import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidencePath = path.join(root, "test-results", "registry-evidence", "manifest.json");
const outDir = path.join(root, "test-results", "certification");
const scope = process.env.MI_QA_SCOPE === "full" ? "full" : "core";
await mkdir(outDir, { recursive: true });

let manifest = { evidence: [], commitSha: "unknown", runId: "unknown", checkedAt: new Date().toISOString() };
try {
  manifest = JSON.parse(await readFile(evidencePath, "utf8"));
} catch {
  console.log("No registry QA evidence manifest found; writing empty certification report.");
}

const entries = manifest.evidence.map((evidence) => {
  const viewportPassed = Array.isArray(evidence.viewports) && evidence.viewports.length > 0 && evidence.viewports.every((viewport) => viewport.passed);
  const machinePassed = Boolean(viewportPassed && evidence.accessibilityPassed && evidence.functionalityPassed && evidence.performancePassed);
  const blockers = [];
  if (!viewportPassed) blockers.push("viewport QA incomplete or failed");
  if (!evidence.accessibilityPassed) blockers.push("accessibility QA failed");
  if (!evidence.functionalityPassed) blockers.push("functionality QA failed");
  if (!evidence.performancePassed) blockers.push("performance QA failed");

  return {
    designId: evidence.designId,
    version: evidence.version,
    machinePassed,
    certificationStage: machinePassed ? "awaiting-visual-review" : "blocked-machine-qa",
    blockers,
    requiredNextEvidence: machinePassed
      ? ["approved visual review score >= 80", "protocol score >= 90", "mobile + desktop production previews"]
      : ["fix machine QA blockers and rerun Section QA"],
  };
});

const report = {
  scope,
  commitSha: manifest.commitSha,
  runId: manifest.runId,
  checkedAt: manifest.checkedAt,
  total: entries.length,
  machinePassed: entries.filter((entry) => entry.machinePassed).length,
  machineBlocked: entries.filter((entry) => !entry.machinePassed).length,
  awaitingVisualReview: entries.filter((entry) => entry.certificationStage === "awaiting-visual-review").map((entry) => entry.designId),
  blocked: entries.filter((entry) => !entry.machinePassed).map((entry) => ({ designId: entry.designId, blockers: entry.blockers })),
  entries,
};

const title = scope === "full" ? "# MiCirql Full Catalog Certification" : "# MiCirql Premium Core Certification";

await writeFile(path.join(outDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
await writeFile(
  path.join(outDir, "summary.md"),
  [
    title,
    "",
    `Scope: ${scope}`,
    `Machine QA passed: ${report.machinePassed}/${report.total}`,
    `Machine QA blocked: ${report.machineBlocked}/${report.total}`,
    "",
    "## Awaiting visual review",
    ...(report.awaitingVisualReview.length ? report.awaitingVisualReview.map((id) => `- ${id}`) : ["- None"]),
    "",
    "## Machine QA blockers",
    ...(report.blocked.length ? report.blocked.map((item) => `- ${item.designId}: ${item.blockers.join(", ")}`) : ["- None"]),
    "",
    "No component is promoted automatically. Production promotion still requires approved visual review and protocol gates.",
  ].join("\n"),
  "utf8",
);

console.log(`Certification report (${scope}): ${report.machinePassed}/${report.total} passed machine QA.`);
