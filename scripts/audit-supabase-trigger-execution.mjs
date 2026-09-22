import fs from "node:fs";

const migrationPath = "supabase/migrations/20260922113129_revoke_public_execution_from_trigger_functions.sql";
const reviewPath = "docs/production/supabase-security-review.md";
const migration = fs.readFileSync(migrationPath, "utf8").toLowerCase();
const review = fs.readFileSync(reviewPath, "utf8");

const expected = [
  "revoke execute on function public.enrich_site_plan_request_from_brief() from public, anon, authenticated;",
  "revoke execute on function public.expand_succeeded_build_requested_pages() from public, anon, authenticated;",
];
for (const statement of expected) {
  if (!migration.includes(statement)) {
    throw new Error(`Trigger execution migration is missing required least-privilege statement: ${statement}`);
  }
}

for (const functionName of ["enrich_site_plan_request_from_brief", "expand_succeeded_build_requested_pages"]) {
  const grantPattern = new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${functionName}\\s*\\(`, "i");
  if (grantPattern.test(migration)) throw new Error(`Trigger-only function ${functionName} must not be re-granted to client roles.`);
}

for (const required of [
  "not client RPC endpoints",
  "Leaked-password protection is disabled",
  "remain release-review items",
  "do not blanket-revoke functions",
]) {
  if (!review.toLowerCase().includes(required.toLowerCase())) {
    throw new Error(`Supabase security review must retain: ${required}`);
  }
}

console.log("Supabase trigger execution boundary audit passed; other advisor findings remain open.");
