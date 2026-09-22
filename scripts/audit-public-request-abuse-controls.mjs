import fs from "node:fs";

const migrationPath = "supabase/migrations/20260922100000_bound_public_site_action_submissions.sql";
const formPath = "src/sections/contact/request-form-runtime.tsx";
for (const path of [migrationPath, formPath]) {
  if (!fs.existsSync(path)) throw new Error(`Missing public request abuse-control file: ${path}`);
}
const migration = fs.readFileSync(migrationPath, "utf8");
const form = fs.readFileSync(formPath, "utf8");

const checks = [
  [migration.includes("security definer") && migration.includes("set search_path = public, pg_temp"), "submission RPC must keep a fixed search path"],
  [migration.includes("pg_advisory_xact_lock(hashtextextended(v_idempotency_key, 0))"), "idempotency lookup and insert must be serialized per request"],
  [migration.includes("length(p_name) > 120") && migration.includes("trim(p_email)), 0) > 254") && migration.includes("trim(p_phone)), 0) > 32"), "contact inputs must have server-side limits"],
  [migration.includes("length(p_message), 0) > 4000") && migration.includes("octet_length(coalesce(p_fields"), "message and JSON payload must be bounded server-side"],
  [migration.includes("jsonb_object_keys(coalesce(p_fields") && migration.includes("length(p_source_page) > 512"), "field count and source page must be bounded"],
  [migration.includes("100,\n    3600") && migration.includes("rate limit exceeded"), "existing per-site/action hourly rate limit must remain enforced"],
  [migration.includes("p_fields->>'_website'") && migration.includes("coalesce(p_fields, '{}'::jsonb) - '_website'"), "honeypot submissions must not create or persist a lead"],
  [migration.includes("revoke all on function public.submit_site_action") && migration.includes("to anon, authenticated"), "public RPC grants must remain explicit"],
  [form.includes('name="_website"') && form.includes('form.get("_website")') && form.includes("_website: website"), "the generated form must submit its hidden bot-trap field"],
  [form.includes("maxLength={120}") && form.includes("maxLength={254}") && form.includes("maxLength={32}") && form.includes("maxLength={4000}"), "browser fields must match server-side limits"],
];
for (const [passed, reason] of checks) if (!passed) throw new Error(reason);
console.log("Public request abuse-control audit passed.");
