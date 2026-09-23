-- Prevent admins from creating new owner memberships.
-- Owners may manage any membership role; admins may add only non-owner roles.
drop policy if exists workspace_members_insert_admin on public.workspace_members;
create policy workspace_members_insert_admin
on public.workspace_members
for insert
with check (
  has_workspace_role(workspace_id, array['owner'])
  or (
    has_workspace_role(workspace_id, array['admin'])
    and role <> 'owner'
  )
  or (
    user_id = auth.uid()
    and role = 'owner'
    and not private.workspace_has_members(workspace_id)
  )
);
