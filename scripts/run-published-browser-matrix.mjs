import fs from "node:fs";
import { probePublishedSite } from "./published-browser-probe.mjs";

const REQUIRED_INDUSTRIES = [
  "healthcare",
  "restaurant",
  "real-estate",
  "construction-corporate",
  "saas-professional-services",
];

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1000 },
  { width: 1920, height: 1080 },
];

function readBindings(path) {
  if (!path || !fs.existsSync(path)) throw new Error("Set PUBLISHED_CERTIFICATION_BINDINGS to a JSON bindings file.");
  const parsed = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Published certification bindings must be a JSON array.");
  return parsed;
}

function validateBindings(bindings) {
  const byIndustry = new Map(bindings.map((binding) => [binding.industry, binding]));
  for (const industry of REQUIRED_INDUSTRIES) {
    const binding = byIndustry.get(industry);
    if (!binding) throw new Error(`Missing certification binding for ${industry}.`);
    for (const key of ["siteId", "versionOneId", "versionTwoId"]) {
      if (typeof binding[key] !== "string" || !binding[key].trim()) throw new Error(`Incomplete ${key} for ${industry}.`);
    }
    if (binding.versionOneId === binding.versionTwoId) throw new Error(`V1 and V2 must differ for ${industry}.`);
    if (!Array.isArray(binding.pageSlugs) || binding.pageSlugs.length === 0) throw new Error(`Missing pageSlugs for ${industry}.`);
  }
  return byIndustry;
}

function expectedVersionForPhase(binding, phase) {
  if (phase === "v1" || phase === "rollback-v1") return binding.versionOneId;
  if (phase === "v2") return binding.versionTwoId;
  throw new Error(`Unsupported publication certification phase: ${phase}.`);
}

function assertObservation(industry, phase, expectedVersionId, observation) {
  for (const page of observation.pages) {
    if (page.status < 200 || page.status >= 400) throw new Error(`${industry} ${phase}: ${page.url} returned ${page.status}.`);
    if (page.versionId !== expectedVersionId) throw new Error(`${industry} ${phase}: browser served ${page.versionId ?? "no version"}, expected ${expectedVersionId}.`);
    if (page.horizontalOverflow) throw new Error(`${industry} ${phase}: horizontal overflow at ${observation.width}px.`);
    if (page.consoleErrors.length) throw new Error(`${industry} ${phase}: browser console errors: ${page.consoleErrors.join(" | ")}`);
    const forbidden = page.failedRequests.filter((url) => /generate|generation|candidate|art-director|media-provider|openai|anthropic|gemini/i.test(url));
    if (forbidden.length) throw new Error(`${industry} ${phase}: published runtime depends on generation provider: ${forbidden.join(", ")}`);
  }
}

async function certifyPhase(baseUrl, industry, binding, phase, expectedVersionId) {
  const observations = [];
  for (const viewport of VIEWPORTS) {
    const observation = await probePublishedSite({
      baseUrl,
      siteId: binding.siteId,
      pageSlugs: binding.pageSlugs,
      expectedVersionId,
      ...viewport,
    });
    assertObservation(industry, phase, expectedVersionId, observation);
    observations.push(observation);
  }
  return { phase, expectedVersionId, observations };
}

const baseUrl = process.env.PUBLISHED_CERTIFICATION_BASE_URL;
if (!baseUrl) throw new Error("Set PUBLISHED_CERTIFICATION_BASE_URL to the deployed certification runtime.");

const phase = process.env.PUBLISHED_CERTIFICATION_PHASE;
if (!phase) throw new Error("Set PUBLISHED_CERTIFICATION_PHASE to v1, v2, or rollback-v1.");
if (process.env.PUBLISHED_CERTIFICATION_EXPECTED_VERSION) {
  throw new Error("Global PUBLISHED_CERTIFICATION_EXPECTED_VERSION is forbidden; versions must resolve per industry binding.");
}

const bindings = validateBindings(readBindings(process.env.PUBLISHED_CERTIFICATION_BINDINGS));
const report = [];

for (const industry of REQUIRED_INDUSTRIES) {
  const binding = bindings.get(industry);
  const expectedVersionId = expectedVersionForPhase(binding, phase);
  report.push({ industry, ...(await certifyPhase(baseUrl, industry, binding, phase, expectedVersionId)) });
}

const output = process.env.PUBLISHED_CERTIFICATION_REPORT ?? "published-functional-certification-report.json";
fs.writeFileSync(output, `${JSON.stringify({ baseUrl, generatedAt: new Date().toISOString(), report }, null, 2)}\n`);
console.log(`Published browser matrix passed for ${report.length} industries × ${VIEWPORTS.length} viewports during ${phase}. Report: ${output}`);
