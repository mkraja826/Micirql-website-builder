create table if not exists public.site_notification_preferences (
  site_id uuid primary key references public.sites(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email_address text,
  email_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_notification_preferences enable row level security;
revoke all on public.site_notification_preferences from anon, authenticated;
grant select, insert, update on public.site_notification_preferences to authenticated;

create policy site_notification_preferences_member_select on public.site_notification_preferences
for select to authenticated
using (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = site_notification_preferences.workspace_id
    and wm.user_id = auth.uid()
));

create policy site_notification_preferences_member_insert on public.site_notification_preferences
for insert to authenticated
with check (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = site_notification_preferences.workspace_id
    and wm.user_id = auth.uid()
));

create policy site_notification_preferences_member_update on public.site_notification_preferences
for update to authenticated
using (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = site_notification_preferences.workspace_id
    and wm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.workspace_members wm
  where wm.workspace_id = site_notification_preferences.workspace_id
    and wm.user_id = auth.uid()
));

comment on table public.site_notification_preferences is
  'User-editable notification destinations only. Provider credentials remain server-side and are never stored here.';
