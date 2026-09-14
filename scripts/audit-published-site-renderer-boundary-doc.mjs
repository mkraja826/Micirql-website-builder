import fs from "node:fs";

const doc = fs.readFileSync("docs/production/published-site-renderer-boundary.md", "utf8");
const required = [
  "sites.status = 'published'",
  "sites.published_version_id",
  "exact `published_version_id`",
  "never select the latest revision",
  "never",
];

const missing = required.filter((item) => !doc.includes(item));
if (missing.length) {
  console.error(`Published renderer boundary documentation is missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Published renderer boundary documentation audit passed.");
