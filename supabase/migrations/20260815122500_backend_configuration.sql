create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','preview','active','suspended')),
  published_version_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sites_workspace_id_idx on public.sites(workspace_id);

create table if not exists public.site_hostnames (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null unique,
  mode text not null check (mode in ('micirql-subdomain','custom-domain','managed-dns')),
  status text not null default 'pending' check (status in ('pending','verifying','active','failed')),
  ssl_status text not null default 'pending' check (ssl_status in ('pending','active','failed')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_hostnames_one_primary_per_site
  on public.site_hostnames(site_id)
  where is_primary = true;

create table if not exists public.site_integrations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  provider text not null,
  capability text not null,
  status text not null default 'active' check (status in ('active','disabled','error')),
  config_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, provider, capability)
);

create index if not exists site_integrations_site_id_idx on public.site_integrations(site_id);
create index if not exists site_integrations_workspace_id_idx on public.site_integrations(workspace_id);

alter table public.workspaces enable row level security;
alter table public.sites enable row level security;
alter table public.site_hostnames enable row level security;
alter table public.site_integrations enable row level security;

revoke all on public.workspaces from anon, authenticated;
revoke all on public.sites from anon, authenticated;
revoke all on public.site_hostnames from anon, authenticated;
revoke all on public.site_integrations from anon, authenticated;

comment on column public.site_integrations.config_ref is 'Opaque server-side reference only; never store provider credentials in this table.';
