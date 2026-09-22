-- Prevent a workspace-scoped upload intent from overwriting an asset row
-- owned by another workspace (or a global catalog asset) through ON CONFLICT.
create or replace function public.finalize_asset_upload(
  p_upload_id text,
  p_name text,
  p_alt text,
  p_kind text,
  p_width integer,
  p_height integer,
  p_source text default 'user-upload',
  p_license text default 'user-owned',
  p_domains text[] default '{}',
  p_subtypes text[] default '{}',
  p_section_families text[] default '{}',
  p_themes text[] default '{}',
  p_tags text[] default '{}',
  p_dominant_tone text default null
)
returns public.assets
language plpgsql
security definer
set search_path = public, storage
as $function$
declare
  v_intent public.asset_upload_intents%rowtype;
  v_asset public.assets%rowtype;
  v_orientation text;
  v_ratio numeric;
begin
  select * into v_intent
  from public.asset_upload_intents
  where upload_id = p_upload_id
  for update;

  if not found then raise exception 'upload_intent_not_found'; end if;
  if v_intent.completed_at is not null then raise exception 'upload_already_completed'; end if;
  if v_intent.expires_at <= now() then raise exception 'upload_intent_expired'; end if;
  if not public.has_workspace_role(v_intent.workspace_id, array['owner','admin','editor']) then
    raise exception 'forbidden';
  end if;
  if p_width <= 0 or p_height <= 0 then raise exception 'invalid_dimensions'; end if;

  if not exists (
    select 1 from storage.objects
    where bucket_id = 'workspace-assets' and name = v_intent.object_key
  ) then raise exception 'uploaded_object_not_found'; end if;

  v_ratio := p_width::numeric / p_height::numeric;
  v_orientation := case
    when abs(v_ratio - 1) < 0.08 then 'square'
    when v_ratio >= 2 then 'panoramic'
    when v_ratio > 1 then 'landscape'
    else 'portrait'
  end;

  insert into public.assets as existing (
    id, workspace_id, source, kind, name, alt, width, height, orientation,
    aspect_ratio, focal_x, focal_y, dominant_tone, domains, subtypes,
    section_families, themes, tags, license, source_reference, original_url,
    variants, active, storage_provider, original_storage_key, variant_storage_keys
  ) values (
    v_intent.asset_id, v_intent.workspace_id, p_source, p_kind, p_name, p_alt,
    p_width, p_height, v_orientation, v_ratio, 0.5, 0.5, p_dominant_tone,
    coalesce(p_domains,'{}'), coalesce(p_subtypes,'{}'), coalesce(p_section_families,'{}'),
    coalesce(p_themes,'{}'), coalesce(p_tags,'{}'), p_license, v_intent.upload_id,
    '', '{}'::jsonb, true, 'supabase', v_intent.object_key, '{}'
  )
  on conflict (id) do update set
    name = excluded.name,
    alt = excluded.alt,
    width = excluded.width,
    height = excluded.height,
    orientation = excluded.orientation,
    aspect_ratio = excluded.aspect_ratio,
    dominant_tone = excluded.dominant_tone,
    domains = excluded.domains,
    subtypes = excluded.subtypes,
    section_families = excluded.section_families,
    themes = excluded.themes,
    tags = excluded.tags,
    active = true,
    deleted_at = null
  where existing.workspace_id is not distinct from excluded.workspace_id
  returning existing.* into v_asset;

  -- The atomic conflict predicate also closes the concurrent cross-workspace
  -- race between checking ownership and inserting the asset.
  if not found then raise exception 'asset_workspace_conflict'; end if;

  update public.asset_upload_intents
  set completed_at = now()
  where upload_id = p_upload_id;

  return v_asset;
end;
$function$;
