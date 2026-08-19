-- Final AI metering boundary cutover.
-- Apply only after SUPABASE_SERVICE_ROLE_KEY is configured in the builder runtime.

create or replace function public.check_ai_budget(
  p_workspace_id uuid,
  p_site_id uuid default null,
  p_build_id uuid default null,
  p_additional_cost_microusd bigint default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_spent bigint := 0;
  v_soft bigint;
  v_hard bigint;
begin
  if auth.role() <> 'service_role'
     and not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'forbidden';
  end if;

  select coalesce(sum(cost_microusd),0) into v_spent
  from public.ai_usage_events
  where workspace_id = p_workspace_id
    and (p_site_id is null or site_id = p_site_id)
    and (p_build_id is null or build_id = p_build_id);

  select soft_limit_microusd, hard_limit_microusd
    into v_soft, v_hard
  from public.ai_budgets
  where workspace_id = p_workspace_id
    and site_id is not distinct from p_site_id
    and build_id is not distinct from p_build_id
  order by updated_at desc
  limit 1;

  return jsonb_build_object(
    'spent_microusd', v_spent,
    'projected_microusd', v_spent + greatest(p_additional_cost_microusd,0),
    'soft_limit_microusd', v_soft,
    'hard_limit_microusd', v_hard,
    'soft_exceeded', v_soft is not null and (v_spent + greatest(p_additional_cost_microusd,0)) >= v_soft,
    'hard_exceeded', v_hard is not null and (v_spent + greatest(p_additional_cost_microusd,0)) >= v_hard,
    'allowed', v_hard is null or (v_spent + greatest(p_additional_cost_microusd,0)) < v_hard
  );
end;
$$;

revoke execute on function public.record_ai_usage(uuid,uuid,uuid,text,text,text,text,bigint,bigint,integer,integer) from public, anon, authenticated;
grant execute on function public.record_ai_usage(uuid,uuid,uuid,text,text,text,text,bigint,bigint,integer,integer) to service_role;

revoke execute on function public.record_ai_usage_v2(uuid,uuid,uuid,text,text,text,text,bigint,bigint,integer,integer,bigint,bigint) from public, anon, authenticated;
grant execute on function public.record_ai_usage_v2(uuid,uuid,uuid,text,text,text,text,bigint,bigint,integer,integer,bigint,bigint) to service_role;
