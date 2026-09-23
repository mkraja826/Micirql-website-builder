-- Restrict export artifact preparation to roles that can create export requests.
-- This function is SECURITY DEFINER and rewrites the artifact manifest.
create or replace function public.prepare_export_artifact(p_export_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  req public.export_requests;
  art public.export_artifacts;
  snap jsonb;
  v_id text;
  site_name text;
begin
  select * into req from public.export_requests where id = p_export_request_id;
  if not found then raise exception 'export request not found'; end if;

  if not has_workspace_role(req.workspace_id, array['owner','admin','editor']) then
    raise exception 'forbidden';
  end if;

  if req.status not in ('granted','paid','ready') and req.granted_at is null then
    raise exception 'export not entitled';
  end if;

  select name, published_version_id into site_name, v_id
  from public.sites
  where id=req.site_id and workspace_id=req.workspace_id;
  if not found then raise exception 'site not found'; end if;

  if v_id is not null then
    select snapshot into snap
    from public.site_versions
    where id=v_id and site_id=req.site_id;
  end if;

  if snap is null then
    select snapshot into snap
    from public.workspace_drafts
    where workspace_id=req.workspace_id and site_id=req.site_id;
  end if;

  if snap is null then raise exception 'no exportable snapshot'; end if;

  insert into public.export_artifacts(
    export_request_id,workspace_id,site_id,status,manifest,expires_at
  )
  values (
    req.id, req.workspace_id, req.site_id, 'pending',
    jsonb_build_object(
      'siteName', site_name,
      'siteId', req.site_id,
      'workspaceId', req.workspace_id,
      'exportRequestId', req.id,
      'snapshot', snap,
      'generatedAt', now(),
      'packageVersion', 1
    ),
    now() + interval '24 hours'
  )
  on conflict (export_request_id) do update
    set status='pending',
        manifest=excluded.manifest,
        error_message=null,
        expires_at=excluded.expires_at,
        updated_at=now()
  returning * into art;

  return jsonb_build_object(
    'artifact_id',art.id,
    'status',art.status,
    'manifest',art.manifest,
    'expires_at',art.expires_at
  );
end;
$function$;

revoke execute on function public.prepare_export_artifact(uuid) from public;
grant execute on function public.prepare_export_artifact(uuid) to authenticated;
grant execute on function public.prepare_export_artifact(uuid) to service_role;
