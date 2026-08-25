-- Preserve explicit visual intent from the source brief during production materialization.
-- This follows the certified-component materialization migration and intentionally
-- does not weaken or modify any Dental certification gate.
--
-- The production hotfix was applied under this migration version. Keep the
-- source migration equivalent for fresh environments while avoiding factual
-- inference: only visual design tokens are derived from explicit colour words.

do $migration$
declare
  v_def text;
  v_anchor text;
begin
  select pg_get_functiondef('public.run_site_build(uuid,uuid)'::regprocedure)
    into v_def;

  -- Fresh environments reach this migration after
  -- 20260825164500_materialize_certified_layout_components.sql.
  if position('v_notes text;' in v_def) = 0 then
    v_def := replace(
      v_def,
      '  v_layout_archetype text;',
      '  v_layout_archetype text;' || chr(10) || '  v_notes text;'
    );

    v_anchor := '  v_source_sections:=case when jsonb_typeof(v_layout->''sections'')=''array'' then v_layout->''sections'' else coalesce(v_plan.blueprint->''sections'',''[]''::jsonb) end;';
    if position(v_anchor in v_def) = 0 then
      raise exception 'run_site_build_source_sections_anchor_missing';
    end if;
    v_def := replace(
      v_def,
      v_anchor,
      v_anchor || chr(10) || '  v_notes:=lower(coalesce(v_plan.request->>''notes'',''''));'
    );

    v_anchor := '  v_primary_goal:=coalesce(v_plan.request->''goals''->>0,''Present the business clearly and convert visitors'');';
    if position(v_anchor in v_def) = 0 then
      raise exception 'run_site_build_primary_goal_anchor_missing';
    end if;
    v_def := replace(
      v_def,
      v_anchor,
      v_anchor || chr(10) || chr(10) ||
      '  /* Explicit palette words are design intent, not business facts. */' || chr(10) ||
      '  if v_industry in (''dental'',''clinic'',''healthcare'')' || chr(10) ||
      '     and v_notes like ''%navy%''' || chr(10) ||
      '     and (v_notes like ''%teal%'' or v_notes like ''%aqua%'') then' || chr(10) ||
      '    v_colors := v_colors || jsonb_build_object(' || chr(10) ||
      '      ''primary'',''#102A43'',' || chr(10) ||
      '      ''secondary'',''#163A52'',' || chr(10) ||
      '      ''accent'',''#2A9D9F'',' || chr(10) ||
      '      ''background'',''#FAFBFC'',' || chr(10) ||
      '      ''surface'',''#FFFFFF'',' || chr(10) ||
      '      ''surfaceAlt'',''#F3F8F8'',' || chr(10) ||
      '      ''text'',''#10202F'',' || chr(10) ||
      '      ''muted'',''#617384'',' || chr(10) ||
      '      ''border'',''#DCE6E8''' || chr(10) ||
      '    );' || chr(10) ||
      '  end if;'
    );

    execute v_def;
  end if;
end
$migration$;

-- Dental materialization should use treatment terminology without inventing
-- treatment names. Existing supplied services remain the only item source.
do $migration$
declare
  v_def text;
begin
  select pg_get_functiondef('public.run_site_build(uuid,uuid)'::regprocedure)
    into v_def;

  if position('''Treatments'',''href'',''#services''') = 0 then
    v_def := replace(v_def, '''Services'',''href'',''#services''', '''Treatments'',''href'',''#services''');
    v_def := replace(v_def, '''Explore services'',''href'',''#services''', '''Explore treatments'',''href'',''#services''');
    v_def := replace(
      v_def,
      'when ''services'' then jsonb_build_object(''eyebrow'',''Services'',''title'',''Services'',''description'',''Explore the services provided by the business.'',',
      'when ''services'' then jsonb_build_object(''eyebrow'',case when v_industry in (''dental'',''clinic'',''healthcare'') then ''Treatments'' else ''Services'' end,''title'',case when v_industry in (''dental'',''clinic'',''healthcare'') then ''Treatments'' else ''Services'' end,''description'',case when v_industry in (''dental'',''clinic'',''healthcare'') then ''Explore the treatments supplied by the clinic.'' else ''Explore the services provided by the business.'' end,'
    );
    v_def := replace(v_def, '''servicePages'',true', '''servicePages'',jsonb_array_length(v_services)>0');
    execute v_def;
  end if;
end
$migration$;
