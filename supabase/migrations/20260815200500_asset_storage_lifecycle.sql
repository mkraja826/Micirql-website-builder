alter table public.assets
  add column if not exists storage_provider text null,
  add column if not exists original_storage_key text null,
  add column if not exists variant_storage_keys text[] not null default '{}',
  add column if not exists deleted_at timestamptz null;

create index if not exists assets_active_workspace_idx
  on public.assets(workspace_id, active)
  where deleted_at is null;

create index if not exists assets_deleted_at_idx
  on public.assets(deleted_at)
  where deleted_at is not null;

comment on column public.assets.storage_provider is
  'Server-managed object storage provider identifier. Kept separate from public CDN URLs so delivery hosts can change without changing asset IDs.';
comment on column public.assets.original_storage_key is
  'Private object-storage key for the original uploaded/generated object.';
comment on column public.assets.variant_storage_keys is
  'Private object-storage keys for optimized responsive variants.';
comment on column public.assets.deleted_at is
  'Soft-delete timestamp. Physical objects may only be removed after reference checks pass.';

revoke all on public.assets from anon, authenticated;
