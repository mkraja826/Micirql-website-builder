# Supabase production security review

## Trigger function RPC exposure

The production security advisor reported two no-argument trigger routines as executable by `anon` and `authenticated`:

- `public.enrich_site_plan_request_from_brief()`, attached to `site_plans`
- `public.expand_succeeded_build_requested_pages()`, attached to `site_build_jobs`

Both return `trigger` and are invoked by enabled table triggers. They are not client RPC endpoints. The accompanying migration removes execution rights from `PUBLIC`, `anon`, and `authenticated`; it leaves function ownership and trigger definitions untouched. The migration is recorded in Supabase history as version `20260922113129`.

## Direct grants on policy-free tables

A live grant review on 2026-09-22 found that `anon` and `authenticated` had all table privileges on `public.certified_layout_contracts`, despite RLS being enabled with no policies. The other four reviewed tables already denied direct SELECT and INSERT to both roles.

Migration `20260922130000_revoke_client_grants_from_certified_layout_contracts.sql` is applied and recorded in Supabase as version `20260922132027`. Post-migration checks show `anon` and `authenticated` have no SELECT, INSERT, UPDATE, or DELETE privilege on the table, while `service_role` retains all four. This removes unnecessary direct API grants while preserving the trusted server access path.

## Workspace bootstrap helper

A live review found `public.workspace_has_members(uuid)` executable by every authenticated user. It returns whether an arbitrary workspace has any members, and is needed only by the `workspace_members_insert_admin` RLS policy for first-owner bootstrap; no application RPC caller was found.

The Supabase Data API settings page showed exactly two exposed schemas, `public` and `extensions`. The proposed migration moves the SECURITY DEFINER helper to `private`, keeps `private` outside the exposed schema list, updates the first-owner policy to call the private helper, and drops the public RPC. Authenticated execution remains granted on the private helper because the policy needs it. This removes the direct PostgREST oracle while preserving initial-owner creation and normal admin membership inserts.

After applying the migration, verify that `private` is still absent from Data API exposed schemas, `public.workspace_has_members(uuid)` no longer exists, and the first-owner and workspace-admin membership paths still work.

## Public SECURITY DEFINER RPC review

The security advisor reports four `SECURITY DEFINER` functions executable by `anon`. These have distinct contracts:

- `resolve_public_site_action(uuid, text)` has a repository caller in the public request-form helper. It returns only site/capability/action identity and requires a published site, an active verified system binding, and an active `request_only` registry entry. Anonymous execution is intentional for published visitors.
- `submit_site_action(...)` is called by the same-origin public request API using the anon key. The function independently validates consent, contact details, bounded payload fields, a published site, and a verified active action; it applies a 100-per-site/action hourly limit and 24-hour idempotency. Since the anon role can call the RPC directly, database-side checks remain the enforcement boundary. The HTTP route’s request logging omits contact fields and raw database errors.
- `get_live_published_site(uuid)` returns the snapshot selected by an active site’s published-version pointer. The current `/published/[siteId]` route uses a server-only service-role repository and exact-version/fingerprint checks instead of this RPC. The RPC has no caller identified in the current repository; check any external consumers before removing its anonymous grant.
- `resolve_live_site_hostname(text)` returns a site UUID only for an active hostname with active SSL and an active published site. No caller is identified in the current repository; confirm any external custom-domain resolver before changing its grant.

The last two grants remain under caller-inventory review; do not revoke them until external runtime consumers have been checked.

## Authenticated SECURITY DEFINER RPC review

Live inspection found `public.has_workspace_role(uuid, text[])` checks only the caller’s own `auth.uid()` membership and requested roles. It is used by many RLS policies and `set_site_action_binding`; it is not an immediate cross-tenant data exposure. The authenticated grant remains because those policy checks require it.

`public.check_ai_budget(uuid, uuid, uuid, bigint)` checks the caller’s workspace role before reading usage and budget values, and scopes both queries to the requested workspace. No direct application RPC caller was found in the repository index. No change was warranted from this review.

A live review found a tenant boundary issue in `public.finalize_asset_upload(...)`: authenticated workspace editors can create upload intents, and the intent’s `asset_id` is not constrained by a foreign key to `assets`. The finalizer upserted by asset ID and updated metadata on conflict without verifying the existing row’s workspace. An intent could therefore target a known asset ID belonging to another workspace, including a global asset. Migration `20260922160000_guard_asset_upload_workspace_conflicts.sql` adds an atomic workspace match to the conflict update and raises an error when the ID is owned by a different workspace. It preserves same-workspace retries. This migration is proposed; it has not been applied to production.

## Remaining release-review items

- The advisor reports 20 authenticated-callable `SECURITY DEFINER` functions after the workspace helper was moved from the exposed `public` schema. Review remaining findings by caller and privilege; the warning alone does not establish a vulnerability.
- Leaked-password protection is disabled. It is unavailable on this project’s current Free plan; Supabase documents it for Pro and above. It still needs to be enabled and verified after an authorized plan upgrade.
- Five tables have RLS enabled with no policies: `certified_layout_contracts`, `full_stack_publish_certifications`, `site_function_idempotency`, `site_function_rate_limits`, and `site_leads`. The live grant review found no direct `anon` or `authenticated` SELECT/INSERT grants on the latter four.

These findings remain release-review items. Do not blanket-revoke functions that the application needs. These reviews do not certify the Supabase project as secure. Re-run the Supabase security advisor after migrations and attach its sanitized result to the V1 release evidence.
