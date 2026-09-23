-- Bind SECURITY DEFINER certified-site persistence to the caller's workspace.
create or replace function public.persist_certified_site(
  p_workspace_id uuid,
  p_materialized_site_id text,
  p_name text,
  p_source_key text,
  p_candidate_id text,
  p_draft_version text,
  p_certified_rank integer,
  p_certified_score double precision,
  p_actor_id uuid,
  p_materialized_fingerprint text,
  p_snapshot jsonb,
  p_certified_winner jsonb
)
returns table (db_site_id uuid, version_id text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_site_id uuid;
  v_version_id text;
  v_revision integer;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'authenticated actor mismatch';
  end if;

  if not exists (
    select 1
    from public.workspace_members as wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  ) then
    raise exception 'actor is not a member of the target workspace';
  end if;

  if p_certified_rank <> 1
    or coalesce((p_certified_winner ->> 'rank')::integer, 0) <> 1
    or coalesce((p_certified_winner #>> '{certification,hardFailureCount}')::integer, -1) <> 0
    or coalesce((p_certified_winner #>> '{certification,repairAccepted}')::boolean, false) is not true then
    raise exception 'only a fully certified rank-1 winner can be persisted';
  end if;

  v_revision := coalesce((p_snapshot ->> 'revision')::integer, 0);
  if v_revision < 1 then
    raise exception 'materialized revision must be a positive integer';
  end if;

  if coalesce(p_certified_winner ->> 'candidateId', '') <> p_candidate_id
    or coalesce(p_snapshot ->> 'siteId', '') <> p_materialized_site_id
    or coalesce(p_snapshot #>> '{source,sourceKey}', '') <> p_source_key
    or coalesce(p_snapshot #>> '{source,candidateId}', '') <> p_candidate_id
    or coalesce(p_snapshot #>> '{source,draftVersion}', '') <> p_draft_version
    or coalesce(p_snapshot ->> 'fingerprint', '') <> p_materialized_fingerprint then
    raise exception 'certified site provenance mismatch';
  end if;

  insert into public.sites (
    workspace_id, name, status, materialized_site_id, source_key, candidate_id,
    draft_version, certified_rank, certified_score
  ) values (
    p_workspace_id, p_name, 'draft', p_materialized_site_id, p_source_key, p_candidate_id,
    p_draft_version, p_certified_rank, p_certified_score
  )
  on conflict (workspace_id, materialized_site_id)
    where materialized_site_id is not null
  do update set name = excluded.name, updated_at = now()
  where public.sites.source_key = excluded.source_key
    and public.sites.candidate_id = excluded.candidate_id
    and public.sites.draft_version = excluded.draft_version
    and public.sites.certified_rank = excluded.certified_rank
  returning id into v_site_id;

  if v_site_id is null then
    raise exception 'existing durable site provenance cannot be replaced';
  end if;

  if not exists (
    select 1 from public.site_versions
    where site_id = v_site_id and version_number = v_revision
  ) and v_revision <> coalesce((
    select max(version_number) + 1 from public.site_versions where site_id = v_site_id
  ), 1) then
    raise exception 'certified site revisions must be persisted sequentially';
  end if;

  v_version_id := v_site_id::text || ':' || v_revision::text;

  insert into public.site_versions (
    id, site_id, version_number, status, snapshot, created_by, snapshot_hash,
    materialized_fingerprint, certified_winner
  ) values (
    v_version_id, v_site_id, v_revision, 'draft', p_snapshot, p_actor_id::text,
    p_materialized_fingerprint, p_materialized_fingerprint, p_certified_winner
  )
  on conflict (site_id, version_number)
  do update set snapshot = public.site_versions.snapshot
  where public.site_versions.snapshot_hash = excluded.snapshot_hash
    and public.site_versions.materialized_fingerprint = excluded.materialized_fingerprint
    and public.site_versions.certified_winner = excluded.certified_winner
  returning id into v_version_id;

  if v_version_id is null then
    raise exception 'durable site revision is immutable';
  end if;

  return query select v_site_id, v_version_id;
end;
$$;

revoke all on function public.persist_certified_site(
  uuid, text, text, text, text, text, integer, double precision, uuid, text, jsonb, jsonb
) from public, anon;

grant execute on function public.persist_certified_site(
  uuid, text, text, text, text, text, integer, double precision, uuid, text, jsonb, jsonb
) to authenticated;
