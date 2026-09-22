import fs from "node:fs";

const runtime = fs.readFileSync("src/sections/contact/request-form-runtime.tsx", "utf8");
const editorial = fs.readFileSync("src/sections/contact/editorial-inquiry/index.tsx", "utf8");
const local = fs.readFileSync("src/sections/contact/local-conversion/index.tsx", "utf8");
const resolver = fs.readFileSync("src/core/capabilities/public-action.ts", "utf8");
const submissionRoute = fs.readFileSync("app/api/public/site-actions/route.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260914090000_add_public_site_action_resolver.sql", "utf8");

const checks = [
  [runtime.includes('fetch("/api/public/site-actions"'), "runtime must submit through the server API boundary"],
  [submissionRoute.includes('client.rpc("submit_site_action"'), "server API must call the registered site action RPC"],
  [submissionRoute.includes('status, 429') && submissionRoute.includes('"retry-after"'), "server API must translate rate limits to HTTP 429 with retry guidance"],
  [submissionRoute.includes("SUPABASE_ANON_KEY") && !submissionRoute.includes("SUPABASE_SERVICE_ROLE_KEY"), "public request API must use publishable database credentials only"],
  [runtime.includes('resolvePublicSiteAction'), "runtime must resolve published verified action identity"],
  [!runtime.includes('action.actionId && action.actionVersion'), "runtime must not bypass public binding resolution with supplied action identity"],
  [runtime.includes('consent: true'), "runtime must send explicit consent"],
  [runtime.includes('type="checkbox"'), "runtime must collect consent"],
  [runtime.includes('disabled={!active'), "runtime must fail closed without an active binding/config"],
  [runtime.includes('request only'), "runtime must declare request-only semantics"],
  [runtime.includes('does not confirm a booking, reservation, appointment, admission, or outcome'), "runtime must not claim transactional confirmation"],
  [runtime.includes('Request sent.'), "success state must say request sent"],
  [resolver.includes('resolve_public_site_action'), "client resolver must use the narrow public RPC"],
  [migration.includes("s.status = 'published'"), "public resolver must require a published site"],
  [migration.includes('s.published_version_id is not null'), "public resolver must require a published version"],
  [migration.includes("b.status = 'active'"), "public resolver must require an active binding"],
  [migration.includes("b.verified_by = 'system'"), "public resolver must require system verification"],
  [migration.includes("r.status = 'active'"), "public resolver must require an active registry action"],
  [migration.includes("r.handler_kind = 'lead_request'"), "public resolver must restrict to the supported request handler"],
  [migration.includes("r.contract->>'semantics' = 'request_only'"), "public resolver must require request-only registry semantics"],
  [migration.includes('b.capability_key = any(r.capability_keys)'), "public resolver must verify capability coverage"],
  [migration.includes('grant execute on function public.resolve_public_site_action(uuid, text) to anon, authenticated'), "public resolver must expose only the narrow RPC to public visitors"],
  [editorial.includes('RequestFormRuntime'), "editorial inquiry must use the request runtime"],
  [local.includes('RequestFormRuntime'), "local conversion must use the request runtime"],
  [!runtime.toLowerCase().includes('booking confirmed'), "runtime must not claim booking confirmation"],
  [!runtime.toLowerCase().includes('appointment confirmed'), "runtime must not claim appointment confirmation"],
  [!runtime.toLowerCase().includes('reservation confirmed'), "runtime must not claim reservation confirmation"],
  [!runtime.toLowerCase().includes('pearl dental'), "generic runtime must not specialize for Pearl Dental"],
  [!resolver.toLowerCase().includes('pearl dental'), "generic resolver must not specialize for Pearl Dental"],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error("Generated request form audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Generated request form audit passed.");
