insert into public.site_notification_preferences (
  site_id,
  workspace_id,
  email_address,
  email_enabled,
  created_at,
  updated_at
)
select
  s.id,
  s.workspace_id,
  owner.email,
  true,
  now(),
  now()
from public.sites s
cross join lateral (
  select lower(trim(u.email)) as email
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = s.workspace_id
    and wm.role = 'owner'
    and u.email is not null
    and trim(u.email) <> ''
    and u.email_confirmed_at is not null
  order by wm.created_at asc nulls last
  limit 1
) owner
where not exists (
  select 1
  from public.site_notification_preferences p
  where p.site_id = s.id
);

create or replace function public.initialize_site_owner_notification_preference()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  owner_email text;
begin
  if exists (select 1 from public.site_notification_preferences where site_id = new.id) then
    return new;
  end if;

  select lower(trim(u.email))
    into owner_email
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = new.workspace_id
    and wm.role = 'owner'
    and u.email is not null
    and trim(u.email) <> ''
    and u.email_confirmed_at is not null
  order by wm.created_at asc nulls last
  limit 1;

  if owner_email is not null then
    insert into public.site_notification_preferences (
      site_id,
      workspace_id,
      email_address,
      email_enabled,
      created_at,
      updated_at
    ) values (
      new.id,
      new.workspace_id,
      owner_email,
      true,
      now(),
      now()
    ) on conflict (site_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists initialize_site_owner_notification_preference on public.sites;
create trigger initialize_site_owner_notification_preference
after insert on public.sites
for each row execute function public.initialize_site_owner_notification_preference();

revoke all on function public.initialize_site_owner_notification_preference() from public, anon, authenticated;
