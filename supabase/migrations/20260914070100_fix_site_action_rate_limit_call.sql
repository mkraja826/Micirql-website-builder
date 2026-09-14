create or replace function public.submit_site_action(
  p_site_id uuid,
  p_action_id text,
  p_action_version text,
  p_request_id text,
  p_name text,
  p_email text default null,
  p_phone text default null,
  p_message text default null,
  p_fields jsonb default '{}'::jsonb,
  p_consent boolean default false,
  p_source_page text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_site public.sites%rowtype;
  v_registry public.site_action_registry%rowtype;
  v_idempotency_key text;
  v_existing jsonb;
  v_lead_id uuid;
  v_result jsonb;
  v_rate_allowed boolean;
begin
  if p_site_id is null then
    raise exception 'site_id is required';
  end if;
  if coalesce(length(trim(p_action_id)), 0) = 0 or coalesce(length(trim(p_action_version)), 0) = 0 then
    raise exception 'action id and version are required';
  end if;
  if coalesce(length(trim(p_request_id)), 0) < 8 then
    raise exception 'request_id is invalid';
  end if;
  if coalesce(length(trim(p_name)), 0) = 0 then
    raise exception 'name is required';
  end if;
  if coalesce(length(trim(p_email)), 0) = 0 and coalesce(length(trim(p_phone)), 0) = 0 then
    raise exception 'email or phone is required';
  end if;
  if p_consent is not true then
    raise exception 'consent is required';
  end if;
  if jsonb_typeof(coalesce(p_fields, '{}'::jsonb)) <> 'object' then
    raise exception 'fields must be a JSON object';
  end if;

  select * into v_registry
  from public.site_action_registry
  where action_id = p_action_id
    and action_version = p_action_version
    and status = 'active';

  if not found then
    raise exception 'action is not registered and active';
  end if;

  if v_registry.handler_kind <> 'lead_request' then
    raise exception 'registered handler kind is unsupported by this submission boundary';
  end if;

  select * into v_site
  from public.sites
  where id = p_site_id
    and status = 'published'
    and published_version_id is not null;

  if not found then
    raise exception 'site is not published';
  end if;

  if not exists (
    select 1
    from public.site_versions sv
    where sv.id = v_site.published_version_id
      and sv.site_id = v_site.id
  ) then
    raise exception 'published site version is invalid';
  end if;

  if not exists (
    select 1
    from public.site_action_bindings b
    where b.site_id = v_site.id
      and b.action_id = p_action_id
      and b.action_version = p_action_version
      and b.status = 'active'
      and b.verified_by = 'system'
      and b.capability_key = any(v_registry.capability_keys)
  ) then
    raise exception 'action is not actively verified for this site';
  end if;

  v_idempotency_key := concat(
    'site:', v_site.id::text,
    ':action:', p_action_id,
    '@', p_action_version,
    ':request:', trim(p_request_id)
  );

  select result into v_existing
  from public.site_function_idempotency
  where idempotency_key = v_idempotency_key
    and expires_at > now();

  if found then
    return v_existing;
  end if;

  select allowed into v_rate_allowed
  from public.consume_site_function_rate_limit(
    concat('site-action:', v_site.id::text, ':', p_action_id, '@', p_action_version),
    100,
    3600
  );

  if v_rate_allowed is not true then
    raise exception 'rate limit exceeded';
  end if;

  insert into public.site_leads (
    workspace_id,
    site_id,
    action_id,
    source_page,
    name,
    email,
    phone,
    message,
    fields,
    consent,
    request_id,
    status
  ) values (
    v_site.workspace_id,
    v_site.id,
    p_action_id,
    nullif(trim(p_source_page), ''),
    trim(p_name),
    nullif(trim(p_email), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_message), ''),
    coalesce(p_fields, '{}'::jsonb),
    p_consent,
    trim(p_request_id),
    'new'
  )
  returning id into v_lead_id;

  v_result := jsonb_build_object(
    'accepted', true,
    'requestId', trim(p_request_id),
    'submissionId', v_lead_id,
    'actionId', p_action_id,
    'actionVersion', p_action_version,
    'semantics', 'request_only'
  );

  insert into public.site_function_idempotency (
    idempotency_key,
    result,
    expires_at
  ) values (
    v_idempotency_key,
    v_result,
    now() + interval '24 hours'
  )
  on conflict (idempotency_key) do update
  set result = excluded.result,
      expires_at = excluded.expires_at,
      updated_at = now();

  return v_result;
end;
$$;

revoke all on function public.submit_site_action(uuid, text, text, text, text, text, text, text, jsonb, boolean, text) from public;
grant execute on function public.submit_site_action(uuid, text, text, text, text, text, text, text, jsonb, boolean, text) to anon, authenticated;
