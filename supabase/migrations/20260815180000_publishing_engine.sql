alter table public.site_versions
  add column if not exists snapshot_hash text;

create index if not exists site_versions_site_snapshot_hash_idx
  on public.site_versions(site_id, snapshot_hash)
  where snapshot_hash is not null;

create or replace function public.publish_site_version(
  p_version_id text,
  p_site_id uuid,
  p_snapshot jsonb,
  p_snapshot_hash text,
  p_created_by text
) returns table (
  version_id text,
  version_number integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number integer;
  inserted_at timestamptz;
begin
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found';
  end if;

  select coalesce(max(v.version_number), 0) + 1
    into next_number
    from public.site_versions v
   where v.site_id = p_site_id;

  update public.site_versions
     set status = 'archived'
   where site_id = p_site_id
     and status = 'published';

  insert into public.site_versions (
    id, site_id, version_number, status, snapshot, snapshot_hash, created_by
  ) values (
    p_version_id, p_site_id, next_number, 'published', p_snapshot, p_snapshot_hash, p_created_by
  )
  returning site_versions.created_at into inserted_at;

  update public.sites
     set published_version_id = p_version_id,
         status = 'active',
         updated_at = now()
   where id = p_site_id;

  return query select p_version_id, next_number, inserted_at;
end;
$$;

create or replace function public.rollback_site_version(
  p_site_id uuid,
  p_target_version_id text
) returns table (
  version_id text,
  version_number integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_number integer;
  target_created_at timestamptz;
begin
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found';
  end if;

  select v.version_number, v.created_at
    into target_number, target_created_at
    from public.site_versions v
   where v.id = p_target_version_id
     and v.site_id = p_site_id
     and v.status in ('archived','published');

  if target_number is null then
    raise exception 'rollback target is not eligible';
  end if;

  update public.site_versions
     set status = 'archived'
   where site_id = p_site_id
     and status = 'published'
     and id <> p_target_version_id;

  update public.site_versions
     set status = 'published'
   where site_id = p_site_id
     and id = p_target_version_id;

  update public.sites
     set published_version_id = p_target_version_id,
         status = 'active',
         updated_at = now()
   where id = p_site_id;

  return query select p_target_version_id, target_number, target_created_at;
end;
$$;

revoke all on function public.publish_site_version(text, uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.rollback_site_version(uuid, text) from public, anon, authenticated;
