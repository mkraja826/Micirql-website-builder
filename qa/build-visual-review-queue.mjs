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

const requiredViewports = [
  { label: "mobile-360", width: 360, height: 800 },
  { label: "mobile-390", width: 390, height: 844 },
  { label: "mobile-430", width: 430, height: 932 },
  { label: "tablet-768", width: 768, height: 1024 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

const hardRejects = [
  "horizontal-overflow",
  "content-overlap",
  "fixed-or-sticky-control-covering-content",
  "clipped-heading-or-cta",
  "unreadable-contrast",
  "broken-grid-collapse",
  "inconsistent-button-system",
  "bad-image-crop-or-stretch",
  "desktop-only-mobile-composition",
  "placeholder-looking-primary-section",
];

const rubric = {
  visualHierarchy: { weight: 15, description: "Immediate focal point, deliberate heading hierarchy, and a clear scan path." },
  typography: { weight: 15, description: "Premium font pairing, scale, line-height, measure, wrapping, and role-specific typography." },
  spacingGeometry: { weight: 15, description: "Consistent gutters, section rhythm, grid alignment, card padding, dimensions, and proportion." },
  composition: { weight: 15, description: "Art-directed balance, varied section rhythm, strong media/content relationship, and narrative flow." },
  colorContrast: { weight: 10, description: "Deliberate palette hierarchy, AA-readable text, restrained accents, and coherent surfaces." },
  imageryArtDirection: { weight: 10, description: "Relevant media, controlled crops, purposeful ratios, no repetition, and authentic visual treatment." },
  mobilePolish: { weight: 15, description: "360–430px layouts feel intentionally designed, touch-safe, readable, and free of collisions or overflow." },
  premiumFinish: { weight: 5, description: "Borders, radii, shadows, states, alignment, and micro-interactions feel agency-grade rather than template-default." },
};

const queue = (report.entries ?? [])
  .filter((entry) => entry.machinePassed)
  .map((entry) => ({
    designId: entry.designId,
    version: entry.version,
    status: "awaiting-review",
    minimumScore: 90,
    minimumCategoryScore: 8,
    requiredViewports,
    hardRejects,
    rubric,
    scores: Object.fromEntries(Object.keys(rubric).map((key) => [key, null])),
    viewportApprovals: Object.fromEntries(requiredViewports.map((viewport) => [viewport.label, null])),
    hardRejectFindings: [],
    weightedScore: null,
    decision: null,
    notes: [],
  }));

const manifest = {
  commitSha: report.commitSha,
  runId: report.runId,
  generatedAt: new Date().toISOString(),
  total: queue.length,
  promotionThreshold: 90,
  minimumCategoryScore: 8,
  requiredViewports,
  hardRejects,
  rubric,
  queue,
};

await writeFile(path.join(outDir, "queue.json"), JSON.stringify(manifest, null, 2), "utf8");
await writeFile(
  path.join(outDir, "review-guide.md"),
  [
    "# MiCirql Premium Visual Review",
    "",
    "Only machine-passing components enter this queue. Passing machine QA does not make a design premium.",
    "",
    "## Promotion rule",
    "A design requires >= 90/100 weighted visual score, every rubric category >= 8/10, protocol score >= 90, approval at all required viewports, and zero hard-reject findings.",
    "",
    "## Required viewport evidence",
    ...requiredViewports.map((viewport) => `- ${viewport.label}: ${viewport.width}x${viewport.height}`),
    "",
    "## Automatic rejection conditions",
    ...hardRejects.map((item) => `- ${item}`),
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

console.log(`Premium visual review queue: ${queue.length} machine-passing components; promotion requires 90/100 and all five viewport approvals.`);
