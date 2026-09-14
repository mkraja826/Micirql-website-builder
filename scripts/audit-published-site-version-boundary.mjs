import fs from "node:fs";

const schema = fs.readFileSync("src/core/persistence/schema.ts", "utf8");
const repository = fs.readFileSync("src/core/persistence/repository.ts", "utf8");
const supabase = fs.readFileSync("src/core/persistence/supabase.ts", "utf8");

const failures = [];

if (!schema.includes('status: "published"') || !schema.includes("publishedVersionId: string")) {
  failures.push("published durable-site identity is not explicit in the persistence schema");
}

if (!repository.includes("loadPublished(input: LoadPublishedSiteInput)")) {
  failures.push("persistence repository does not expose an authoritative published-site loader");
}

const loadPublishedStart = supabase.indexOf("async loadPublished(");
if (loadPublishedStart === -1) {
  failures.push("Supabase persistence repository is missing loadPublished");
} else {
  const loadPublished = supabase.slice(loadPublishedStart);
  if (!loadPublished.includes('.eq("status", "published")')) {
    failures.push("published-site load does not require published site status");
  }
  if (!loadPublished.includes("site.published_version_id")) {
    failures.push("published-site load does not require published_version_id");
  }
  if (!loadPublished.includes('.eq("id", site.published_version_id)')) {
    failures.push("published-site load does not fetch the exact published version id");
  }
  if (!loadPublished.includes('.eq("site_id", site.id)')) {
    failures.push("published-site version is not constrained to the same durable site");
  }
  if (loadPublished.includes('.order("version_number"')) {
    failures.push("published-site load must not select the latest version");
  }
}

if (failures.length) {
  console.error("Published site version boundary audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Published site version boundary audit passed.");
