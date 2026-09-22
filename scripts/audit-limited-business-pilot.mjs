import fs from "node:fs";

const minimumBusinesses = 5;
const maximumBusinesses = 10;
const minimumIndustries = 4;
const requiredJourney = [
  "briefSubmitted",
  "siteSelected",
  "edited",
  "published",
  "publicEnquirySubmitted",
  "republished",
];
const supportedIndustries = new Set([
  "dental",
  "clinic",
  "restaurant",
  "hospitality",
  "real-estate",
  "professional-services",
  "construction",
  "education",
]);

function fail(message) {
  console.error(`Limited pilot audit failed: ${message}`);
  process.exit(1);
}

function auditPolicy() {
  const docPath = "docs/production/limited-business-pilot.md";
  const doc = fs.readFileSync(docPath, "utf8");
  for (const required of [
    "5–10 participating businesses across at least 4 industries",
    "review at least 20 candidates",
    "0 open P0 issues and 0 unresolved P1 issues",
    "Tenant-isolation review passed",
    "No manual database intervention",
    "pseudonymous pilot ID",
    "workflow dispatch",
    "does not represent a pilot pass until anonymized evidence has been collected",
  ]) {
    if (!doc.includes(required)) fail(`pilot protocol must retain: ${required}`);
  }
  for (const forbidden of ["pilot-owner@example.com", "customer@example.com", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (doc.includes(forbidden)) fail("pilot protocol must not include contact details or credentials");
  }
}

function auditEvidence(path) {
  if (!path || path.startsWith("/") || path.split(/[\\/]/).includes("..")) {
    fail("evidence path must be a repository-relative file path");
  }
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    fail("anonymized evidence JSON is missing or invalid");
  }
  if (!evidence || evidence.schemaVersion !== "micirql.v1.pilot.v1") fail("unsupported evidence schema");
  if (!Number.isFinite(Date.parse(evidence.startedAt)) || !Number.isFinite(Date.parse(evidence.completedAt))
    || Date.parse(evidence.startedAt) > Date.parse(evidence.completedAt)) fail("pilot dates are invalid");
  if (!Array.isArray(evidence.businesses)
    || evidence.businesses.length < minimumBusinesses
    || evidence.businesses.length > maximumBusinesses) fail("pilot must include 5–10 businesses");

  const ids = new Set();
  const industries = new Set();
  for (const business of evidence.businesses) {
    if (!business || typeof business !== "object") fail("business evidence must be an object");
    if (!/^pilot-(0[1-9]|10)$/.test(business.pilotId) || ids.has(business.pilotId)) {
      fail("business IDs must be unique pseudonymous pilot-01 through pilot-10 values");
    }
    ids.add(business.pilotId);
    if (!supportedIndustries.has(business.industry)) fail("business industry is unsupported");
    industries.add(business.industry);

    const journey = business.journey;
    if (!journey || requiredJourney.some((key) => journey[key] !== true)
      || !Number.isInteger(journey.candidatesReviewed)
      || journey.candidatesReviewed < 20) fail(`${business.pilotId} did not complete the full owner journey`);
    if (business.openP0 !== 0 || business.unresolvedP1 !== 0) {
      fail(`${business.pilotId} has open P0 or unresolved P1 issues`);
    }
    if (business.tenantIsolationPassed !== true
      || !/^artifact:[A-Za-z0-9/_-]+$/.test(business.tenantIsolationEvidenceRef ?? "")) {
      fail(`${business.pilotId} lacks passing tenant-isolation evidence`);
    }
    if (business.manualDatabaseIntervention !== false) {
      fail(`${business.pilotId} required manual database intervention`);
    }
    if (!Array.isArray(business.evidenceRefs) || business.evidenceRefs.length === 0
      || business.evidenceRefs.some((ref) => typeof ref !== "string" || !/^artifact:[A-Za-z0-9/_-]+$/.test(ref))) {
      fail(`${business.pilotId} evidence references must be opaque artifact IDs`);
    }
    for (const key of ["name", "email", "phone", "domain", "tenantId", "enquiryBody", "credentials"]) {
      if (key in business) fail("evidence must not contain personally identifying, tenant, or credential fields");
    }
  }
  if (industries.size < minimumIndustries) fail("pilot must cover at least 4 industries");
  console.log(`Limited pilot evidence passed: ${ids.size} businesses across ${industries.size} industries.`);
}

auditPolicy();
const evidenceIndex = process.argv.indexOf("--evidence");
if (evidenceIndex < 0) {
  console.log("Limited pilot policy audit passed; no pilot outcome is claimed.");
} else {
  auditEvidence(process.argv[evidenceIndex + 1]);
}
