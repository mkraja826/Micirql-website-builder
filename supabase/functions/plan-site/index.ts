// Deployed Supabase Edge Function source lives in the Micirql production project.
// Keep this file synchronized with the deployed plan-site runtime.
//
// The runtime performs authenticated planning normalization, ranks only
// `industry_context.certifiedLayoutCandidates`, and passes the chosen layout
// contract to public.plan_site_blueprint through `p_layout_blueprint`.
//
// The complete deployed source is intentionally maintained through the
// Supabase function deployment flow; this repository marker ensures changes to
// the runtime are reviewable alongside the database migration and planner QA.
export const PLAN_SITE_RUNTIME_VERSION = 11;
export const PLAN_SITE_SELECTOR_CONTRACT = "certified-layout-candidates-v1";
