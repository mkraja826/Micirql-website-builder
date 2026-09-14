create or replace function public.resolve_public_site_action(
  p_site_id uuid,
  p_capability_key text
)
returns table (
  site_id uuid,
  capability_key text,
  action_id text,
  action_version text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    b.site_id,
    b.capability_key,
    b.action_id,
    b.action_version
  from public.site_action_bindings b
  join public.site_action_registry r
    on r.action_id = b.action_id
   and r.action_version = b.action_version
  join public.sites s
    on s.id = b.site_id
  where b.site_id = p_site_id
    and b.capability_key = p_capability_key
    and b.status = 'active'
    and b.verified_by = 'system'
    and coalesce(length(trim(b.verification_evidence_id)), 0) > 0
    and r.status = 'active'
    and p_capability_key = any(r.capability_keys)
    and s.status = 'published'
    and s.published_version_id is not null
    and exists (
      select 1
      from public.site_versions v
      where v.id = s.published_version_id
        and v.site_id = s.id
    )
  limit 1;
$$;

revoke all on function public.resolve_public_site_action(uuid, text) from public;
grant execute on function public.resolve_public_site_action(uuid, text) to anon, authenticated;
