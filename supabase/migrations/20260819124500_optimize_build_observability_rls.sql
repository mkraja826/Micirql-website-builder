drop policy if exists build_observability_workspace_select on public.build_observability;
create policy build_observability_workspace_select on public.build_observability
for select to authenticated using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = build_observability.workspace_id
      and wm.user_id = (select auth.uid())
  )
);

drop policy if exists build_observability_workspace_insert on public.build_observability;
create policy build_observability_workspace_insert on public.build_observability
for insert to authenticated with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = build_observability.workspace_id
      and wm.user_id = (select auth.uid())
  )
);
