create table if not exists public.site_versions (
  id text primary key,
  site_id text not null references public.sites(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null check (status in ('draft','preview','published','archived')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  unique (site_id, version_number)
);

create index if not exists site_versions_site_status_idx on public.site_versions(site_id, status);

alter table public.site_versions enable row level security;
revoke all on public.site_versions from anon, authenticated;

-- Exactly one published version may be active per site at a time.
create unique index if not exists site_versions_one_published_per_site_idx
  on public.site_versions(site_id)
  where status = 'published';
