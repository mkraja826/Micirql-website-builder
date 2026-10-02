-- The builder persists the public Site schema directly. Keep that contract
-- separate from save_workspace_draft, whose guarded editor RPC accepts the
-- certified editor envelope used by the V1 editor.

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
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_current_revision bigint;
  v_revision bigint;
  v_validation jsonb;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if p_updated_by is distinct from v_uid then
    raise exception 'updated_by must match authenticated user';
  end if;
  if p_expected_revision < 0 then
    raise exception 'expected revision must be non-negative';
  end if;
  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'insufficient workspace role';
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

  insert into public.workspace_drafts(workspace_id, site_id, revision, snapshot, updated_by)
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

revoke all on function public.save_builder_site_draft(uuid, uuid, bigint, jsonb, uuid)
  from public, anon;
grant execute on function public.save_builder_site_draft(uuid, uuid, bigint, jsonb, uuid)
  to authenticated, service_role;