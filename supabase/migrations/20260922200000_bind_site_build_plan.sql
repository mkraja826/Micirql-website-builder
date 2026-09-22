create schema if not exists private;
comment on schema private is 'Internal helpers; this schema must remain excluded from the Supabase Data API.';

create or replace function private.enforce_site_build_plan_binding()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if not exists (
    select 1
    from public.site_plans p
    where p.id = new.plan_id
      and p.site_id = new.site_id
  ) then
    raise exception 'site_build_plan_mismatch';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_site_build_plan_binding() from public, anon, authenticated;

drop trigger if exists site_build_jobs_plan_site_binding
on public.site_build_jobs;

create trigger site_build_jobs_plan_site_binding
before insert or update of plan_id, site_id
on public.site_build_jobs
for each row
execute function private.enforce_site_build_plan_binding();
