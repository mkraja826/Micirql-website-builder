-- Keep workspace drafts read-only through the Data API. Draft changes must
-- pass through the guarded RPC, which enforces invariants inside Postgres.
revoke insert, update, delete on table public.workspace_drafts from anon, authenticated;

create schema if not exists private;
comment on schema private is 'Internal helpers; this schema must remain excluded from the Supabase Data API.';
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.assert_editor_draft_snapshot(
  p_workspace_id uuid,
  p_site_id uuid,
  p_snapshot jsonb,
  p_previous_snapshot jsonb default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_site public.sites%rowtype;
  v_baseline public.site_versions%rowtype;
  v_previous_content jsonb;
  v_content jsonb;
  v_validation jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'insufficient workspace role';
  end if;

  select * into v_site
  from public.sites s
  where s.id = p_site_id and s.workspace_id = p_workspace_id;
  if not found then
    raise exception 'site does not belong to workspace';
  end if;

  select * into v_baseline
  from public.site_versions sv
  where sv.site_id = p_site_id and sv.version_number = 1;
  if not found then
    raise exception 'certified editor baseline is missing';
  end if;

  if v_baseline.snapshot_hash is null
     or v_baseline.snapshot_hash is distinct from coalesce(v_baseline.materialized_fingerprint, v_baseline.snapshot_hash)
     or v_baseline.snapshot->>'siteId' is distinct from v_site.materialized_site_id::text
     or v_baseline.snapshot->'source'->>'sourceKey' is distinct from v_site.source_key
     or v_baseline.snapshot->'source'->>'candidateId' is distinct from v_site.candidate_id
     or v_baseline.snapshot->'source'->>'draftVersion' is distinct from v_site.draft_version then
    raise exception 'certified editor baseline does not match durable site provenance';
  end if;

  if jsonb_typeof(p_snapshot) is distinct from 'object'
     or p_snapshot->>'version' is distinct from '1.0'
     or p_snapshot->>'workspaceId' is distinct from p_workspace_id::text
     or p_snapshot->>'dbSiteId' is distinct from p_site_id::text
     or jsonb_typeof(p_snapshot->'baseline') is distinct from 'object'
     or jsonb_typeof(p_snapshot->'content') is distinct from 'object' then
    raise exception 'invalid editor draft snapshot';
  end if;

  if p_snapshot->'baseline'->>'materializedSiteId' is distinct from v_site.materialized_site_id::text
     or p_snapshot->'baseline'->>'fingerprint' is distinct from coalesce(v_baseline.materialized_fingerprint, v_baseline.snapshot_hash)
     or p_snapshot->'baseline'->>'sourceKey' is distinct from v_site.source_key
     or p_snapshot->'baseline'->>'candidateId' is distinct from v_site.candidate_id
     or p_snapshot->'baseline'->>'draftVersion' is distinct from v_site.draft_version then
    raise exception 'editor draft cannot replace certified baseline provenance';
  end if;

  v_content := p_snapshot->'content';
  v_previous_content := case
    when p_previous_snapshot is null then v_baseline.snapshot->'snapshot'
    else p_previous_snapshot->'content'
  end;

  if jsonb_typeof(v_previous_content) is distinct from 'object'
     or v_content->'primaryCapability' is distinct from v_baseline.snapshot->'snapshot'->'primaryCapability'
     or v_content->'capabilities' is distinct from v_baseline.snapshot->'snapshot'->'capabilities'
     or v_content->'primaryCapability' is distinct from v_previous_content->'primaryCapability'
     or v_content->'capabilities' is distinct from v_previous_content->'capabilities' then
    raise exception 'editor mutations cannot change or activate functional capabilities';
  end if;

  if jsonb_typeof(v_content->'warnings') is distinct from 'array'
     or jsonb_typeof(v_previous_content->'warnings') is distinct from 'array'
     or exists (
       select 1
       from jsonb_array_elements(v_previous_content->'warnings') as old_warning(value)
       where not (v_content->'warnings' @> jsonb_build_array(old_warning.value))
     ) then
    raise exception 'editor mutations cannot remove system quality or configuration warnings';
  end if;

  v_validation := public.validate_site_snapshot(v_content);
  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    raise exception 'invalid editor site snapshot';
  end if;
end;
$function$;

revoke all on function private.assert_editor_draft_snapshot(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function private.assert_editor_draft_snapshot(uuid, uuid, jsonb, jsonb) to authenticated;

create or replace function public.save_workspace_draft(
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
  v_revision bigint;
  v_current_revision bigint;
  v_previous_snapshot jsonb;
  v_has_previous boolean;
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
    select 1 from public.sites s
    where s.id = p_site_id and s.workspace_id = p_workspace_id
  ) then
    raise exception 'site does not belong to workspace';
  end if;

  select d.revision, d.snapshot
  into v_current_revision, v_previous_snapshot
  from public.workspace_drafts d
  where d.site_id = p_site_id and d.workspace_id = p_workspace_id
  for update;
  v_has_previous := found;

  if v_has_previous then
    if v_current_revision is distinct from p_expected_revision then
      raise exception 'workspace draft revision conflict';
    end if;
  elsif p_expected_revision <> 0 then
    raise exception 'workspace draft revision conflict';
  end if;

  perform private.assert_editor_draft_snapshot(
    p_workspace_id, p_site_id, p_snapshot, v_previous_snapshot
  );

  insert into public.workspace_drafts(workspace_id,site_id,revision,snapshot,updated_by)
  values(p_workspace_id,p_site_id,1,p_snapshot,p_updated_by)
  on conflict(site_id) do update
    set snapshot=excluded.snapshot,
        updated_at=now(),
        updated_by=excluded.updated_by,
        revision=public.workspace_drafts.revision+1
    where public.workspace_drafts.workspace_id=excluded.workspace_id
      and public.workspace_drafts.revision=p_expected_revision
  returning revision into v_revision;

  if v_revision is null then
    raise exception 'workspace draft revision conflict';
  end if;
  return v_revision;
end;
$function$;

create or replace function public.publish_site_version(p_site_id uuid)
returns public.site_versions
language plpgsql
set search_path = public
as $function$
declare
  v_site public.sites%rowtype;
  v_draft public.workspace_drafts%rowtype;
  v_next_version integer;
  v_version public.site_versions%rowtype;
begin
  select * into v_site
  from public.sites
  where id = p_site_id
  for update;

  if not found then
    raise exception 'site_not_found';
  end if;

  if not public.has_workspace_role(v_site.workspace_id, array['owner','admin','editor']) then
    raise exception 'forbidden';
  end if;

  select * into v_draft
  from public.workspace_drafts
  where site_id = p_site_id and workspace_id = v_site.workspace_id;

  if not found then
    raise exception 'draft_not_found';
  end if;

  perform private.assert_editor_draft_snapshot(
    v_site.workspace_id, p_site_id, v_draft.snapshot, null
  );

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.site_versions
  where site_id = p_site_id;

  update public.site_versions
  set status = 'archived'
  where site_id = p_site_id and status = 'published';

  insert into public.site_versions (
    id, site_id, version_number, status, snapshot, created_at, created_by, snapshot_hash
  ) values (
    gen_random_uuid()::text,
    p_site_id,
    v_next_version,
    'published',
    v_draft.snapshot,
    now(),
    auth.uid()::text,
    encode(digest(v_draft.snapshot::text, 'sha256'), 'hex')
  ) returning * into v_version;

  update public.sites
  set published_version_id = v_version.id,
      status = 'active',
      updated_at = now()
  where id = p_site_id;

  return v_version;
end;
$function$;