import fs from "node:fs";

const routePath = "app/api/sites/[siteId]/publish/route.ts";
const repositoryPath = "src/core/persistence/supabase.ts";
const migrationPath = "supabase/migrations/20260915060000_add_atomic_publication_transition.sql";

for (const path of [routePath, repositoryPath, migrationPath]) {
  if (!fs.existsSync(path)) throw new Error(`Missing publication boundary file: ${path}`);
}

const route = fs.readFileSync(routePath, "utf8");
const repository = fs.readFileSync(repositoryPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");
const normalizedMigration = migration.toLowerCase();

for (const required of [
  "authorization",
  "Bearer ",
  "client.auth.getUser(token)",
  "userId: data.user.id",
  "SupabaseSitePersistenceRepository",
  "repository.setPublishedVersion",
  "versionId",
]) {
  if (!route.includes(required)) throw new Error(`Publication endpoint lost required authenticated boundary: ${required}`);
}

for (const required of [
  "export async function GET(",
  'from("workspace_members")',
  'from("sites")',
  'repository.loadPublished({ siteId })',
  "matchesRequestedVersion",
  "isDefinitivePublicationRejection(error)",
  'outcome: "unknown"',
  "recoveryUrl",
]) {
  if (!route.includes(required)) throw new Error(`Publication recovery boundary missing: ${required}`);
}

for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "service_role", "p_actor_id:"]) {
  if (route.includes(forbidden)) {
    throw new Error(`Publication endpoint must not use privileged publication bypass: ${forbidden}`);
  }
}

if (!/actorId:\s*auth\.userId/.test(route)) {
  throw new Error("Publication actor identity must come only from the verified Supabase user.");
}
if (/body[^\n]{0,120}actorId|actorId[^\n]{0,120}body/.test(route)) {
  throw new Error("Publication endpoint must never accept actorId from the request body.");
}

if (!/if \(isDefinitivePublicationRejection\(error\)\)[\s\S]*?statusCode: 403[\s\S]*?return reply\(requestId,[\s\S]*?, 403\)/.test(route)) {
  throw new Error("Definitive authorization or publication rejections must return 403.");
}
if (!/record\(eventContext, "uncertain"[\s\S]*?failureCode: "publication_outcome_unknown"[\s\S]*?outcome: "unknown"[\s\S]*?recoveryUrl:[\s\S]*?\}, 503\)/.test(route)) {
  throw new Error("Uncertain publication outcomes must return a reconciliation URL and 503.");
}
if (!/const matchesRequestedVersion = published\.versionId === requestedVersionId/.test(route) || !route.includes("matchesRequestedVersion,")) {
  throw new Error("Publication reconciliation must compare the active persisted version to the requested version.");
}

if (!repository.includes('this.client.rpc("set_published_site_version"')) {
  throw new Error("Publication repository must use the atomic set_published_site_version RPC.");
}
for (const required of ["auth.uid()", "p_actor_id", "previous_published_version_id", "for update"]) {
  if (!normalizedMigration.includes(required.toLowerCase())) {
    throw new Error(`Atomic publication migration lost authorization/transition invariant: ${required}`);
  }
}

console.log("Authenticated publication endpoint and recovery boundary passed.");
