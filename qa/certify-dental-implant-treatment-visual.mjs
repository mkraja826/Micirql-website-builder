import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "test-results", "dental-top20-implant-treatment-visual-evidence");
const sourcePath = path.join(sourceDirectory, "report.json");
const destinationDirectory = path.join(root, "test-results", "dental-top20-visual-evidence");
const destinationPath = path.join(destinationDirectory, "implant-treatment-visual-certification.json");
const contract = "dental-top20-implant-treatment-six-viewport-v1";
const treatmentPath = "/treatments/dental-implants";
const requiredViewports = ["mobile-360", "mobile-390", "mobile-430", "tablet-768", "desktop-1024", "desktop-1440"];
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const evidence = JSON.parse(await readFile(sourcePath, "utf8"));
const failures = [];

if (evidence.contract !== contract) failures.push(`Unexpected implant treatment evidence contract ${evidence.contract ?? "missing"}.`);
if (evidence.treatmentPath !== treatmentPath) failures.push(`Unexpected implant treatment path ${evidence.treatmentPath ?? "missing"}.`);
if (evidence.layouts !== 20 || !Array.isArray(evidence.report) || evidence.report.length !== 20) {
  failures.push(`Expected 20 implant treatment layouts, received ${evidence.report?.length ?? 0}.`);
}

const ids = new Set();
for (const layout of evidence.report ?? []) {
  if (!layout?.layoutId) {
    failures.push("Implant treatment evidence contains a layout without an ID.");
    continue;
  }
  ids.add(layout.layoutId);
  if (layout.treatmentPath !== treatmentPath) failures.push(`${layout.layoutId}: treatment path is not ${treatmentPath}.`);
  for (const viewportId of requiredViewports) {
    const metrics = layout.viewports?.[viewportId];
    if (!metrics) {
      failures.push(`${layout.layoutId}: missing implant treatment evidence for ${viewportId}.`);
      continue;
    }
    if (metrics.layoutBlueprintId !== layout.layoutId) {
      failures.push(`${layout.layoutId}/${viewportId}: rendered blueprint identity ${metrics.layoutBlueprintId ?? "missing"} does not match the certified layout.`);
    }
    if (typeof metrics.layoutArchetype !== "string" || !metrics.layoutArchetype.trim()) {
      failures.push(`${layout.layoutId}/${viewportId}: rendered layout archetype is missing.`);
    }
    const zeroMetrics = [
      ["overflowCount", metrics.overflowCount],
      ["clippedTextCount", metrics.clippedTextCount],
      ["wrappedActionCount", metrics.wrappedActionCount],
      ["imageFailureCount", metrics.imageFailureCount],
      ["sectionOverlapCount", metrics.sectionOverlapCount],
      ["placeholderCount", metrics.placeholderCount],
    ];
    if (viewportId.startsWith("mobile-")) {
      zeroMetrics.push(["undersizedActionCount", metrics.undersizedActionCount], ["oversizedSectionCount", metrics.oversizedSectionCount]);
    }
    for (const [name, value] of zeroMetrics) if (value !== 0) failures.push(`${layout.layoutId}/${viewportId}: ${name}=${String(value)}.`);
    if (typeof metrics.scrollWidth !== "number" || typeof metrics.clientWidth !== "number" || metrics.scrollWidth > metrics.clientWidth + 1) {
      failures.push(`${layout.layoutId}/${viewportId}: document overflow ${metrics.scrollWidth}/${metrics.clientWidth}.`);
    }
    if (metrics.breadcrumbCount !== 1 || metrics.breadcrumbCurrent !== "Dental Implants") failures.push(`${layout.layoutId}/${viewportId}: rendered breadcrumb contract failed.`);
    if (metrics.heroHeadingVisible !== true) failures.push(`${layout.layoutId}/${viewportId}: implant hero H1 is not visible.`);
    if (metrics.heroPrimaryHref !== "/contact" || metrics.heroSecondaryHref !== "/#treatments") failures.push(`${layout.layoutId}/${viewportId}: implant hero CTA routing is incorrect.`);
    if (metrics.faqItemCount !== 3) failures.push(`${layout.layoutId}/${viewportId}: expected three implant FAQ disclosures.`);
    if (metrics.finalCtaHref !== "/contact") failures.push(`${layout.layoutId}/${viewportId}: final implant CTA does not route to consultation.`);
  }
}

if (ids.size !== 20) failures.push(`Expected 20 unique implant treatment layout IDs, received ${ids.size}.`);

if (failures.length) {
  console.error("Dental implant treatment rendered certification failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

await mkdir(destinationDirectory, { recursive: true });
const certification = {
  schemaVersion: 2,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  contract,
  surface: "builder-preview-treatment-page",
  treatmentPath,
  sourceEvidenceFile: "test-results/dental-top20-implant-treatment-visual-evidence/report.json",
  sourceTest: "qa/dental-top20-implant-treatment-visual-evidence.spec.ts",
  requiredViewports,
  certifiedLayoutIds: [...ids].sort(),
  requiredChecks: [
    "20 certified Dental layout IDs render the generated Dental Implants page",
    "each implant Preview root exposes the exact certified layoutBlueprintId being captured",
    "implant page is measured at 360, 390, 430, 768, 1024 and 1440 widths",
    "no document overflow or child escape",
    "no clipped treatment-page typography",
    "no malformed or multi-line action geometry",
    "no failed, distorted or out-of-bounds treatment imagery",
    "no overlapping treatment-page sections",
    "no empty treatment hero media placeholder",
    "visible breadcrumb identifies Dental Implants as current page",
    "implant hero routes to /contact and /#treatments",
    "implant FAQ exposes exactly three complete disclosures",
    "final implant conversion CTA routes to /contact",
    "mobile interactive targets are at least 44px",
    "mobile treatment sections are not abnormally tall",
  ],
};

await writeFile(destinationPath, JSON.stringify(certification, null, 2), "utf8");
console.log(`Certified Dental Implants rendered treatment pages with recorded exact blueprint identity for ${ids.size} Top-20 layouts across six viewports at ${currentSha}.`);
