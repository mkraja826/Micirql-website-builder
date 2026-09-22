-- Keep the first-owner bootstrap predicate as a private database helper,
-- not a callable RPC in the exposed public schema.
create schema if not exists private;
comment on schema private is 'Internal helpers; this schema must remain excluded from the Supabase Data API.';

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.workspace_has_members(p_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
  );
$$;

revoke all on function private.workspace_has_members(uuid) from public, anon, authenticated;
grant execute on function private.workspace_has_members(uuid) to authenticated;

drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin
on public.workspace_members
for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner','admin'])
  or (
    user_id = auth.uid()
    and role = 'owner'
    and not private.workspace_has_members(workspace_id)
  )
);

-- The RLS policy now calls the internal helper. Remove the exposed RPC.
revoke all on function public.workspace_has_members(uuid) from public, anon, authenticated;
drop function public.workspace_has_members(uuid);
