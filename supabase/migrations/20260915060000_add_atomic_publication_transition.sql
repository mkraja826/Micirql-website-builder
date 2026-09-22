create or replace function public.set_published_site_version(
  p_site_id uuid,
  p_version_id text,
  p_actor_id uuid
)
returns table (
  site_id uuid,
  published_version_id text,
  previous_published_version_id text
)
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  v_workspace_id uuid;
  v_previous_version_id text;
  v_version_status text;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'authenticated actor mismatch';
  end if;

  select s.workspace_id, s.published_version_id
    into v_workspace_id, v_previous_version_id
  from public.sites as s
  where s.id = p_site_id
    and exists (
      select 1
      from public.workspace_members as wm
      where wm.workspace_id = s.workspace_id
        and wm.user_id = auth.uid()
    )
  for update;

  if v_workspace_id is null then
    raise exception 'site not found or actor is not a workspace member';
  end if;

  select sv.status
    into v_version_status
  from public.site_versions as sv
  where sv.id = p_version_id
    and sv.site_id = p_site_id;

  if v_version_status is null then
    raise exception 'publication version does not belong to site';
  end if;

  if v_version_status not in ('draft', 'published') then
    raise exception 'publication version is not publishable';
  end if;

  update public.site_versions as sv
  set status = 'published'
  where sv.id = p_version_id
    and sv.site_id = p_site_id;

  update public.sites as s
  set status = 'published',
      published_version_id = p_version_id,
      updated_at = now()
  where s.id = p_site_id
    and s.workspace_id = v_workspace_id;

  return query
  select p_site_id, p_version_id, v_previous_version_id;
end;
$$;

revoke all on function public.set_published_site_version(uuid, text, uuid) from public;
grant execute on function public.set_published_site_version(uuid, text, uuid) to authenticated;

comment on function public.set_published_site_version(uuid, text, uuid) is
  'Atomically switches a tenant-owned site to an existing immutable site version. Historical versions are preserved so rollback is the same exact pointer transition.';
