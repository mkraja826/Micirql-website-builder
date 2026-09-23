-- Protect workspace owners from admin-level membership mutation.
-- Owners may still manage owner rows; admins may manage non-owner rows.
drop policy if exists workspace_members_delete_admin on public.workspace_members;
create policy workspace_members_delete_admin
on public.workspace_members
for delete
using (
  has_workspace_role(workspace_id, array['owner','admin'])
  and (role <> 'owner' or has_workspace_role(workspace_id, array['owner']))
  and not (user_id = auth.uid() and role = 'owner')
);

drop policy if exists workspace_members_update_admin on public.workspace_members;
create policy workspace_members_update_admin
on public.workspace_members
for update
using (
  has_workspace_role(workspace_id, array['owner','admin'])
  and (role <> 'owner' or has_workspace_role(workspace_id, array['owner']))
)
with check (
  has_workspace_role(workspace_id, array['owner','admin'])
  and (role <> 'owner' or has_workspace_role(workspace_id, array['owner']))
);
