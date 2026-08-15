import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const certificationPath = path.join(root, "test-results", "certification", "report.json");
const outDir = path.join(root, "test-results", "visual-review");
await mkdir(outDir, { recursive: true });

let report = { entries: [], commitSha: "unknown", runId: "unknown", checkedAt: new Date().toISOString() };
try {
  report = JSON.parse(await readFile(certificationPath, "utf8"));
} catch {
  console.log("No certification report found; writing empty visual review queue.");
}

const rubric = {
  visualHierarchy: { weight: 20, description: "Clear focal point, heading hierarchy and scan path." },
  spacingRhythm: { weight: 15, description: "Balanced whitespace, section breathing room and consistent spacing rhythm." },
  typography: { weight: 15, description: "Premium scale, readable measure, controlled wrapping and strong hierarchy." },
  composition: { weight: 20, description: "Strong layout balance, image/content relationship and visual rhythm." },
  brandFlexibility: { weight: 10, description: "Works across multiple logo-derived palettes without losing quality." },
  mobilePolish: { weight: 10, description: "Feels intentionally designed on 320–430px, not merely stacked." },
  premiumFinish: { weight: 10, description: "Details, alignment, states and overall finish feel agency-grade." },
};

const queue = (report.entries ?? [])
  .filter((entry) => entry.machinePassed)
  .map((entry) => ({
    designId: entry.designId,
    version: entry.version,
    status: "awaiting-review",
    minimumScore: 80,
    requiredDesktopPreview: 1280,
    requiredMobilePreview: 390,
    rubric,
    scores: {
      visualHierarchy: null,
      spacingRhythm: null,
      typography: null,
      composition: null,
      brandFlexibility: null,
      mobilePolish: null,
      premiumFinish: null,
    },
    weightedScore: null,
    decision: null,
    notes: [],
  }));

const manifest = {
  commitSha: report.commitSha,
  runId: report.runId,
  generatedAt: new Date().toISOString(),
  total: queue.length,
  rubric,
  queue,
};

await writeFile(path.join(outDir, "queue.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(
  path.join(outDir, "review-guide.md"),
  [
    "# MiCirql Premium Visual Review",
    "",
    "Only components that passed machine QA appear here.",
    "",
    "## Promotion rule",
    "A component requires a weighted visual score of at least 80/100, protocol score >= 90, and approved 390px + 1280px previews before production promotion.",
    "",
    "## Rubric",
    ...Object.entries(rubric).map(([key, item]) => `- ${key} (${item.weight}%): ${item.description}`),
    "",
    `Queue size: ${queue.length}`,
    "",
    ...queue.map((item) => `- ${item.designId}@${item.version}`),
  ].join("\n"),
  "utf8",
);

console.log(`Visual review queue: ${queue.length} machine-passing components.`);
