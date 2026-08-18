create table if not exists public.certified_layout_contracts (
  id text primary key,
  industry text not null,
  status text not null check (status in ('certified','retired')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certified_layout_contracts enable row level security;

insert into public.certified_layout_contracts (id, industry, status, version)
values
  ('dental-01-clinical-authority','dental','certified',1),
  ('dental-02-implant-luxury','dental','certified',1),
  ('dental-03-smile-studio','dental','certified',1),
  ('dental-04-family-care','dental','certified',1),
  ('dental-05-digital-dentistry','dental','certified',1),
  ('dental-06-doctor-brand','dental','certified',1),
  ('dental-07-conversion-engine','dental','certified',1),
  ('dental-08-boutique-cosmetic','dental','certified',1),
  ('dental-09-ortho-journey','dental','certified',1),
  ('dental-10-emergency-trust','dental','certified',1),
  ('dental-11-editorial-clinic','dental','certified',1),
  ('dental-12-wellness-calm','dental','certified',1),
  ('dental-13-implant-results','dental','certified',1),
  ('dental-14-city-clinic','dental','certified',1),
  ('dental-15-smile-campaign','dental','certified',1),
  ('dental-16-multi-specialty','dental','certified',1),
  ('dental-17-photo-story','dental','certified',1),
  ('dental-18-proof-first','dental','certified',1),
  ('dental-19-minimal-white','dental','certified',1),
  ('dental-20-premium-complete','dental','certified',1)
on conflict (id) do update
set industry = excluded.industry,
    status = excluded.status,
    version = excluded.version,
    updated_at = now();

drop function if exists public.plan_site_blueprint(uuid,uuid,text,text,text[],text[],text[]);

create or replace function public.plan_site_blueprint(
  p_workspace_id uuid,
  p_site_id uuid,
  p_industry text,
  p_subindustry text default null,
  p_style_tags text[] default '{}'::text[],
  p_required_capabilities text[] default '{}'::text[],
  p_goals text[] default '{}'::text[],
  p_layout_blueprint jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_pack public.industry_packs%rowtype;
  v_theme public.design_themes%rowtype;
  v_sections jsonb;
  v_components jsonb;
  v_blueprint jsonb;
  v_industry text := lower(trim(coalesce(p_industry,'')));
  v_subindustry text := lower(trim(coalesce(p_subindustry,'')));
  v_layout_id text := nullif(trim(coalesce(p_layout_blueprint->>'id','')), '');
  v_layout_industry text;
  v_layout_status text;
  v_layout_sections jsonb := coalesce(p_layout_blueprint->'sections','[]'::jsonb);
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then raise exception 'insufficient workspace role'; end if;
  if p_site_id is not null and not exists (select 1 from public.sites s where s.id=p_site_id and s.workspace_id=p_workspace_id) then raise exception 'site does not belong to workspace'; end if;

  select * into v_pack
  from public.industry_packs ip
  where ip.status='active'
    and (
      lower(ip.industry)=v_industry
      or replace(lower(ip.industry),'-',' ')=replace(v_industry,'-',' ')
      or (v_subindustry<>'' and exists(select 1 from unnest(ip.subindustries) x where lower(x)=v_subindustry))
      or (ip.id='pack_professional_services' and (
        v_industry in ('professional services','professional-services','corporate','consulting','technology','technology services','it services','business services','software','software services','saas')
        or v_industry like '%consult%'
        or v_industry like '%professional%'
        or v_industry like '%technology%'
        or v_industry like '%software%'
      ))
    )
  order by
    (case when lower(ip.industry)=v_industry then 1000 else 0 end)
    + (case when replace(lower(ip.industry),'-',' ')=replace(v_industry,'-',' ') then 900 else 0 end)
    + (case when v_subindustry<>'' and exists(select 1 from unnest(ip.subindustries) x where lower(x)=v_subindustry) then 500 else 0 end)
    + (case when ip.id='pack_professional_services' then 100 else 0 end)
    desc,
    ip.version desc
  limit 1;

  if v_pack.id is null then
    select * into v_pack from public.industry_packs where id='pack_professional_services' and status='active' limit 1;
  end if;
  if v_pack.id is null then raise exception 'no compatible active industry pack found'; end if;

  select * into v_theme
  from public.design_themes dt
  where dt.status='active'
    and (
      dt.id=any(v_pack.recommended_theme_ids)
      or exists(select 1 from unnest(dt.industry_tags) t where lower(t)=v_industry)
    )
  order by
    (case when dt.id=any(v_pack.recommended_theme_ids) then 100 else 0 end)
    + cardinality(array(select unnest(coalesce(dt.style_tags,'{}'::text[])) intersect select unnest(coalesce(p_style_tags,'{}'::text[])))) * 4 desc,
    dt.version desc
  limit 1;
  if v_theme.id is null then select * into v_theme from public.design_themes where id='theme_corporate_modern' limit 1; end if;

  if v_layout_id is not null then
    select industry, status into v_layout_industry, v_layout_status
    from public.certified_layout_contracts
    where id = v_layout_id;

    if v_layout_status <> 'certified' then raise exception 'layout_not_certified'; end if;
    if v_layout_industry is distinct from v_industry then raise exception 'layout_industry_mismatch'; end if;
    if jsonb_typeof(v_layout_sections) <> 'array' or jsonb_array_length(v_layout_sections) < 3 or jsonb_array_length(v_layout_sections) > 16 then
      raise exception 'invalid_layout_section_contract';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_layout_sections) s
      where coalesce(s->>'family','') not in ('navbar','hero','about','services','features','process','testimonials','gallery','team','cta','contact','footer')
    ) then raise exception 'invalid_layout_section_family'; end if;

    if not exists (select 1 from jsonb_array_elements(v_layout_sections) s where s->>'family'='navbar')
      or not exists (select 1 from jsonb_array_elements(v_layout_sections) s where s->>'family'='hero')
      or not exists (select 1 from jsonb_array_elements(v_layout_sections) s where s->>'family'='footer')
      or not exists (select 1 from jsonb_array_elements(v_layout_sections) s where s->>'family' in ('cta','contact')) then
      raise exception 'incomplete_layout_section_contract';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'id',coalesce(nullif(s->>'id',''),concat(coalesce(s->>'family','section'),'-',ord)),
      'name',initcap(replace(coalesce(nullif(s->>'id',''),coalesce(s->>'family','section')),'-',' ')),
      'family',s->>'family',
      'component_slots','[]'::jsonb,
      'content_schema','{}'::jsonb,
      'layout_rules',jsonb_build_object('pattern',coalesce(s->>'pattern',''),'purpose',coalesce(s->>'purpose',''),'required',coalesce((s->>'required')::boolean,false)),
      'responsive_rules','{}'::jsonb
    ) order by ord),'[]'::jsonb)
    into v_sections
    from jsonb_array_elements(v_layout_sections) with ordinality x(s,ord);
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'family',s.family,'component_slots',s.component_slots,'content_schema',s.content_schema,
      'layout_rules',s.layout_rules,'responsive_rules',s.responsive_rules
    ) order by ord),'[]'::jsonb)
    into v_sections
    from unnest(v_pack.recommended_section_ids) with ordinality r(id,ord)
    join public.section_library s on s.id=r.id and s.status='active';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'name',c.name,'family',c.family,'variant',c.variant,'render_key',c.render_key,
    'default_props',c.default_props,'capabilities',c.capabilities
  ) order by c.family,c.id),'[]'::jsonb)
  into v_components
  from public.component_library c
  where c.status='active'
    and (cardinality(p_required_capabilities)=0 or c.capabilities && p_required_capabilities or exists(select 1 from unnest(c.industry_tags) t where lower(t)=v_industry));

  v_blueprint:=jsonb_build_object(
    'industry_pack',jsonb_build_object('id',v_pack.id,'name',v_pack.name,'industry',v_pack.industry,'structure',v_pack.default_site_structure,'content_requirements',v_pack.content_requirements),
    'theme',jsonb_build_object('id',v_theme.id,'name',v_theme.name,'colors',v_theme.color_tokens,'typography',v_theme.typography_tokens,'spacing',v_theme.spacing_tokens,'radius',v_theme.radius_tokens,'shadows',v_theme.shadow_tokens,'motion',v_theme.motion_tokens,'layout',v_theme.layout_tokens),
    'sections',v_sections,
    'components',v_components,
    'required_capabilities',p_required_capabilities,
    'goals',p_goals,
    'layout_blueprint',case when v_layout_id is null then null else jsonb_build_object('id',v_layout_id,'name',p_layout_blueprint->>'name','archetype',p_layout_blueprint->>'archetype','status','certified','sections',v_layout_sections) end,
    'planner_version',3
  );

  insert into public.site_plans(workspace_id,site_id,created_by,request,blueprint)
  values(
    p_workspace_id,
    p_site_id,
    v_uid,
    jsonb_build_object('industry',p_industry,'subindustry',p_subindustry,'style_tags',p_style_tags,'required_capabilities',p_required_capabilities,'goals',p_goals,'layout_blueprint_id',v_layout_id),
    v_blueprint
  );
  return v_blueprint;
end;
$function$;
