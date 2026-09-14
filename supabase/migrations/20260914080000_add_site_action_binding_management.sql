create or replace function public.set_site_action_binding(
  p_workspace_id uuid,
  p_site_id uuid,
  p_capability_key text,
  p_action_id text,
  p_action_version text,
  p_status text default 'active'
)
returns public.site_action_bindings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_registry public.site_action_registry%rowtype;
  v_binding public.site_action_bindings%rowtype;
  v_evidence_id text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  if not public.has_workspace_role(p_workspace_id, array['owner','admin','editor']) then
    raise exception 'insufficient workspace role';
  end if;

  if not exists (
    select 1
    from public.sites s
    where s.id = p_site_id
      and s.workspace_id = p_workspace_id
  ) then
    raise exception 'site does not belong to workspace';
  end if;

  if coalesce(length(trim(p_capability_key)), 0) = 0 then
    raise exception 'capability key is required';
  end if;

  if p_status not in ('active', 'disabled') then
    raise exception 'binding status must be active or disabled';
  end if;

  select * into v_registry
  from public.site_action_registry
  where action_id = p_action_id
    and action_version = p_action_version
    and status = 'active';

  if not found then
    raise exception 'action is not registered and active';
  end if;

  if not (p_capability_key = any(v_registry.capability_keys)) then
    raise exception 'registered action does not support capability';
  end if;

  v_evidence_id := concat(
    'registry:', p_action_id, '@', p_action_version,
    ':capability:', p_capability_key
  );

  insert into public.site_action_bindings (
    site_id,
    capability_key,
    action_id,
    action_version,
    status,
    verification_evidence_id,
    verified_by,
    verified_at
  ) values (
    p_site_id,
    p_capability_key,
    p_action_id,
    p_action_version,
    p_status,
    v_evidence_id,
    'system',
    now()
  )
  on conflict (site_id, capability_key) do update
  set action_id = excluded.action_id,
      action_version = excluded.action_version,
      status = excluded.status,
      verification_evidence_id = excluded.verification_evidence_id,
      verified_by = 'system',
      verified_at = now(),
      updated_at = now()
  returning * into v_binding;

  return v_binding;
end;
$$;

revoke all on function public.set_site_action_binding(uuid, uuid, text, text, text, text) from public, anon;
grant execute on function public.set_site_action_binding(uuid, uuid, text, text, text, text) to authenticated;
