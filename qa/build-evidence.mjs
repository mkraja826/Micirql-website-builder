import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const rawDir = path.join(root, "test-results", "evidence-raw");
const outDir = path.join(root, "test-results", "registry-evidence");
const requiredWidths = [320, 360, 390, 430, 1280];
const commitSha = process.env.GITHUB_SHA || process.env.MI_QA_COMMIT_SHA || "0000000000000000000000000000000000000000";
const runId = process.env.GITHUB_RUN_ID || process.env.MI_QA_RUN_ID || "local";
const checkedAt = new Date().toISOString();

await mkdir(outDir, { recursive: true });

let files = [];
try {
  files = (await readdir(rawDir)).filter((file) => file.endsWith(".json"));
} catch {
  console.log("No raw QA evidence found; writing empty manifest.");
}

const grouped = new Map();
for (const file of files) {
  const record = JSON.parse(await readFile(path.join(rawDir, file), "utf8"));
  const key = `${record.designId}@${record.version}`;
  const current = grouped.get(key) || [];
  current.push(record);
  grouped.set(key, current);
}

const manifest = [];
for (const [key, records] of grouped) {
  records.sort((a, b) => a.width - b.width);
  const widths = new Set(records.filter((record) => record.passed).map((record) => record.width));
  const complete = requiredWidths.every((width) => widths.has(width));
  const accessibilityPassed = complete && records.every((record) => record.accessibilityPassed);
  const functionalityPassed = complete && records.every((record) => record.functionalityPassed);
  const performancePassed = complete && records.every((record) => record.performancePassed);

  const evidence = {
    designId: records[0].designId,
    version: records[0].version,
    commitSha,
    runId: String(runId),
    checkedAt,
    viewports: records.map((record) => ({
      width: record.width,
      passed: record.passed,
      overflowPx: record.overflowPx,
      undersizedTargets: record.undersizedTargets,
      missingAltImages: record.missingAltImages,
    })),
    accessibilityPassed,
    functionalityPassed,
    performancePassed,
    visualReviewed: false,
    notes: [
      `Automated QA widths complete: ${complete}`,
      `Peak client JS: ${Math.max(...records.map((record) => record.clientJsKb || 0))} KB`,
      `Generated from ${key} in GitHub run ${runId}`,
    ],
  };

  await writeFile(
    path.join(outDir, `${evidence.designId}-${evidence.version}.json`),
    JSON.stringify(evidence, null, 2),
    "utf8",
  );
  manifest.push(evidence);
}

await writeFile(
  path.join(outDir, "manifest.json"),
  JSON.stringify(
    {
      commitSha,
      runId: String(runId),
      checkedAt,
      requiredWidths,
      designCount: manifest.length,
      evidence: manifest,
    },
    null,
    2,
  ),
  "utf8",
);

console.log(`Generated registry QA evidence for ${manifest.length} designs.`);
