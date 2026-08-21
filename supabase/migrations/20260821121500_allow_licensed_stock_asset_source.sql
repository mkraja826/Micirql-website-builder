alter table public.assets
  drop constraint if exists assets_source_check;

alter table public.assets
  add constraint assets_source_check
  check (source in ('user-upload','micirql-placeholder','ai-generated','licensed-stock'));
