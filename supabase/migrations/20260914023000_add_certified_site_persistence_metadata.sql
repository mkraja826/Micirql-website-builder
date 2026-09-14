alter table public.sites
  add column if not exists materialized_site_id text,
  add column if not exists source_key text,
  add column if not exists candidate_id text,
  add column if not exists draft_version text,
  add column if not exists certified_rank integer,
  add column if not exists certified_score double precision;

alter table public.site_versions
  add column if not exists materialized_fingerprint text,
  add column if not exists certified_winner jsonb;

create unique index if not exists sites_workspace_materialized_site_id_uidx
  on public.sites (workspace_id, materialized_site_id)
  where materialized_site_id is not null;

create index if not exists sites_source_candidate_idx
  on public.sites (workspace_id, source_key, candidate_id)
  where source_key is not null and candidate_id is not null;

create index if not exists site_versions_materialized_fingerprint_idx
  on public.site_versions (materialized_fingerprint)
  where materialized_fingerprint is not null;

alter table public.sites
  drop constraint if exists sites_certified_rank_one_check;

alter table public.sites
  add constraint sites_certified_rank_one_check
  check (certified_rank is null or certified_rank = 1);

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
security invoker
set search_path = public, auth
as $$
declare
  v_site_id uuid;
  v_version_id text;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'authenticated actor mismatch';
  end if;

  if p_certified_rank <> 1
    or coalesce((p_certified_winner ->> 'rank')::integer, 0) <> 1
    or coalesce((p_certified_winner #>> '{certification,hardFailureCount}')::integer, -1) <> 0
    or coalesce((p_certified_winner #>> '{certification,repairAccepted}')::boolean, false) is not true then
    raise exception 'only a fully certified rank-1 winner can be persisted';
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
    workspace_id,
    name,
    status,
    materialized_site_id,
    source_key,
    candidate_id,
    draft_version,
    certified_rank,
    certified_score
  ) values (
    p_workspace_id,
    p_name,
    'draft',
    p_materialized_site_id,
    p_source_key,
    p_candidate_id,
    p_draft_version,
    p_certified_rank,
    p_certified_score
  )
  on conflict (workspace_id, materialized_site_id)
    where materialized_site_id is not null
  do update set
    name = excluded.name,
    updated_at = now()
  where public.sites.source_key = excluded.source_key
    and public.sites.candidate_id = excluded.candidate_id
    and public.sites.draft_version = excluded.draft_version
    and public.sites.certified_rank = excluded.certified_rank
    and public.sites.certified_score = excluded.certified_score
  returning id into v_site_id;

  if v_site_id is null then
    raise exception 'existing durable site provenance cannot be replaced';
  end if;

  v_version_id := v_site_id::text || ':1';

  insert into public.site_versions (
    id,
    site_id,
    version_number,
    status,
    snapshot,
    created_by,
    snapshot_hash,
    materialized_fingerprint,
    certified_winner
  ) values (
    v_version_id,
    v_site_id,
    1,
    'draft',
    p_snapshot,
    p_actor_id::text,
    p_materialized_fingerprint,
    p_materialized_fingerprint,
    p_certified_winner
  )
  on conflict (site_id, version_number)
  do update set
    snapshot = public.site_versions.snapshot
  where public.site_versions.snapshot_hash = excluded.snapshot_hash
    and public.site_versions.materialized_fingerprint = excluded.materialized_fingerprint
    and public.site_versions.certified_winner = excluded.certified_winner
  returning id into v_version_id;

  if v_version_id is null then
    raise exception 'durable site revision 1 is immutable';
  end if;

  return query select v_site_id, v_version_id;
end;
$$;

revoke all on function public.persist_certified_site(
  uuid, text, text, text, text, text, integer, double precision, uuid, text, jsonb, jsonb
) from public;

grant execute on function public.persist_certified_site(
  uuid, text, text, text, text, text, integer, double precision, uuid, text, jsonb, jsonb
) to authenticated;
