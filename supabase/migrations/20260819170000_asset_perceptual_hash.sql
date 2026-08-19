alter table public.assets
  add column if not exists perceptual_hash text;

alter table public.assets
  drop constraint if exists assets_perceptual_hash_format_check;

alter table public.assets
  add constraint assets_perceptual_hash_format_check
  check (perceptual_hash is null or perceptual_hash ~ '^[0-9a-f]{16}$');

create index if not exists assets_perceptual_hash_idx
  on public.assets (perceptual_hash)
  where perceptual_hash is not null;
