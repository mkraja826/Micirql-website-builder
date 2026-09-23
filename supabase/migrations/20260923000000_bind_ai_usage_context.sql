create schema if not exists private;
comment on schema private is 'Internal helpers; this schema must remain excluded from the Supabase Data API.';

create or replace function private.enforce_ai_usage_context()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if new.site_id is not null
     and not exists (
       select 1
       from public.sites s
       where s.id = new.site_id
         and s.workspace_id = new.workspace_id
     ) then
    raise exception 'ai_usage_site_workspace_mismatch';
  end if;

  if new.build_id is not null
     and not exists (
       select 1
       from public.site_build_jobs b
       where b.id = new.build_id
         and b.workspace_id = new.workspace_id
         and (new.site_id is null or b.site_id = new.site_id)
     ) then
    raise exception 'ai_usage_build_context_mismatch';
  end if;

  return new;
end;
$function$;

revoke all on function private.enforce_ai_usage_context() from public, anon, authenticated;

drop trigger if exists ai_usage_events_context_binding
on public.ai_usage_events;

create trigger ai_usage_events_context_binding
before insert or update of workspace_id, site_id, build_id
on public.ai_usage_events
for each row
execute function private.enforce_ai_usage_context();
