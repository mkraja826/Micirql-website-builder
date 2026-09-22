# Supabase production security review

## Trigger function RPC exposure

The production security advisor reported two no-argument trigger routines as executable by `anon` and `authenticated`:

- `public.enrich_site_plan_request_from_brief()`, attached to `site_plans`
- `public.expand_succeeded_build_requested_pages()`, attached to `site_build_jobs`

Both return `trigger` and are invoked by enabled table triggers. They are not client RPC endpoints. The accompanying migration removes execution rights from `PUBLIC`, `anon`, and `authenticated`; it leaves function ownership and trigger definitions untouched.

## Findings that remain open

The Supabase production advisor also reports:

- Anonymous execution of `get_live_published_site`, `resolve_live_site_hostname`, `resolve_public_site_action`, and `submit_site_action`. The latter two serve explicit public-site capabilities. Each public function still needs a documented caller, data-exposure review, and narrow input/output review before it can be accepted for release.
- Authenticated execution of 23 `SECURITY DEFINER` functions. The advisor warning alone does not prove a vulnerability; review every callable function for membership checks, trusted inputs, fixed search paths, and least-privilege grants. Do not blanket-revoke functions that the application needs.
- Leaked-password protection is disabled. Enable and verify it in Supabase Auth settings before production release; the current repository and connected Supabase tools do not manage this project setting.
- Five tables have RLS enabled with no policies: `certified_layout_contracts`, `full_stack_publish_certifications`, `site_function_idempotency`, `site_function_rate_limits`, and `site_leads`. Confirm that direct client grants remain absent and that required access occurs only through reviewed server/RPC boundaries.

These findings remain release-review items. The trigger-grant cleanup does not certify the Supabase project as secure. Re-run the Supabase security advisor after applying the migration and attach its sanitized result to the V1 release evidence.
