-- Anonymous visitors have no valid workspace role and must not call the
-- authenticated publish RPC through the Data API.
revoke execute on function public.publish_site_version(uuid) from anon;
