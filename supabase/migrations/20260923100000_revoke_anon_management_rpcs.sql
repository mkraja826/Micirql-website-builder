-- Keep management-only RPCs out of the anonymous API surface.
revoke execute on function public.persist_certified_site(
  uuid, text, text, text, text, text, integer, double precision, uuid, text, jsonb, jsonb
) from public, anon;

revoke execute on function public.set_published_site_version(
  uuid, text, uuid
) from public, anon;
