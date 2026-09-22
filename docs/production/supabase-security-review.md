# Supabase production security review

## Trigger function RPC exposure

The production security advisor reported two no-argument trigger routines as executable by `anon` and `authenticated`:

- `public.enrich_site_plan_request_from_brief()`, attached to `site_plans`
- `public.expand_succeeded_build_requested_pages()`, attached to `site_build_jobs`

Both return `trigger` and are invoked by enabled table triggers. They are not client RPC endpoints. The accompanying migration removes execution rights from `PUBLIC`, `anon`, and `authenticated`; it leaves function ownership and trigger definitions untouched. The migration is recorded in Supabase history as version `20260922113129`.

## Direct grants on policy-free tables

A live grant review on 2026-09-22 found that `anon` and `authenticated` had all table privileges on `public.certified_layout_contracts`, despite RLS being enabled with no policies. The other four reviewed tables already denied direct SELECT and INSERT to both roles. Migration `20260922130000_revoke_client_grants_from_certified_layout_contracts.sql` revokes all client-role privileges from `PUBLIC`, `anon`, and `authenticated` on this internal certification table. Server-side service access is unaffected.

After applying the migration, verify the effective grants again and confirm application workflows that use certification data continue through their trusted server/RPC boundaries.

## Findings that remain open

The Supabase production advisor also reports:

- Anonymous execution of `get_live_published_site`, `resolve_live_site_hostname`, `resolve_public_site_action`, and `submit_site_action`. The latter two serve explicit public-site capabilities. Each public function still needs a documented caller, data-exposure review, and narrow input/output review before it can be accepted for release.
- Authenticated execution of 21 `SECURITY DEFINER` functions after the two trigger-only grants were revoked. The advisor warning alone does not prove a vulnerability; review every callable function for membership checks, trusted inputs, fixed search paths, and least-privilege grants. Do not blanket-revoke functions that the application needs.
- Leaked-password protection is disabled. Enable and verify it in Supabase Auth settings before production release; the current repository and connected Supabase tools do not manage this project setting.
- Five tables have RLS enabled with no policies: `certified_layout_contracts`, `full_stack_publish_certifications`, `site_function_idempotency`, `site_function_rate_limits`, and `site_leads`. The live grant review found no direct `anon` or `authenticated` SELECT/INSERT grants on the latter four tables.

These findings remain release-review items. The trigger-grant cleanup and the proposed table-grant cleanup do not certify the Supabase project as secure. Re-run the Supabase security advisor after applying migrations and attach its sanitized result to the V1 release evidence.
