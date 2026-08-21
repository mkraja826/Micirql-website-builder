create or replace function public.record_ai_usage(
  p_workspace_id uuid,
  p_site_id uuid,
  p_build_id uuid,
  p_task text,
  p_profile_id text,
  p_provider text,
  p_model text,
  p_input_tokens bigint default 0,
  p_output_tokens bigint default 0,
  p_images integer default 0,
  p_component_generations integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pricing public.ai_model_pricing%rowtype;
  v_cost bigint := 0;
  v_budget jsonb;
  v_id uuid := gen_random_uuid();
  v_task text := case when p_task = 'website-planning' then 'plan-site' else p_task end;
begin
  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'forbidden';
  end if;

  if v_task not in ('plan-site','generate-content','generate-image','build-component') then
    raise exception 'invalid task';
  end if;

  select * into v_pricing
  from public.ai_model_pricing
  where provider = p_provider and model = p_model and active = true
  limit 1;

  if not found then
    raise exception 'pricing not configured for provider/model';
  end if;

  v_cost :=
      ((greatest(coalesce(p_input_tokens,0),0) * v_pricing.input_microusd_per_million_tokens) / 1000000)
    + ((greatest(coalesce(p_output_tokens,0),0) * v_pricing.output_microusd_per_million_tokens) / 1000000)
    + (greatest(coalesce(p_images,0),0) * v_pricing.image_microusd_each)
    + (greatest(coalesce(p_component_generations,0),0) * v_pricing.component_generation_microusd_each);

  v_budget := public.check_ai_budget(p_workspace_id, p_site_id, p_build_id, v_cost);
  if coalesce((v_budget->>'allowed')::boolean, true) = false then
    raise exception 'ai budget hard limit exceeded';
  end if;

  insert into public.ai_usage_events(
    id, workspace_id, site_id, build_id, task, profile_id, provider, model,
    input_tokens, output_tokens, images, component_generations, cost_microusd
  ) values (
    v_id, p_workspace_id, p_site_id, p_build_id, v_task, p_profile_id, p_provider, p_model,
    greatest(coalesce(p_input_tokens,0),0), greatest(coalesce(p_output_tokens,0),0),
    greatest(coalesce(p_images,0),0), greatest(coalesce(p_component_generations,0),0), v_cost
  );

  return jsonb_build_object('event_id',v_id,'cost_microusd',v_cost,'budget',v_budget);
end;
$function$;
