do $$
begin
  if to_regclass('public.workspace_members') is null then
    raise notice 'workspace_members does not exist yet; owner submission policies skipped';
    return;
  end if;

  grant select, update on public.site_function_records to authenticated;
  grant select, insert, update, delete on public.site_notification_destinations to authenticated;
  grant select on public.notification_delivery_log to authenticated;

  execute 'drop policy if exists site_function_records_workspace_read on public.site_function_records';
  execute 'create policy site_function_records_workspace_read on public.site_function_records for select to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id::text = site_function_records.workspace_id and wm.user_id = auth.uid()))';

  execute 'drop policy if exists site_function_records_workspace_update on public.site_function_records';
  execute 'create policy site_function_records_workspace_update on public.site_function_records for update to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id::text = site_function_records.workspace_id and wm.user_id = auth.uid())) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id::text = site_function_records.workspace_id and wm.user_id = auth.uid()))';

  execute 'drop policy if exists site_notification_destinations_workspace_read on public.site_notification_destinations';
  execute 'create policy site_notification_destinations_workspace_read on public.site_notification_destinations for select to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = site_notification_destinations.workspace_id and wm.user_id = auth.uid()))';

  execute 'drop policy if exists site_notification_destinations_workspace_write on public.site_notification_destinations';
  execute 'create policy site_notification_destinations_workspace_write on public.site_notification_destinations for all to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = site_notification_destinations.workspace_id and wm.user_id = auth.uid())) with check (exists (select 1 from public.workspace_members wm where wm.workspace_id = site_notification_destinations.workspace_id and wm.user_id = auth.uid()))';

  execute 'drop policy if exists notification_delivery_log_workspace_read on public.notification_delivery_log';
  execute 'create policy notification_delivery_log_workspace_read on public.notification_delivery_log for select to authenticated using (exists (select 1 from public.workspace_members wm where wm.workspace_id = notification_delivery_log.workspace_id and wm.user_id = auth.uid()))';
end $$;
