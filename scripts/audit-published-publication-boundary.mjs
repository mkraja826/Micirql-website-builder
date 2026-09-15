import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const migrationPath = "supabase/migrations/20260915060000_add_atomic_publication_transition.sql";
const repositoryPath = "src/core/persistence/repository.ts";
const schemaPath = "src/core/persistence/schema.ts";
const supabasePath = "src/core/persistence/supabase.ts";

for (const file of [migrationPath, repositoryPath, schemaPath, supabasePath]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing publication boundary file: ${file}`);
}

const sql = read(migrationPath);
const repository = read(repositoryPath);
const schema = read(schemaPath);
const supabase = read(supabasePath);

const requiredSql = [
  ["authenticated actor", /auth\.uid\(\) is null[\s\S]*auth\.uid\(\) <> p_actor_id/i],
  ["workspace tenant boundary", /workspace_members[\s\S]*workspace_id = s\.workspace_id[\s\S]*user_id = auth\.uid\(\)/i],
  ["site row lock", /for update/i],
  ["version belongs to site", /sv\.id = p_version_id[\s\S]*sv\.site_id = p_site_id/i],
  ["cross-site rejection", /publication version does not belong to site/i],
  ["active publication pointer", /published_version_id = p_version_id/i],
  ["previous publication returned", /previous_published_version_id/i],
  ["authenticated-only execution", /grant execute on function public\.set_published_site_version\(uuid, text, uuid\) to authenticated/i],
];

for (const [label, pattern] of requiredSql) {
  if (!pattern.test(sql)) throw new Error(`Publication boundary missing: ${label}`);
}

const forbiddenSql = [
  ["historical version deletion", /delete\s+from\s+public\.site_versions/i],
  ["snapshot mutation", /update\s+public\.site_versions[\s\S]*set[\s\S]*snapshot\s*=/i],
  ["version reassignment", /update\s+public\.site_versions[\s\S]*set[\s\S]*site_id\s*=/i],
  ["generation dependency", /generate|candidate_competition|art_director|media_provider/i],
];
for (const [label, pattern] of forbiddenSql) {
  if (pattern.test(sql)) throw new Error(`Publication boundary violates invariant: ${label}`);
}

const requiredTs = [
  ["typed transition input", schema, /SetPublishedSiteVersionInput[\s\S]*siteId: string[\s\S]*versionId: string[\s\S]*actorId: string/],
  ["typed transition result", schema, /PublicationTransition[\s\S]*siteId: string[\s\S]*publishedVersionId: string[\s\S]*previousPublishedVersionId: string \| null/],
  ["repository publication method", repository, /setPublishedVersion\(input: SetPublishedSiteVersionInput\): Promise<PublicationTransition>/],
  ["single atomic RPC", supabase, /\.rpc\("set_published_site_version"/],
  ["site identity forwarded", supabase, /p_site_id: input\.siteId/],
  ["version identity forwarded", supabase, /p_version_id: input\.versionId/],
  ["actor identity forwarded", supabase, /p_actor_id: input\.actorId/],
  ["RPC identity verification", supabase, /row\.site_id !== input\.siteId[\s\S]*row\.published_version_id !== input\.versionId/],
  ["previous publication propagated", supabase, /previousPublishedVersionId: row\.previous_published_version_id/],
];
for (const [label, source, pattern] of requiredTs) {
  if (!pattern.test(source)) throw new Error(`Typed publication boundary missing: ${label}`);
}

const setPublishedBody = supabase.match(/async setPublishedVersion\([\s\S]*?\n  }\n}/)?.[0] ?? "";
if (!setPublishedBody) throw new Error("Unable to isolate setPublishedVersion implementation.");

const forbiddenTs = [
  ["direct sites mutation", /\.from\("sites"\)[\s\S]*\.update\(/],
  ["direct versions mutation", /\.from\("site_versions"\)[\s\S]*\.update\(/],
  ["snapshot mutation", /snapshot\s*:/],
  ["generation dependency", /generate|candidateCompetition|artDirector|mediaProvider/i],
];
for (const [label, pattern] of forbiddenTs) {
  if (pattern.test(setPublishedBody)) throw new Error(`Typed publication boundary violates invariant: ${label}`);
}

console.log("Published publication boundary audit passed.");
console.log("- database transition is tenant-scoped and atomic");
console.log("- cross-site versions are rejected");
console.log("- historical snapshots remain immutable");
console.log("- TypeScript repository delegates to the single atomic RPC");
console.log("- returned identities are verified before application use");
console.log("- previous publication identity is preserved for exact rollback");
