-- A published site may expose only the exact logo referenced by its immutable
-- published snapshot. The asset table itself stays private and RLS-protected.
create or replace function public.get_live_brand_mark(
  p_site_id uuid,
  p_asset_id text
) returns table (
  asset_id text,
  src text,
  alt text,
  width integer,
  height integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    asset.id as asset_id,
    asset.original_url as src,
    asset.alt,
    asset.width,
    asset.height
  from public.sites as site
  inner join public.site_versions as version
    on version.id = site.published_version_id
   and version.site_id = site.id
   and version.status = 'published'
  inner join public.assets as asset
    on asset.id = p_asset_id
  where site.id = p_site_id
    and version.snapshot ->> 'siteId' = site.id::text
    and version.snapshot ->> 'workspaceId' = site.workspace_id::text
    and version.snapshot #>> '{theme,brand,logoAssetId}' = p_asset_id
    and asset.active = true
    and asset.deleted_at is null
    and asset.kind in ('logo', 'image')
    and (
      (
        asset.source = 'micirql-placeholder'
        and asset.workspace_id is null
      )
      or (
        asset.source in ('user-upload', 'ai-generated')
        and asset.workspace_id = site.workspace_id
      )
    )
  limit 1;
$$;

revoke all on function public.get_live_brand_mark(uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_live_brand_mark(uuid, text)
  to anon;

comment on function public.get_live_brand_mark(uuid, text) is
  'Returns public render metadata only for the exact active logo referenced by a published site snapshot.';
