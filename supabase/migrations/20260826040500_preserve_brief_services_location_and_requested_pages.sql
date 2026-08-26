create or replace function public.enrich_site_plan_request_from_brief()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_meta jsonb;
  v_notes text;
  v_services jsonb := '[]'::jsonb;
  v_service_block text;
  v_location text;
  v_requested_pages jsonb := '[]'::jsonb;
begin
  if new.site_id is null then return new; end if;

  select e.metadata
    into v_meta
  from public.ai_execution_events e
  where e.workspace_id = new.workspace_id
    and e.site_id = new.site_id
    and e.task = 'brand-normalization'
  order by e.created_at desc
  limit 1;

  v_notes := coalesce(v_meta->>'notes', new.request->>'notes', '');
  v_location := nullif(trim(coalesce(v_meta->>'location', new.request->>'location', '')), '');

  if v_location is not null and lower(regexp_replace(v_location, '[[:punct:]]+$', '')) in
      ('i have not provided','not supplied','not provided','none','n/a','na','unknown') then
    v_location := null;
  end if;

  if jsonb_typeof(v_meta->'services') = 'array' and jsonb_array_length(v_meta->'services') > 0 then
    v_services := v_meta->'services';
  elsif jsonb_typeof(new.request->'services') = 'array' and jsonb_array_length(new.request->'services') > 0 then
    v_services := new.request->'services';
  else
    select (regexp_match(v_notes, '(?is)include these treatments[[:space:]]*:[[:space:]]*(.*)include pages/sections'))[1]
      into v_service_block;
    if nullif(trim(v_service_block), '') is not null then
      select coalesce(jsonb_agg(to_jsonb(cleaned) order by ord), '[]'::jsonb)
        into v_services
      from (
        select ord,
               trim(regexp_replace(part, '^([[:space:]]|[-*•])+', '')) as cleaned
        from regexp_split_to_table(v_service_block, E'\\r?\\n|,') with ordinality as r(part, ord)
      ) s
      where length(cleaned) between 2 and 80;
    end if;
  end if;

  if lower(v_notes) ~ 'include pages/sections for[^\n]*home' then v_requested_pages := v_requested_pages || jsonb_build_array('Home'); end if;
  if lower(v_notes) ~ 'include pages/sections for[^\n]*about' then v_requested_pages := v_requested_pages || jsonb_build_array('About'); end if;
  if lower(v_notes) ~ 'include pages/sections for[^\n]*treatments' then v_requested_pages := v_requested_pages || jsonb_build_array('Treatments'); end if;
  if lower(v_notes) ~ 'include pages/sections for[^\n]*gallery' then v_requested_pages := v_requested_pages || jsonb_build_array('Gallery'); end if;
  if lower(v_notes) ~ 'include pages/sections for[^\n]*contact' then v_requested_pages := v_requested_pages || jsonb_build_array('Contact'); end if;
  if lower(v_notes) ~ 'include pages/sections for[^\n]*appointment' then v_requested_pages := v_requested_pages || jsonb_build_array('Appointment Booking'); end if;

  new.request := coalesce(new.request, '{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'business_name', nullif(v_meta->>'business_name',''),
      'location', v_location,
      'services', v_services,
      'notes', nullif(v_notes,''),
      'requested_pages', case when jsonb_array_length(v_requested_pages) > 0 then v_requested_pages else null end
    ));

  if v_location is null then new.request := new.request - 'location'; end if;
  return new;
end;
$function$;

create or replace function public.expand_succeeded_build_requested_pages()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_request jsonb;
  v_requested jsonb;
  v_home jsonb;
  v_pages jsonb := '[]'::jsonb;
  v_navigation jsonb := '[]'::jsonb;
  v_name text;
  v_path text;
  v_keep text[];
  v_sections jsonb;
begin
  if new.status <> 'succeeded' or old.status = 'succeeded' or new.output_snapshot is null then
    return new;
  end if;

  select request into v_request from public.site_plans where id = new.plan_id;
  v_requested := coalesce(v_request->'requested_pages', '[]'::jsonb);
  if jsonb_typeof(v_requested) <> 'array' or jsonb_array_length(v_requested) <= 1 then
    return new;
  end if;

  v_home := new.output_snapshot->'pages'->0;
  if v_home is null then return new; end if;

  for v_name in select jsonb_array_elements_text(v_requested)
  loop
    v_path := case lower(v_name)
      when 'home' then '/'
      when 'appointment booking' then '/appointment'
      else '/' || regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')
    end;

    v_keep := case lower(v_name)
      when 'home' then array['nav','hero','gallery','services','doctor','proof','process','cta','contact','footer']
      when 'about' then array['nav','hero','doctor','proof','process','cta','footer']
      when 'treatments' then array['nav','services','process','cta','contact','footer']
      when 'gallery' then array['nav','gallery','proof','cta','contact','footer']
      when 'contact' then array['nav','contact','cta','footer']
      when 'appointment booking' then array['nav','cta','contact','footer']
      else array['nav','hero','cta','contact','footer']
    end;

    select coalesce(jsonb_agg(sec order by ord), '[]'::jsonb)
      into v_sections
    from jsonb_array_elements(v_home->'sections') with ordinality as x(sec, ord)
    where sec->'props'->>'layoutSectionId' = any(v_keep);

    v_pages := v_pages || jsonb_build_array(jsonb_build_object(
      'id', case when lower(v_name)='home' then 'home' else regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g') end,
      'path', v_path,
      'name', v_name,
      'sections', v_sections,
      'seo', jsonb_build_object(
        'title', case when lower(v_name)='home' then new.output_snapshot->>'name' else v_name || ' | ' || new.output_snapshot->>'name' end,
        'description', case lower(v_name)
          when 'treatments' then 'Explore treatments supplied by the clinic.'
          when 'gallery' then 'View verified clinic and treatment imagery.'
          when 'contact' then 'Contact the clinic or request an appointment.'
          when 'appointment booking' then 'Request an appointment with the clinic.'
          else coalesce(v_home->'seo'->>'description', new.output_snapshot->>'name')
        end,
        'canonicalPath', v_path,
        'indexable', true,
        'structuredDataTypes', '[]'::jsonb
      )
    ));

    v_navigation := v_navigation || jsonb_build_array(jsonb_build_object('label', v_name, 'href', v_path));
  end loop;

  update public.site_build_jobs
     set output_snapshot = jsonb_set(jsonb_set(new.output_snapshot, '{pages}', v_pages, true), '{navigation}', v_navigation, true),
         updated_at = now()
   where id = new.id;

  update public.workspace_drafts
     set snapshot = jsonb_set(jsonb_set(snapshot, '{pages}', v_pages, true), '{navigation}', v_navigation, true),
         updated_at = now()
   where workspace_id = new.workspace_id and site_id = new.site_id;

  return new;
end;
$function$;

drop trigger if exists site_build_jobs_expand_requested_pages on public.site_build_jobs;
create trigger site_build_jobs_expand_requested_pages
after update of status on public.site_build_jobs
for each row
execute function public.expand_succeeded_build_requested_pages();