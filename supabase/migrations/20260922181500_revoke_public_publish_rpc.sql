-- Remove the inherited PUBLIC grant as well as the explicit anon grant.
-- Authenticated users retain the intended publish RPC access.
revoke execute on function public.publish_site_version(uuid) from public, anon;
grant execute on function public.publish_site_version(uuid) to authenticated;
