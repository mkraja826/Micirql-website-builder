CREATE OR REPLACE FUNCTION public.run_site_build(p_plan_id uuid, p_site_id uuid)
 RETURNS site_build_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_notes text;
  v_family text;
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
  v_notes:=lower(coalesce(v_plan.request->>'notes',''));

  v_domain:=case when v_industry in ('dental','clinic','healthcare') then 'clinic' when v_industry in ('restaurant','cafe','food','hospitality') then 'restaurant' when replace(v_industry,' ','') in ('realestate','property') then 'real-estate' when v_industry in ('corporate','professional services','professional-services') then 'corporate' else 'landing-page' end;
  v_theme_family:=case when v_industry in ('restaurant','cafe','food','hospitality') then 'editorial' when replace(v_industry,' ','') in ('realestate','property') then 'luxury' else 'minimalist' end;
  v_primary_goal:=coalesce(v_plan.request->'goals'->>0,'Present the business clearly and convert visitors');

  /* Preserve explicit visual intent from the source brief when the planner-selected
     theme fell back to the generic clinic palette. These are design-token choices,
     never business facts. Do not infer services, people, contact data, reviews,
     prices, credentials or other factual content from prose. */
  if v_industry in ('dental','clinic','healthcare')
     and v_notes like '%navy%'
     and (v_notes like '%teal%' or v_notes like '%aqua%') then
    v_colors := v_colors || jsonb_build_object(
      'primary','#102A43',
      'secondary','#163A52',
      'accent','#2A9D9F',
      'background','#FAFBFC',
      'surface','#FFFFFF',
      'surfaceAlt','#F3F8F8',
      'text','#10202F',
      'muted','#617384',
      'border','#DCE6E8'
    );
  end if;

  if jsonb_typeof(v_source_sections)<>'array' or jsonb_array_length(v_source_sections)=0 then raise exception 'build_sections_missing'; end if;
  if v_layout_id is not null and not exists(select 1 from public.certified_layout_contracts c where c.id=v_layout_id and c.status='certified' and c.industry=v_industry) then raise exception 'layout_not_certified_for_industry'; end if;

  /*
    Premium composition fallback:
    certified layouts remain immutable; when no certified layout is selected,
    fill the minimum narrative arc with existing family resolvers. These sections
    contain only grounded fallback copy and are enriched later from the brief.
  */
  if v_layout_id is null then
    for v_family in
      select unnest(array['about','features','process','testimonials','gallery','cta']::text[])
    loop
      if not exists (
        select 1 from jsonb_array_elements(v_source_sections) existing
        where existing->>'family'=v_family
      ) then
        v_source_sections := v_source_sections || jsonb_build_array(
          jsonb_build_object(
            'id',concat('premium-',v_family),
            'family',v_family,
            'required',false
          )
        );
      end if;
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',concat(coalesce(s->>'id',s->>'family','section'),'-',ord),
    'component',jsonb_build_object('componentId',public.resolve_site_build_component_id(v_theme_family,v_layout_id,s->>'family',coalesce(s->>'pattern',s->'layout_rules'->>'pattern','')),'version','1.0.0'),
    'props',(
      case coalesce(s->>'family','')
        when 'navbar' then jsonb_build_object('title',v_site.name,'items',jsonb_build_array(jsonb_build_object('title','Home','href','/'),jsonb_build_object('title','Treatments','href','#services'),jsonb_build_object('title','Contact','href','#contact')),'primaryAction',jsonb_build_object('label','Book appointment','href','#contact'))
        when 'hero' then jsonb_build_object('eyebrow',initcap(v_industry),'title',v_site.name,'description',v_primary_goal,'primaryAction',jsonb_build_object('label','Book appointment','href','#contact'),'secondaryAction',jsonb_build_object('label','Explore treatments','href','#services'))
        when 'services' then jsonb_build_object('eyebrow',case when v_industry in ('dental','clinic','healthcare') then 'Treatments' else 'Services' end,'title',case when v_industry in ('dental','clinic','healthcare') then 'Treatments' else 'Services' end,'description',case when v_industry in ('dental','clinic','healthcare') then 'Explore the treatments supplied by the clinic.' else 'Explore the services provided by the business.' end,'items',coalesce((select jsonb_agg(jsonb_build_object('title',service_name) order by service_ord) from jsonb_array_elements_text(v_services) with ordinality service_values(service_name,service_ord)),'[]'::jsonb))
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
    'seoBlueprint',jsonb_build_object('primaryGoal',v_primary_goal,'targetLocations',case when nullif(v_plan.request->>'location','') is not null then jsonb_build_array(v_plan.request->>'location') else '[]'::jsonb end,'priorityTopics',v_services,'audiences','[]'::jsonb,'languages',jsonb_build_array('en'),'localSeo',nullif(v_plan.request->>'location','') is not null,'servicePages',jsonb_array_length(v_services)>0,'locationPages',false,'blog',false),
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
$function$

