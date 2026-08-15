alter table public.site_versions
  add column if not exists snapshot_hash text;

create unique index if not exists site_versions_site_snapshot_hash_idx
  on public.site_versions(site_id, snapshot_hash)
  where snapshot_hash is not null;

create or replace function public.publish_site_version(
  p_version_id text,
  p_site_id uuid,
  p_version_number integer,
  p_snapshot jsonb,
  p_snapshot_hash text,
  p_created_by text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found';
  end if;

  update public.site_versions
     set status = 'archived'
   where site_id = p_site_id
     and status = 'published';

  insert into public.site_versions (
    id, site_id, version_number, status, snapshot, snapshot_hash, created_by
  ) values (
    p_version_id, p_site_id, p_version_number, 'published', p_snapshot, p_snapshot_hash, p_created_by
  );

  update public.sites
     set published_version_id = p_version_id,
         status = 'active',
         updated_at = now()
   where id = p_site_id;
end;
$$;

create or replace function public.rollback_site_version(
  p_site_id uuid,
  p_target_version_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_exists boolean;
begin
  perform 1 from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'site not found';
  end if;

  select exists(
    select 1
      from public.site_versions
     where id = p_target_version_id
       and site_id = p_site_id
       and status in ('archived','published')
  ) into target_exists;

  if not target_exists then
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
end;
$$;

revoke all on function public.publish_site_version(text, uuid, integer, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.rollback_site_version(uuid, text) from public, anon, authenticated;
