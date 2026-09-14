import fs from "node:fs";

const migrationPath = "supabase/migrations/20260914080000_add_site_action_binding_management.sql";
const modulePath = "src/core/capabilities/binding-management.ts";
const migration = fs.readFileSync(migrationPath, "utf8");
const moduleSource = fs.readFileSync(modulePath, "utf8");

const checks = [
  ["authenticated user required", /auth\.uid\(\)/.test(migration) && /authentication required/.test(migration)],
  ["workspace role guard", /has_workspace_role\(p_workspace_id, array\['owner','admin','editor'\]\)/.test(migration)],
  ["site ownership guard", /s\.id = p_site_id/.test(migration) && /s\.workspace_id = p_workspace_id/.test(migration)],
  ["active registry required", /site_action_registry/.test(migration) && /status = 'active'/.test(migration)],
  ["capability must be registered", /p_capability_key = any\(v_registry\.capability_keys\)/.test(migration)],
  ["system evidence generated internally", /v_evidence_id := concat/.test(migration) && /'system'/.test(migration)],
  ["anon execution revoked", /revoke all on function public\.set_site_action_binding[\s\S]*from public, anon/.test(migration)],
  ["authenticated execution granted", /grant execute on function public\.set_site_action_binding[\s\S]*to authenticated/.test(migration)],
  ["no service role shortcut", !/service_role/i.test(migration) && !/service_role/i.test(moduleSource)],
  ["product layer uses RPC", /client\.rpc\("set_site_action_binding"/.test(moduleSource)],
  ["product layer loads active registry", /loadActiveSiteAction/.test(moduleSource)],
  ["product layer returns verified binding", /backendBindingFromRegistry/.test(moduleSource)],
  ["disable path exists", /disableSiteActionBinding/.test(moduleSource)],
  ["generic multi-industry boundary", !/pearl|dental/i.test(migration) && !/pearl|dental/i.test(moduleSource)],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
if (failed.length) {
  console.error(`Site action binding management audit failed: ${failed.join(", ")}`);
  process.exit(1);
}
console.log("Site action binding management audit passed.");
