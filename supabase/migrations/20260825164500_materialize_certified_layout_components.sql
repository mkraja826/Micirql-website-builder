-- Materialize planned layouts into the canonical renderer registry instead of
-- legacy <family>.placeholder component ids. Keep this resolver aligned with
-- apps/builder/app/apply-layout-blueprint.ts and packages/sections/src/catalog.ts.

create or replace function public.resolve_site_build_component_id(
  p_theme_family text,
  p_layout_id text,
  p_family text,
  p_pattern text default ''
)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_theme_code text;
  v_family_code text;
  v_variant integer := 1;
  v_shell_number integer;
  v_pattern text := lower(coalesce(p_pattern,''));
begin
  v_theme_code := case lower(coalesce(p_theme_family,''))
    when 'minimalist' then 'MIN'
    when 'corporate' then 'COR'
    when 'luxury' then 'LUX'
    when 'editorial' then 'EDT'
    when 'glass' then 'GLS'
    when 'maximalist' then 'MAX'
    when 'organic' then 'ORG'
    when 'futuristic' then 'FUT'
    when 'playful' then 'PLY'
    when 'cinematic' then 'CIN'
    else null
  end;

  v_family_code := case lower(coalesce(p_family,''))
    when 'navbar' then 'NAV'
    when 'hero' then 'HERO'
    when 'about' then 'ABOUT'
    when 'services' then 'SERV'
    when 'features' then 'FEAT'
    when 'process' then 'PROC'
    when 'faq' then 'FAQ'
    when 'testimonials' then 'TEST'
    when 'gallery' then 'GALL'
    when 'team' then 'TEAM'
    when 'cta' then 'CTA'
    when 'contact' then 'CONT'
    when 'footer' then 'FOOT'
    else null
  end;

  if v_theme_code is null then raise exception 'unsupported_theme_family:%', p_theme_family; end if;
  if v_family_code is null then raise exception 'unsupported_section_family:%', p_family; end if;

  if lower(p_family) in ('navbar','hero','footer') and nullif(p_layout_id,'') is not null then
    -- Certified Dental shell blueprint numbers from dental-layout-blueprints.ts.
    v_shell_number := case lower(p_family)
      when 'navbar' then case p_layout_id
        when 'dental-01-clinical-authority' then 1 when 'dental-02-implant-luxury' then 16
        when 'dental-03-smile-studio' then 3 when 'dental-04-family-care' then 12
        when 'dental-05-digital-dentistry' then 13 when 'dental-06-doctor-brand' then 9
        when 'dental-07-conversion-engine' then 12 when 'dental-08-boutique-cosmetic' then 16
        when 'dental-09-ortho-journey' then 2 when 'dental-10-emergency-trust' then 2
        when 'dental-11-editorial-clinic' then 9 when 'dental-12-wellness-calm' then 4
        when 'dental-13-implant-results' then 1 when 'dental-14-city-clinic' then 4
        when 'dental-15-smile-campaign' then 14 when 'dental-16-multi-specialty' then 7
        when 'dental-17-photo-story' then 5 when 'dental-18-proof-first' then 1
        when 'dental-19-minimal-white' then 16 when 'dental-20-premium-complete' then 2
        else null end
      when 'hero' then case p_layout_id
        when 'dental-01-clinical-authority' then 11 when 'dental-02-implant-luxury' then 24
        when 'dental-03-smile-studio' then 22 when 'dental-04-family-care' then 8
        when 'dental-05-digital-dentistry' then 6 when 'dental-06-doctor-brand' then 11
        when 'dental-07-conversion-engine' then 9 when 'dental-08-boutique-cosmetic' then 15
        when 'dental-09-ortho-journey' then 10 when 'dental-10-emergency-trust' then 18
        when 'dental-11-editorial-clinic' then 5 when 'dental-12-wellness-calm' then 3
        when 'dental-13-implant-results' then 21 when 'dental-14-city-clinic' then 20
        when 'dental-15-smile-campaign' then 13 when 'dental-16-multi-specialty' then 10
        when 'dental-17-photo-story' then 4 when 'dental-18-proof-first' then 9
        when 'dental-19-minimal-white' then 15 when 'dental-20-premium-complete' then 14
        else null end
      when 'footer' then case p_layout_id
        when 'dental-01-clinical-authority' then 4 when 'dental-02-implant-luxury' then 7
        when 'dental-03-smile-studio' then 9 when 'dental-04-family-care' then 4
        when 'dental-05-digital-dentistry' then 10 when 'dental-06-doctor-brand' then 7
        when 'dental-07-conversion-engine' then 3 when 'dental-08-boutique-cosmetic' then 7
        when 'dental-09-ortho-journey' then 4 when 'dental-10-emergency-trust' then 4
        when 'dental-11-editorial-clinic' then 7 when 'dental-12-wellness-calm' then 2
        when 'dental-13-implant-results' then 10 when 'dental-14-city-clinic' then 4
        when 'dental-15-smile-campaign' then 3 when 'dental-16-multi-specialty' then 6
        when 'dental-17-photo-story' then 9 when 'dental-18-proof-first' then 2
        when 'dental-19-minimal-white' then 2 when 'dental-20-premium-complete' then 3
        else null end
    end;
    if v_shell_number is null then raise exception 'unsupported_certified_layout:%', p_layout_id; end if;
  end if;

  if lower(p_family) = 'navbar' then
    v_variant := case when v_shell_number in (2,6) then 2 when v_shell_number=3 then 3 when v_shell_number in (4,5) then 4 when v_shell_number in (9,15,16) then 5 else 1 end;
  elsif lower(p_family) = 'hero' then
    v_variant := case when v_shell_number in (2,8,11,20,21) then 2 when v_shell_number in (3,6,7,9,10,18,19) then 3 when v_shell_number in (5,13,15,17,22,23) then 4 when v_shell_number in (4,12,16,24) then 5 else 1 end;
  elsif lower(p_family) = 'footer' then
    v_variant := case when v_shell_number=2 then 2 when v_shell_number in (3,10) then 3 when v_shell_number in (4,8) then 4 when v_shell_number in (7,9) then 5 else 1 end;
  elsif lower(p_family) = 'testimonials' then
    v_variant := case when p_layout_id='dental-18-proof-first' and v_pattern='patient-proof' then 4 when v_pattern ~ '(trust-strip|metric|proof-strip)' then 3 when v_pattern ~ '(wall|reviews-wall)' then 4 when v_pattern ~ 'dark' then 5 else 2 end;
  elsif lower(p_family) = 'services' then
    v_variant := case when v_pattern ~ 'editorial' then 4 when v_pattern ~ 'band' then 5 when v_pattern ~ 'list' then 2 else 3 end;
  elsif lower(p_family) = 'team' then
    v_variant := case when v_pattern ~ 'editorial' then 4 when v_pattern ~ 'profile-list' then 3 when v_pattern ~ 'dark' then 5 else 2 end;
  elsif lower(p_family) = 'features' then
    v_variant := case when v_pattern ~ 'bento' then 3 when v_pattern ~ 'editorial' then 4 when v_pattern ~ 'dark' then 5 else 2 end;
  elsif lower(p_family) = 'process' then
    v_variant := case when v_pattern ~ '(timeline|journey)' then 3 when v_pattern ~ 'sticky' then 4 when v_pattern ~ 'band' then 5 else 2 end;
  elsif lower(p_family) = 'gallery' then
    v_variant := case when v_pattern ~ 'rail' then 3 when v_pattern ~ 'editorial' then 4 when v_pattern ~ '(full|immersive)' then 5 else 2 end;
  elsif lower(p_family) = 'cta' then
    v_variant := case when v_pattern ~ 'center' then 3 when v_pattern ~ 'panel' then 4 when v_pattern ~ 'brand' then 5 else 2 end;
  elsif lower(p_family) = 'contact' then
    v_variant := case when v_pattern ~ 'center' then 3 when v_pattern ~ 'panel' then 4 when v_pattern ~ 'dark' then 5 else 2 end;
  elsif lower(p_family) = 'about' then
    v_variant := case when v_pattern ~ 'story' then 2 when v_pattern ~ 'center' then 3 when v_pattern ~ 'editorial' then 4 when v_pattern ~ 'statement' then 5 else 1 end;
  end if;

  return concat(v_theme_code,'-',v_family_code,'-',lpad(v_variant::text,3,'0'));
end;
$function$;

create or replace function public.run_site_build(p_plan_id uuid, p_site_id uuid)
returns public.site_build_jobs
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_plan public.site_plans;
  v_site public.sites;
  v_job public.site_build_jobs;
  v_snapshot jsonb;
  v_revision bigint;
  v_industry text;
  v_subindustry text;
  v_theme jsonb;
  v_colors jsonb;
  v_typography jsonb;
  v_domain text;
  v_theme_family text;
  v_sections jsonb;
  v_source_sections jsonb;
  v_primary_goal text;
  v_services jsonb;
  v_layout jsonb;
  v_layout_id text;
  v_layout_archetype text;
begin
  select * into v_plan from public.site_plans where id=p_plan_id;
  if not found then raise exception 'plan_not_found'; end if;
  select * into v_site from public.sites where id=p_site_id;
  if not found then raise exception 'site_not_found'; end if;
  if v_plan.workspace_id<>v_site.workspace_id then raise exception 'workspace_mismatch'; end if;
  if not public.has_workspace_role(v_site.workspace_id,array['owner','admin','editor']) then raise exception 'forbidden'; end if;

  v_industry:=lower(coalesce(v_plan.request->>'industry',v_plan.blueprint->'industry_pack'->>'industry','landing-page'));
  v_subindustry:=coalesce(nullif(v_plan.request->>'subindustry',''),'');
  v_theme:=coalesce(v_plan.blueprint->'theme','{}'::jsonb);
  v_colors:=coalesce(v_theme->'colors','{}'::jsonb);
  v_typography:=coalesce(v_theme->'typography','{}'::jsonb);
  v_services:=case when jsonb_typeof(v_plan.request->'services')='array' then coalesce(v_plan.request->'services','[]'::jsonb) else '[]'::jsonb end;
  v_layout:=coalesce(v_plan.blueprint->'layout_blueprint','{}'::jsonb);
  v_layout_id:=nullif(v_layout->>'id','');
  v_layout_archetype:=nullif(v_layout->>'archetype','');
  v_source_sections:=case when jsonb_typeof(v_layout->'sections')='array' then v_layout->'sections' else coalesce(v_plan.blueprint->'sections','[]'::jsonb) end;

  v_domain:=case when v_industry in ('dental','clinic','healthcare') then 'clinic' when v_industry in ('restaurant','cafe','food','hospitality') then 'restaurant' when replace(v_industry,' ','') in ('realestate','property') then 'real-estate' when v_industry in ('corporate','professional services','professional-services') then 'corporate' else 'landing-page' end;
  v_theme_family:=case when v_industry in ('restaurant','cafe','food','hospitality') then 'editorial' when replace(v_industry,' ','') in ('realestate','property') then 'luxury' else 'minimalist' end;
  v_primary_goal:=coalesce(v_plan.request->'goals'->>0,'Present the business clearly and convert visitors');

  if jsonb_typeof(v_source_sections)<>'array' or jsonb_array_length(v_source_sections)=0 then raise exception 'build_sections_missing'; end if;
  if v_layout_id is not null and not exists(select 1 from public.certified_layout_contracts c where c.id=v_layout_id and c.status='certified' and c.industry=v_industry) then raise exception 'layout_not_certified_for_industry'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',concat(coalesce(s->>'id',s->>'family','section'),'-',ord),
    'component',jsonb_build_object('componentId',public.resolve_site_build_component_id(v_theme_family,v_layout_id,s->>'family',coalesce(s->>'pattern',s->'layout_rules'->>'pattern','')),'version','1.0.0'),
    'props',(
      case coalesce(s->>'family','')
        when 'navbar' then jsonb_build_object('title',v_site.name,'items',jsonb_build_array(jsonb_build_object('title','Home','href','/'),jsonb_build_object('title','Services','href','#services'),jsonb_build_object('title','Contact','href','#contact')),'primaryAction',jsonb_build_object('label','Book appointment','href','#contact'))
        when 'hero' then jsonb_build_object('eyebrow',initcap(v_industry),'title',v_site.name,'description',v_primary_goal,'primaryAction',jsonb_build_object('label','Book appointment','href','#contact'),'secondaryAction',jsonb_build_object('label','Explore services','href','#services'))
        when 'services' then jsonb_build_object('eyebrow','Services','title','Services','description','Explore the services provided by the business.','items',coalesce((select jsonb_agg(jsonb_build_object('title',service_name) order by service_ord) from jsonb_array_elements_text(v_services) with ordinality service_values(service_name,service_ord)),'[]'::jsonb))
        when 'gallery' then jsonb_build_object('eyebrow','Gallery','title','Gallery','description','Verified clinic and treatment imagery can be presented here.','items','[]'::jsonb)
        when 'team' then jsonb_build_object('eyebrow','Team','title','Clinical team','description','Verified clinician profiles and qualifications can be presented here.','items','[]'::jsonb)
        when 'testimonials' then jsonb_build_object('eyebrow','Patient feedback','title','Patient feedback','description','Only verified patient feedback should be published here.','items','[]'::jsonb)
        when 'process' then jsonb_build_object('eyebrow','Next steps','title','What happens next','description','Contact the clinic to discuss the appropriate next step.','items','[]'::jsonb)
        when 'cta' then jsonb_build_object('eyebrow','Next step','title','Ready to get in touch?','description','Request an appointment to discuss your needs.','primaryAction',jsonb_build_object('label','Book appointment','href','#contact'))
        when 'contact' then jsonb_build_object('eyebrow','Contact','title','Request an appointment','description','Send your details and preferred contact information to request an appointment.','primaryAction',jsonb_build_object('label','Send request','href','#contact-form'))
        when 'footer' then jsonb_build_object('title',v_site.name,'description','Business information and contact options.','items',jsonb_build_array(jsonb_build_object('title','Home','href','/'),jsonb_build_object('title','Contact','href','#contact')))
        else jsonb_build_object('title',initcap(replace(coalesce(s->>'id',s->>'family','Section'),'-',' ')),'description','Information supplied by the business can be presented here.','items','[]'::jsonb)
      end
      || case when v_layout_id is null then '{}'::jsonb else jsonb_build_object('layoutBlueprintId',v_layout_id,'layoutArchetype',v_layout_archetype,'layoutSectionId',coalesce(s->>'id',s->>'family'),'layoutPattern',coalesce(s->>'pattern',s->'layout_rules'->>'pattern',''),'layoutPurpose',coalesce(s->>'purpose',s->'layout_rules'->>'purpose',''),'layoutVisualLocked',true) end
      || case coalesce(s->>'family','') when 'team' then jsonb_build_object('imageSlotMode','items','itemImageRatio','4:5','imageFit','cover','imageFocalPoint','face-safe') when 'gallery' then jsonb_build_object('imageSlotMode','items','itemImageRatio','4:3','imageFit','cover','imageFocalPoint','center') when 'services' then jsonb_build_object('itemImageRatio','4:3','imageFit','cover','imageFocalPoint','center') else '{}'::jsonb end
      || case coalesce(s->>'pattern',s->'layout_rules'->>'pattern','') when 'trust-strip' then jsonb_build_object('paletteRole','secondary','cardPaletteRole','secondary') when 'technology-proof' then jsonb_build_object('paletteRole','surface','cardPaletteRole','background') when 'appointment-conversion' then jsonb_build_object('paletteRole','primary','ctaPaletteRole','accent') when 'clinic-contact' then jsonb_build_object('paletteRole','background','cardPaletteRole','surface') else '{}'::jsonb end
    ),
    'bindings','{}'::jsonb,
    'hidden',false
  ) order by ord),'[]'::jsonb)
  into v_sections
  from jsonb_array_elements(v_source_sections) with ordinality as x(s,ord);

  if exists(select 1 from jsonb_array_elements(v_sections) e where e->'component'->>'componentId' like '%.placeholder') then raise exception 'placeholder_component_materialization_forbidden'; end if;

  insert into public.site_build_jobs(workspace_id,site_id,plan_id,requested_by,status,started_at,input)
  values(v_site.workspace_id,v_site.id,v_plan.id,auth.uid(),'running',now(),jsonb_build_object('plan',v_plan.request)) returning * into v_job;

  v_snapshot:=jsonb_build_object(
    'schemaVersion','1.0.0','siteId',v_site.id::text,'workspaceId',v_site.workspace_id::text,'name',v_site.name,'domain',v_domain,'subtype',v_subindustry,
    'theme',jsonb_build_object('family',v_theme_family,'modifiers',case when v_industry in ('restaurant','cafe','food','hospitality') then jsonb_build_array('light','photography-led') else jsonb_build_array('light') end,'brand',jsonb_build_object(
      'colors',jsonb_build_object('primary',coalesce(v_colors->>'primary','#5B4AE5'),'secondary',coalesce(v_colors->>'secondary','#17171C'),'accent',coalesce(v_colors->>'accent',v_colors->>'primary','#8B7FFF'),'background',coalesce(v_colors->>'background',v_colors->>'surface','#FFFFFF'),'surface',coalesce(v_colors->>'surface','#FFFFFF'),'textPrimary',coalesce(v_colors->>'text','#17171C'),'textSecondary',coalesce(v_colors->>'muted','#6E6E7A'),'border',coalesce(v_colors->>'border','#DDDDE3'),'success',coalesce(v_colors->>'success','#168A4A'),'warning',coalesce(v_colors->>'warning','#AD6A00'),'error',coalesce(v_colors->>'error','#C93636')),
      'typography',jsonb_build_object('display',coalesce(v_typography->>'heading','Inter'),'body',coalesce(v_typography->>'body','Inter'),'ui',coalesce(v_typography->>'body','Inter')),'density','comfortable','shape',case when v_theme_family='luxury' then 'sharp' else 'balanced' end,'motion','subtle')),
    'seoBlueprint',jsonb_build_object('primaryGoal',v_primary_goal,'targetLocations',case when nullif(v_plan.request->>'location','') is not null then jsonb_build_array(v_plan.request->>'location') else '[]'::jsonb end,'priorityTopics',v_services,'audiences','[]'::jsonb,'languages',jsonb_build_array('en'),'localSeo',nullif(v_plan.request->>'location','') is not null,'servicePages',true,'locationPages',false,'blog',false),
    'pages',jsonb_build_array(jsonb_build_object('id','home','path','/','name','Home','sections',v_sections,'seo',jsonb_build_object('title',left(v_site.name,70),'description',left(concat(v_site.name,' — ',v_primary_goal,'.'),180),'canonicalPath','/','indexable',true,'structuredDataTypes','[]'::jsonb))),
    'navigation',jsonb_build_array(jsonb_build_object('label','Home','href','/')),'integrations','[]'::jsonb,'domains','[]'::jsonb);

  select revision into v_revision from public.workspace_drafts where workspace_id=v_site.workspace_id and site_id=v_site.id for update;
  if found then update public.workspace_drafts set revision=revision+1,snapshot=v_snapshot,updated_at=now(),updated_by=auth.uid() where workspace_id=v_site.workspace_id and site_id=v_site.id;
  else insert into public.workspace_drafts(workspace_id,site_id,revision,snapshot,updated_at,updated_by) values(v_site.workspace_id,v_site.id,1,v_snapshot,now(),auth.uid()); end if;

  update public.site_build_jobs set status='succeeded',completed_at=now(),output_snapshot=v_snapshot,updated_at=now() where id=v_job.id returning * into v_job;
  return v_job;
exception when others then
  if v_job.id is not null then update public.site_build_jobs set status='failed',completed_at=now(),error_code=SQLSTATE,error_message=SQLERRM,updated_at=now() where id=v_job.id; end if;
  raise;
end;
$function$;
