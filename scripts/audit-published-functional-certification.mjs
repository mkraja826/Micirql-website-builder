import fs from "node:fs";

const requiredFiles = [
  "src/core/publish/functional-certification.ts",
  "src/core/publish/functional-certification-runner.ts",
  "src/core/publish/browser-certification.ts",
  "src/core/publish/functional-certification-portfolio.ts",
  "src/core/publish/public-runtime.tsx",
  "src/rendering/published-snapshot.tsx",
  "scripts/published-browser-probe.mjs",
  "scripts/run-published-browser-matrix.mjs",
  "scripts/run-published-publication-certification.mjs",
  "package.json",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing published certification boundary: ${file}`);
}

const [contract, runner, browser, portfolio, runtime, renderer, probe, matrix, orchestrator, packageJson] =
  requiredFiles.map((file) => fs.readFileSync(file, "utf8"));

const industries = [
  "healthcare",
  "restaurant",
  "real-estate",
  "construction-corporate",
  "saas-professional-services",
];

for (const industry of industries) {
  if (!contract.includes(`\"${industry}\"`) || !portfolio.includes(`industry: \"${industry}\"`) || !matrix.includes(`\"${industry}\"`)) {
    throw new Error(`Published certification lost required cross-industry coverage: ${industry}`);
  }
}

if (!portfolio.includes("Pearl Dental") || !portfolio.includes("Pearl Dental, Hyderabad")) {
  throw new Error("Pearl Dental must remain the permanent healthcare flagship benchmark.");
}

for (const width of [360, 390, 430, 768, 1440, 1920]) {
  if (!contract.includes(`width: ${width}`) || !matrix.includes(`width: ${width}`)) {
    throw new Error(`Published certification lost viewport ${width}px.`);
  }
}

for (const invariant of ["versionOneId", "versionTwoId", "rollbackDeterminism", "publicationIdentity", "generationIndependence"]) {
  if (!contract.includes(invariant) || !runner.includes(invariant)) throw new Error(`Published certification lost invariant: ${invariant}`);
}

if (!runner.includes("browserEvidenceProvider")) throw new Error("Published certification must require browser evidence.");
if (/responsive:\s*true|navigation:\s*true|deepLinks:\s*true|generationIndependence:\s*true/.test(runner)) {
  throw new Error("Published certification contains a hard-coded browser success flag.");
}

for (const evidence of ["horizontalOverflow", "consoleErrors", "failedRequests", "navigationTargets", "PUBLISHED_CERTIFICATION_VIEWPORTS"]) {
  if (!browser.includes(evidence)) throw new Error(`Browser certification lost required evidence: ${evidence}`);
}

for (const evidence of ["chromium.launch", "page.goto", "requestfailed", "data-published-version-id", "horizontalOverflow"]) {
  if (!probe.includes(evidence)) throw new Error(`Playwright probe lost concrete browser evidence: ${evidence}`);
}

if (!packageJson.includes('"@playwright/test"')) throw new Error("Published browser certification requires Playwright.");

for (const forbidden of ["generate", "generation", "candidate", "media-provider", "openai", "anthropic", "gemini"]) {
  if (!browser.toLowerCase().includes(forbidden) || !matrix.toLowerCase().includes(forbidden)) {
    throw new Error(`Browser certification no longer guards runtime dependency: ${forbidden}`);
  }
}

if (!runtime.includes("repository.loadPublished") || !runtime.includes("renderPublishedSnapshot")) {
  throw new Error("Public runtime must continue to load the persisted publication and canonical renderer.");
}

if (!renderer.includes("runtime.renderedVersionId !== runtime.publishedVersionId") ||
    !renderer.includes("data-published-version-id={runtime.publishedVersionId}")) {
  throw new Error("Canonical renderer must expose only its validated immutable publication identity.");
}

if (!matrix.includes("expectedVersionForPhase(binding, phase)")) {
  throw new Error("Browser matrix must resolve expected publication identity per industry binding.");
}
if (!matrix.includes("Global PUBLISHED_CERTIFICATION_EXPECTED_VERSION is forbidden")) {
  throw new Error("Browser matrix must reject a global cross-site publication identity.");
}

for (const phase of ["v1", "v2", "rollback-v1"]) {
  if (!orchestrator.includes(`runMatrix(\"${phase}\")`)) throw new Error(`Publication orchestrator lost ${phase} browser phase.`);
}
if (!orchestrator.includes('transitionPortfolio("versionOneId")') || !orchestrator.includes('transitionPortfolio("versionTwoId")')) {
  throw new Error("Publication orchestrator must perform real V1/V2 publication transitions.");
}
if (!orchestrator.includes("previousPublishedVersionId") || !orchestrator.includes("PUBLISHED_CERTIFICATION_ACCESS_TOKEN")) {
  throw new Error("Publication orchestrator must verify rollback lineage through an authenticated boundary.");
}
if (/PUBLISHED_CERTIFICATION_EXPECTED_VERSION\s*:/.test(orchestrator)) {
  throw new Error("Publication orchestrator must not inject one version identity across the portfolio.");
}

console.log("Published functional certification source gate passed.");
