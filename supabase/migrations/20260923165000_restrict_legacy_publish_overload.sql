-- The legacy five-argument publish overload bypasses the guarded
-- workspace-draft publication path. Keep it available only to trusted
-- server-side callers; authenticated clients must use publish_site_version(uuid).
revoke execute on function public.publish_site_version(text, uuid, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function public.publish_site_version(text, uuid, jsonb, text, text)
  to service_role;
