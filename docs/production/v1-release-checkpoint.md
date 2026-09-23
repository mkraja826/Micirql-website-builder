# V1 release checkpoint

Updated after PR #240 on 2026-09-23.

## Verified production boundaries

- Published rendering selects the active site's exact published version and does not fall back to drafts, latest revisions, regeneration, AI calls, or live media-provider lookups.
- Draft saves and publication pass the editor snapshot, provenance, capability, warning-preservation, revision, and snapshot-validation guards.
- Publication pointer updates report blocked/no-op writes instead of returning false success.
- Certified-site persistence is bound to the workspace and requires owner/admin/editor membership.
- Site-build plans are bound to their target site and certified layout status.
- AI usage events are context-bound to the workspace, site, and build. Historical rows referencing deleted sites remain preserved.
- The legacy five-argument SECURITY DEFINER publish overload is service-role-only; the guarded one-argument editor publication path remains authenticated.
- Export artifact preparation requires owner/admin/editor membership.
- Workspace owners are protected from admin demotion, deletion, and new owner-role insertion. First-owner bootstrap and owner-managed membership remain available.
- The Supabase advisor baseline has been recorded. Intentional public-runtime warnings and fail-closed policy-free tables remain documented.

## Required final release evidence

Before calling V1 GA, attach real production evidence for:

1. Desktop and mobile published rendering at the required viewports.
2. Navigation, refresh, and deep-link behavior.
3. Tenant isolation across sites and workspaces.
4. Persisted media and form submission to the correct backend.
5. V1 → V2 → rollback determinism, immutable version history, and fingerprints.
6. Provider-outage independence of the published runtime.

## Explicit remaining limitation

\`plan_site_blueprint(...)\` still accepts caller-supplied section payloads after broad family checks. Production \`certified_layout_contracts\` does not currently persist authoritative section payloads for comparison. Do not seed invented layout data or rewrite existing production contracts. Until an authoritative contract representation exists, planner output must not be treated as independently certified from the stored contract.

Leaked-password protection remains unavailable on the current Supabase Free plan and requires an authorized plan upgrade before it can be enabled and verified.

This checkpoint records verified boundaries and remaining release gates; it does not claim that external production-browser certification has been completed.
