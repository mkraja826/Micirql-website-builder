-- Draft snapshots contain server-owned certification evidence. Keep the
-- browser's authenticated role on the RLS read path, but require every write
-- to cross the Builder API's server-only service-role boundary.

create or replace function public.save_builder_site_draft(
  p_workspace_id uuid,
  p_site_id uuid,
  p_expected_revision bigint,
  p_snapshot jsonb,
  p_updated_by uuid
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_revision bigint;
  v_revision bigint;
  v_validation jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required';
  end if;
  if p_updated_by is null then
    raise exception 'updated_by is required';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_updated_by) then
    raise exception 'updated_by user does not exist';
  end if;
  if p_expected_revision < 0 then
    raise exception 'expected revision must be non-negative';
  end if;
  if not exists (
    select 1
    from public.sites s
    where s.id = p_site_id and s.workspace_id = p_workspace_id
  ) then
    raise exception 'site does not belong to workspace';
  end if;
  if jsonb_typeof(p_snapshot) is distinct from 'object'
     or p_snapshot->>'siteId' is distinct from p_site_id::text
     or p_snapshot->>'workspaceId' is distinct from p_workspace_id::text then
    raise exception 'builder site snapshot identity mismatch';
  end if;

  v_validation := public.validate_site_snapshot(p_snapshot);
  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    raise exception 'invalid builder site snapshot';
  end if;

  select d.revision
  into v_current_revision
  from public.workspace_drafts d
  where d.site_id = p_site_id and d.workspace_id = p_workspace_id
  for update;

  if found then
    if v_current_revision is distinct from p_expected_revision then
      raise exception 'workspace draft revision conflict';
    end if;
  elsif p_expected_revision <> 0 then
    raise exception 'workspace draft revision conflict';
  end if;

  insert into public.workspace_drafts(
    workspace_id,
    site_id,
    revision,
    snapshot,
    updated_by
  )
  values (p_workspace_id, p_site_id, 1, p_snapshot, p_updated_by)
  on conflict (site_id) do update
    set snapshot = excluded.snapshot,
        updated_at = now(),
        updated_by = excluded.updated_by,
        revision = public.workspace_drafts.revision + 1
    where public.workspace_drafts.workspace_id = excluded.workspace_id
      and public.workspace_drafts.revision = p_expected_revision
  returning revision into v_revision;

  if v_revision is null then
    raise exception 'workspace draft revision conflict';
  end if;

  return v_revision;
end;
$function$;

revoke all on function public.save_builder_site_draft(
  uuid,
  uuid,
  bigint,
  jsonb,
  uuid
) from public, anon, authenticated;

grant execute on function public.save_builder_site_draft(
  uuid,
  uuid,
  bigint,
  jsonb,
  uuid
) to service_role;
