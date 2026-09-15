import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationPath = path.join(
  root,
  "supabase/migrations/20260915060000_add_atomic_publication_transition.sql",
);

if (!fs.existsSync(migrationPath)) {
  throw new Error("Missing atomic publication transition migration.");
}

const sql = fs.readFileSync(migrationPath, "utf8");

const required = [
  ["authenticated actor", /auth\.uid\(\) is null[\s\S]*auth\.uid\(\) <> p_actor_id/i],
  ["workspace tenant boundary", /workspace_members[\s\S]*workspace_id = s\.workspace_id[\s\S]*user_id = auth\.uid\(\)/i],
  ["site row lock", /for update/i],
  ["version belongs to site", /sv\.id = p_version_id[\s\S]*sv\.site_id = p_site_id/i],
  ["cross-site rejection", /publication version does not belong to site/i],
  ["active publication pointer", /published_version_id = p_version_id/i],
  ["published site status", /status = 'published'/i],
  ["previous publication returned", /previous_published_version_id/i],
  ["authenticated-only execution", /grant execute on function public\.set_published_site_version\(uuid, text, uuid\) to authenticated/i],
];

for (const [label, pattern] of required) {
  if (!pattern.test(sql)) throw new Error(`Publication boundary missing: ${label}`);
}

const forbidden = [
  ["historical version deletion", /delete\s+from\s+public\.site_versions/i],
  ["snapshot mutation", /update\s+public\.site_versions[\s\S]*set[\s\S]*snapshot\s*=/i],
  ["version reassignment", /update\s+public\.site_versions[\s\S]*set[\s\S]*site_id\s*=/i],
  ["generation dependency", /generate|candidate_competition|art_director|media_provider/i],
];

for (const [label, pattern] of forbidden) {
  if (pattern.test(sql)) throw new Error(`Publication boundary violates invariant: ${label}`);
}

const versionUpdate = sql.match(/update\s+public\.site_versions([\s\S]*?)where\s+id\s*=\s*p_version_id/i)?.[1] ?? "";
if (!/set\s+status\s*=\s*'published'/i.test(versionUpdate)) {
  throw new Error("Publication transition may only promote the selected historical version status.");
}

console.log("Published publication boundary audit passed.");
console.log("- authenticated workspace membership required");
console.log("- site row locked for atomic pointer transition");
console.log("- cross-site versions rejected");
console.log("- historical snapshots preserved");
console.log("- rollback uses the same exact published_version_id transition");
