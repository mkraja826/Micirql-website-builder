import fs from "node:fs";

const requiredFiles = [
  "src/core/publish/functional-certification.ts",
  "src/core/publish/functional-certification-runner.ts",
  "src/core/publish/browser-certification.ts",
  "src/core/publish/public-runtime.tsx",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing published certification boundary: ${file}`);
}

const contract = fs.readFileSync(requiredFiles[0], "utf8");
const runner = fs.readFileSync(requiredFiles[1], "utf8");
const browser = fs.readFileSync(requiredFiles[2], "utf8");
const runtime = fs.readFileSync(requiredFiles[3], "utf8");

for (const industry of [
  "healthcare",
  "restaurant",
  "real-estate",
  "construction-corporate",
  "saas-professional-services",
]) {
  if (!contract.includes(`\"${industry}\"`)) {
    throw new Error(`Published certification lost required industry: ${industry}`);
  }
}

for (const width of [360, 390, 430, 768, 1440, 1920]) {
  if (!contract.includes(`width: ${width}`)) {
    throw new Error(`Published certification lost viewport ${width}px.`);
  }
}

for (const invariant of [
  "versionOneId",
  "versionTwoId",
  "rollbackDeterminism",
  "publicationIdentity",
  "generationIndependence",
]) {
  if (!contract.includes(invariant) || !runner.includes(invariant)) {
    throw new Error(`Published certification lost invariant: ${invariant}`);
  }
}

if (!runner.includes("browserEvidenceProvider")) {
  throw new Error("Published certification must require browser evidence; static placeholders are forbidden.");
}

if (/responsive:\s*true|navigation:\s*true|deepLinks:\s*true|generationIndependence:\s*true/.test(runner)) {
  throw new Error("Published certification contains a hard-coded browser success flag.");
}

for (const evidence of [
  "horizontalOverflow",
  "consoleErrors",
  "failedRequests",
  "navigationTargets",
  "PUBLISHED_CERTIFICATION_VIEWPORTS",
]) {
  if (!browser.includes(evidence)) {
    throw new Error(`Browser certification lost required evidence: ${evidence}`);
  }
}

for (const forbidden of ["generate", "generation", "candidate", "media-provider", "openai", "anthropic", "gemini"]) {
  if (!browser.toLowerCase().includes(forbidden)) {
    throw new Error(`Browser certification no longer guards runtime dependency: ${forbidden}`);
  }
}

if (!runtime.includes("repository.loadPublished") || !runtime.includes("renderPublishedSnapshot")) {
  throw new Error("Public runtime must continue to load the persisted publication and canonical renderer.");
}

console.log("Published functional certification source gate passed.");
