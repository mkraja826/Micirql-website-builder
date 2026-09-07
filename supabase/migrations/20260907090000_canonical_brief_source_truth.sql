-- V3 premium generation foundation: the user's source brief is authoritative.
--
-- The previous enrichment path preferred non-empty interpretation metadata and
-- recognised only a narrow older prompt shape. That allowed malformed metadata
-- to override explicit facts (for example, "Business name: Pearl Dental") and
-- dropped page lists written as a numbered "Pages / Create:" section.
--
-- Keep this layer deterministic. AI interpretation may enrich missing fields,
-- but it must never replace an explicit fact found in the source brief.

create or replace function public.canonicalize_site_plan_request_from_brief(
  p_request jsonb,
  p_metadata jsonb
)
returns jsonb
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_request jsonb := coalesce(p_request, '{}'::jsonb);
  v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
  v_notes text := coalesce(p_metadata->>'notes', p_request->>'notes', '');
  v_business_name text;
  v_location text;
  v_services jsonb := '[]'::jsonb;
  v_requested_pages jsonb := '[]'::jsonb;
  v_service_block text;
  v_line text;
  v_clean text;
  v_in_pages boolean := false;
  v_page_name text;
  v_explicit_match text[];
begin
  -- Explicit labelled source-brief facts always win over interpreted metadata.
  v_explicit_match := regexp_match(v_notes, '(?in)(^|\n)[[:space:]]*Business name[[:space:]]*:[[:space:]]*([^\n\r]+)');
  if v_explicit_match is not null then
    v_business_name := nullif(trim(v_explicit_match[2]), '');
  end if;
  v_business_name := coalesce(
    v_business_name,
    nullif(trim(v_request->>'business_name'), ''),
    nullif(trim(v_meta->>'business_name'), '')
  );

  v_explicit_match := regexp_match(v_notes, '(?in)(^|\n)[[:space:]]*Location[[:space:]]*:[[:space:]]*([^\n\r]+)');
  if v_explicit_match is not null then
    v_location := nullif(trim(v_explicit_match[2]), '');
  else
    v_location := coalesce(
      nullif(trim(v_request->>'location'), ''),
      nullif(trim(v_meta->>'location'), '')
    );
  end if;

  if v_location is not null and lower(regexp_replace(v_location, '[[:punct:]]+$', '')) in (
    'i have not provided', 'not supplied', 'not provided', 'none', 'n/a', 'na', 'unknown'
  ) then
    v_location := null;
  end if;

  -- Preserve only services that are explicitly supplied as services/treatments.
  -- Phrases such as "Suitable categories may include" are suggestions, not facts.
  select (regexp_match(
    v_notes,
    '(?is)(?:include these treatments|treatments provided|services provided)[[:space:]]*:[[:space:]]*(.*?)(?:\n[[:space:]]*(?:include pages|pages|visual direction|trust|appointment|contact|content|ux requirements|final requirement)\b|$)'
  ))[1] into v_service_block;

  if nullif(trim(v_service_block), '') is not null then
    select coalesce(jsonb_agg(to_jsonb(cleaned) order by ord), '[]'::jsonb)
      into v_services
    from (
      select ord,
             trim(regexp_replace(part, '^([[:space:]]|[-*•])+', '')) as cleaned
      from regexp_split_to_table(v_service_block, E'\\r?\\n|,') with ordinality as r(part, ord)
    ) s
    where length(cleaned) between 2 and 80;
  elsif jsonb_typeof(v_request->'services') = 'array'
        and jsonb_array_length(v_request->'services') > 0 then
    v_services := v_request->'services';
  elsif jsonb_typeof(v_meta->'services') = 'array'
        and jsonb_array_length(v_meta->'services') > 0
        and not exists (
          select 1
          from jsonb_array_elements_text(v_meta->'services') s(value)
          where lower(value) ~ '(if they are|if supplied|if confirmed|may include|where appropriate|not supplied|not provided)'
        ) then
    v_services := v_meta->'services';
  end if;

  -- Parse a numbered/bulleted Pages -> Create: block without depending on one
  -- exact sentence shape. Stop as soon as the next prose section starts.
  for v_line in
    select line from regexp_split_to_table(v_notes, E'\\r?\\n') as t(line)
  loop
    v_clean := trim(v_line);

    if lower(v_clean) = 'pages' then
      v_in_pages := true;
      continue;
    end if;

    if v_in_pages and lower(v_clean) in ('create:', 'create') then
      continue;
    end if;

    if v_in_pages then
      if v_clean = '' then
        continue;
      end if;

      if lower(v_clean) in (
        'home page', 'treatments', 'trust', 'appointment experience', 'contact',
        'content', 'ux requirements', 'final requirement', 'visual direction'
      ) then
        exit;
      end if;

      v_page_name := trim(regexp_replace(v_clean, '^[[:space:]]*([0-9]+[.)]|[-*•])[[:space:]]*', ''));

      if lower(v_page_name) = 'home' then
        v_requested_pages := v_requested_pages || jsonb_build_array('Home');
      elsif lower(v_page_name) = 'about' then
        v_requested_pages := v_requested_pages || jsonb_build_array('About');
      elsif lower(v_page_name) = 'treatments' then
        v_requested_pages := v_requested_pages || jsonb_build_array('Treatments');
      elsif lower(v_page_name) in ('our dentists / team', 'our dentists/team', 'our dentists', 'team') then
        v_requested_pages := v_requested_pages || jsonb_build_array('Our Dentists / Team');
      elsif lower(v_page_name) = 'patient information' then
        v_requested_pages := v_requested_pages || jsonb_build_array('Patient Information');
      elsif lower(v_page_name) in ('contact / book appointment', 'contact/book appointment', 'contact', 'book appointment') then
        v_requested_pages := v_requested_pages || jsonb_build_array('Contact / Book Appointment');
      elsif lower(v_page_name) ~ '^individual treatment detail pages' then
        v_requested_pages := v_requested_pages || jsonb_build_array('Treatment Detail');
      elsif v_clean !~ '^[[:space:]]*([0-9]+[.)]|[-*•])' then
        exit;
      end if;
    end if;
  end loop;

  -- Backward compatibility for the original concise onboarding prompt shape.
  if jsonb_array_length(v_requested_pages) = 0 then
    if lower(v_notes) ~ 'include pages/sections for[^\n]*home' then v_requested_pages := v_requested_pages || jsonb_build_array('Home'); end if;
    if lower(v_notes) ~ 'include pages/sections for[^\n]*about' then v_requested_pages := v_requested_pages || jsonb_build_array('About'); end if;
    if lower(v_notes) ~ 'include pages/sections for[^\n]*treatments' then v_requested_pages := v_requested_pages || jsonb_build_array('Treatments'); end if;
    if lower(v_notes) ~ 'include pages/sections for[^\n]*gallery' then v_requested_pages := v_requested_pages || jsonb_build_array('Gallery'); end if;
    if lower(v_notes) ~ 'include pages/sections for[^\n]*contact' then v_requested_pages := v_requested_pages || jsonb_build_array('Contact'); end if;
    if lower(v_notes) ~ 'include pages/sections for[^\n]*appointment' then v_requested_pages := v_requested_pages || jsonb_build_array('Appointment Booking'); end if;
  end if;

  -- Existing explicit structured page requests remain authoritative when the
  -- prose does not contain a Pages block.
  if jsonb_array_length(v_requested_pages) = 0
     and jsonb_typeof(v_request->'requested_pages') = 'array'
     and jsonb_array_length(v_request->'requested_pages') > 0 then
    v_requested_pages := v_request->'requested_pages';
  end if;

  v_request := v_request || jsonb_strip_nulls(jsonb_build_object(
    'business_name', v_business_name,
    'location', v_location,
    'services', v_services,
    'notes', nullif(v_notes, ''),
    'requested_pages', case when jsonb_array_length(v_requested_pages) > 0 then v_requested_pages else null end,
    'canonical_brief_version', 2
  ));

  if v_location is null then v_request := v_request - 'location'; end if;
  return v_request;
end;
$function$;

create or replace function public.enrich_site_plan_request_from_brief()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_meta jsonb;
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

  new.request := public.canonicalize_site_plan_request_from_brief(new.request, coalesce(v_meta, '{}'::jsonb));
  return new;
end;
$function$;
