import fs from "node:fs";

const boundary = fs.readFileSync("src/core/publish/public-runtime.tsx", "utf8");
const repository = fs.readFileSync("src/core/persistence/supabase.ts", "utf8");

const checks = [
  [boundary.includes("repository.loadPublished({ siteId })"), "public runtime must enter through loadPublished"],
  [boundary.includes("renderPublishedSnapshot({"), "public runtime must delegate to the canonical snapshot renderer"],
  [boundary.includes("site.versionId !== site.publishedVersionId"), "public runtime must reject non-active revisions"],
  [boundary.includes("snapshot: site.snapshot"), "public runtime must render the persisted snapshot directly"],
  [repository.includes('.eq("id", site.published_version_id)'), "published persistence must load the exact active version id"],
  [repository.includes('.eq("site_id", site.id)'), "published persistence must bind the revision to its site"],
  [repository.includes('.eq("status", "published")'), "published persistence must reject draft sites"],
];

const forbidden = [
  "generateCandidates",
  "generateSite",
  "candidateCompetition",
  "ArtDirector",
  "repairCandidate",
  "resolveMedia",
  "searchMedia",
  "openai",
  "anthropic",
  "gemini",
];

for (const token of forbidden) {
  checks.push([!boundary.toLowerCase().includes(token.toLowerCase()), `public runtime must not reference ${token}`]);
}

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error("Published public runtime audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Published public runtime audit passed: active immutable snapshot -> canonical renderer, with no generation/provider path.");
