create table if not exists public.workspace_drafts (
  workspace_id uuid not null,
  site_id uuid primary key,
  revision bigint not null default 0,
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);

create index if not exists workspace_drafts_workspace_id_idx on public.workspace_drafts(workspace_id);

alter table public.workspace_drafts enable row level security;
revoke all on table public.workspace_drafts from anon, authenticated;

create or replace function public.save_workspace_draft(
  p_workspace_id uuid,
  p_site_id uuid,
  p_expected_revision bigint,
  p_snapshot jsonb,
  p_updated_by uuid
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_revision bigint;
begin
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
$$;

revoke all on function public.save_workspace_draft(uuid, uuid, bigint, jsonb, uuid) from public;
