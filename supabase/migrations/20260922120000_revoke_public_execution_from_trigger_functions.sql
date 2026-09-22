-- Trigger routines are invoked by their table triggers, not as Data API RPC endpoints.
-- Remove inherited and explicit client-role EXECUTE grants without disabling triggers.
revoke execute on function public.enrich_site_plan_request_from_brief() from public, anon, authenticated;
revoke execute on function public.expand_succeeded_build_requested_pages() from public, anon, authenticated;
