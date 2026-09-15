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

for (const required of [
  'authorization',
  'Bearer ',
  'client.auth.getUser(token)',
  'userData.user.id',
  'SupabaseSitePersistenceRepository',
  'repository.setPublishedVersion',
  'versionId',
]) {
  if (!route.includes(required)) throw new Error(`Publication endpoint lost required authenticated boundary: ${required}`);
}

for (const forbidden of [
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  'actorId:',
  'p_actor_id:',
]) {
  if (route.includes(forbidden) && forbidden !== 'actorId:') {
    throw new Error(`Publication endpoint must not use privileged publication bypass: ${forbidden}`);
  }
}

// actorId is allowed only when it is derived from the verified Supabase user.
if (!/actorId:\s*userData\.user\.id/.test(route)) {
  throw new Error("Publication actor identity must come only from the verified Supabase user.");
}
if (/body[^\n]{0,120}actorId|actorId[^\n]{0,120}body/.test(route)) {
  throw new Error("Publication endpoint must never accept actorId from the request body.");
}

if (!repository.includes('this.client.rpc("set_published_site_version"')) {
  throw new Error("Publication repository must use the atomic set_published_site_version RPC.");
}
for (const required of ["auth.uid()", "p_actor_id", "previous_published_version_id", "FOR UPDATE"]) {
  if (!migration.includes(required)) throw new Error(`Atomic publication migration lost authorization/transition invariant: ${required}`);
}

console.log("Authenticated publication endpoint boundary passed.");
