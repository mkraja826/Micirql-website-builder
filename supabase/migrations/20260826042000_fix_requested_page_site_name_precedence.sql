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
  v_site_name text;
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
  v_site_name := coalesce(new.output_snapshot->>'name', '');

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
        'title', case when lower(v_name)='home' then v_site_name else v_name || ' | ' || v_site_name end,
        'description', case lower(v_name)
          when 'treatments' then 'Explore treatments supplied by the clinic.'
          when 'gallery' then 'View verified clinic and treatment imagery.'
          when 'contact' then 'Contact the clinic or request an appointment.'
          when 'appointment booking' then 'Request an appointment with the clinic.'
          else coalesce(v_home->'seo'->>'description', v_site_name)
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
