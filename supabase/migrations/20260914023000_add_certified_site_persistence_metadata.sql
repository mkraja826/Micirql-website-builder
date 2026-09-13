alter table public.sites
  add column if not exists materialized_site_id text,
  add column if not exists source_key text,
  add column if not exists candidate_id text,
  add column if not exists draft_version text,
  add column if not exists certified_rank integer,
  add column if not exists certified_score double precision;

alter table public.site_versions
  add column if not exists materialized_fingerprint text,
  add column if not exists certified_winner jsonb;

create unique index if not exists sites_workspace_materialized_site_id_uidx
  on public.sites (workspace_id, materialized_site_id)
  where materialized_site_id is not null;

create index if not exists sites_source_candidate_idx
  on public.sites (workspace_id, source_key, candidate_id)
  where source_key is not null and candidate_id is not null;

create index if not exists site_versions_materialized_fingerprint_idx
  on public.site_versions (materialized_fingerprint)
  where materialized_fingerprint is not null;

alter table public.sites
  drop constraint if exists sites_certified_rank_one_check;

alter table public.sites
  add constraint sites_certified_rank_one_check
  check (certified_rank is null or certified_rank = 1);
