import fs from "node:fs";

const evidencePath = "docs/production/release/evidence.json";
const requiredCategories = [
  "security",
  "backup_recovery",
  "load_performance",
  "domains_tls",
  "privacy_legal_support",
  "clean_room_journey",
];

function fail(message) {
  console.error(`V1 release certification failed: ${message}`);
  process.exit(1);
}

function readPolicy() {
  const path = "docs/production/v1-release-certification.md";
  if (!fs.existsSync(path)) fail("release certification policy is missing");
  return fs.readFileSync(path, "utf8");
}

function auditPolicy() {
  const doc = readPolicy();
  for (const required of [
    "does not mean the product is production-ready",
    "backup_recovery",
    "load_performance",
    "domains_tls",
    "privacy_legal_support",
    "clean_room_journey",
    "manual **V1 Production Release Certification** workflow",
    "human reviewer must inspect the referenced artifacts",
    "Do not tag `micirql-v1.0.0`",
  ]) {
    if (!doc.includes(required)) fail(`release policy must retain: ${required}`);
  }
  for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "customer@example.com", "pilot-owner@example.com"]) {
    if (doc.includes(forbidden)) fail("release policy must not include credentials or personal contact details");
  }
  console.log("V1 release certification policy audit passed; no release approval is claimed.");
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has missing or unsupported fields`);
  }
}

function auditEvidence() {
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  } catch {
    fail("release evidence is missing or invalid");
  }

  exactKeys(evidence, [
    "schemaVersion",
    "releaseCandidate",
    "reviewedAt",
    "decision",
    "categories",
    "approverEvidenceRef",
  ], "release evidence");

  if (evidence.schemaVersion !== "micirql.v1.release.v1") fail("unsupported evidence schema");
  if (typeof evidence.releaseCandidate !== "string"
    || !/^v1\.0\.0-rc\.[1-9][0-9]*$/.test(evidence.releaseCandidate)) {
    fail("releaseCandidate must identify a V1 release candidate such as v1.0.0-rc.1");
  }
  if (typeof evidence.reviewedAt !== "string" || !Number.isFinite(Date.parse(evidence.reviewedAt))) {
    fail("reviewedAt must be a valid timestamp");
  }
  if (evidence.decision !== "approved") fail("release decision is not approved");

  if (!Array.isArray(evidence.categories) || evidence.categories.length !== requiredCategories.length) {
    fail("evidence must contain exactly the six required categories");
  }
  const seen = new Set();
  for (const item of evidence.categories) {
    exactKeys(item, ["id", "status", "evidenceRefs"], "category evidence");
    if (!requiredCategories.includes(item.id) || seen.has(item.id)) fail("category IDs must be unique and supported");
    seen.add(item.id);
    if (item.status !== "passed") fail(`category ${item.id} has not passed`);
    if (!Array.isArray(item.evidenceRefs) || item.evidenceRefs.length === 0
      || item.evidenceRefs.some((ref) => typeof ref !== "string" || !/^artifact:[A-Za-z0-9/_-]+$/.test(ref))) {
      fail(`category ${item.id} must include opaque access-controlled artifact references`);
    }
  }
  if (seen.size !== requiredCategories.length) fail("one or more required categories are missing");
  if (typeof evidence.approverEvidenceRef !== "string"
    || !/^artifact:[A-Za-z0-9/_-]+$/.test(evidence.approverEvidenceRef)) {
    fail("authorized approval must have an opaque artifact reference");
  }

  console.log(`V1 release evidence schema passed for ${evidence.releaseCandidate}; human artifact review remains required.`);
}

auditPolicy();
if (process.argv.includes("--evidence")) auditEvidence();
