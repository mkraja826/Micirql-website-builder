create or replace function public.resolve_site_owner_notification_email(p_site_id uuid)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select lower(trim(u.email))
  from public.sites s
  join public.workspace_members wm
    on wm.workspace_id = s.workspace_id
   and wm.role = 'owner'
  join auth.users u
    on u.id = wm.user_id
  where s.id = p_site_id
    and u.email is not null
    and trim(u.email) <> ''
    and u.email_confirmed_at is not null
  order by wm.created_at asc nulls last
  limit 1;
$$;

revoke all on function public.resolve_site_owner_notification_email(uuid) from public, anon, authenticated;
grant execute on function public.resolve_site_owner_notification_email(uuid) to service_role;

comment on function public.resolve_site_owner_notification_email(uuid) is
  'Server-only fallback for enquiry notifications when a site has no explicit notification preference.';
