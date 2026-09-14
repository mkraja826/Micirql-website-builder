import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  registry: path.join(root, "src/core/capabilities/action-registry.ts"),
  migration: path.join(root, "supabase/migrations/20260914070000_add_site_action_registry.sql"),
  rateFix: path.join(root, "supabase/migrations/20260914070100_fix_site_action_rate_limit_call.sql"),
  activation: path.join(root, "src/core/capabilities/activation.ts"),
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]));

const checks = [
  ["authoritative registry table exists", /create table if not exists public\.site_action_registry/i.test(source.migration)],
  ["site bindings table exists", /create table if not exists public\.site_action_bindings/i.test(source.migration)],
  ["registry has explicit action version", /action_version text not null/i.test(source.migration)],
  ["registry lifecycle is fail closed", /status in \('draft', 'active', 'retired'\)/i.test(source.migration)],
  ["only generic request handler is registered", /handler_kind in \('lead_request'\)/i.test(source.migration)],
  ["request semantics are explicit", /'semantics', 'request_only'/i.test(source.migration)],
  ["confirmation is explicitly not guaranteed", /booking_confirmed.*reservation_confirmed.*appointment_confirmed/is.test(source.migration)],
  ["submission requires published site", /status = 'published'[\s\S]*published_version_id is not null/i.test(source.rateFix)],
  ["submission validates published version identity", /sv\.id = v_site\.published_version_id[\s\S]*sv\.site_id = v_site\.id/i.test(source.rateFix)],
  ["submission requires verified active site binding", /site_action_bindings[\s\S]*b\.status = 'active'[\s\S]*b\.verified_by = 'system'/i.test(source.rateFix)],
  ["submission requires consent", /p_consent is not true/i.test(source.rateFix)],
  ["submission requires contact path", /email or phone is required/i.test(source.rateFix)],
  ["idempotency is scoped to site and action", /site:.*:action:.*:request:/is.test(source.rateFix)],
  ["rate limiting is enforced", /consume_site_function_rate_limit/i.test(source.rateFix)],
  ["rate limit reads allowed field", /select allowed into v_rate_allowed/i.test(source.rateFix)],
  ["direct registry mutation is revoked", /revoke insert, update, delete on public\.site_action_registry from anon, authenticated/i.test(source.migration)],
  ["direct binding mutation is revoked", /revoke insert, update, delete on public\.site_action_bindings from anon, authenticated/i.test(source.migration)],
  ["submission RPC uses fixed search path", /security definer[\s\S]*set search_path = public, pg_temp/i.test(source.rateFix)],
  ["submission RPC is the only anonymous write boundary", /grant execute on function public\.submit_site_action[\s\S]*to anon, authenticated/i.test(source.rateFix)],
  ["client validates request_only receipt", /receipt\.semantics !== "request_only"/i.test(source.registry)],
  ["activation is derived from verified registry binding", /backendBindingFromRegistry/i.test(source.registry)],
  ["visual activation still requires system evidence", /checkedBy: "system"/i.test(source.registry) && /checkedBy !== "system"/i.test(source.activation)],
  ["no dental specialization introduced", !/pearl|dental|dentist|clinic/i.test(source.registry)],
  ["no fake booking completion language", !/booking[_ ]?confirmed\s*[:=]\s*true/i.test(source.registry)],
];

const results = checks.map(([name, pass]) => ({ name, pass }));
const failed = results.filter((check) => !check.pass);
const report = {
  status: failed.length ? "fail" : "pass",
  checks: results,
  failed: failed.map((check) => check.name),
};

const outDir = path.join(root, "artifacts/backend-action-registry-audit");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
