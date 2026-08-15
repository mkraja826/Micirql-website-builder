create table if not exists public.domain_health_events (
  id text primary key,
  domain_id uuid not null references public.site_hostnames(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null,
  checked_at timestamptz not null,
  status text not null,
  healthy boolean not null,
  ownership_ok boolean,
  delegation_ok boolean,
  ssl_ok boolean,
  failure_class text check (failure_class in ('ownership','delegation','ssl','provider','configuration','unknown')),
  message text,
  created_at timestamptz not null default now()
);

create index if not exists domain_health_events_domain_checked_idx
  on public.domain_health_events(domain_id, checked_at desc);

create table if not exists public.domain_incidents (
  id text primary key,
  domain_id uuid not null references public.site_hostnames(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  hostname text not null,
  failure_class text not null check (failure_class in ('ownership','delegation','ssl','provider','configuration','unknown')),
  severity text not null check (severity in ('warning','critical')),
  status text not null check (status in ('open','resolved')),
  consecutive_failures integer not null check (consecutive_failures >= 1),
  opened_at timestamptz not null,
  updated_at timestamptz not null,
  resolved_at timestamptz,
  message text not null
);

create unique index if not exists domain_incidents_one_open_per_domain_idx
  on public.domain_incidents(domain_id)
  where status = 'open';

create index if not exists domain_incidents_site_status_idx
  on public.domain_incidents(site_id, status, updated_at desc);

alter table public.domain_health_events enable row level security;
alter table public.domain_incidents enable row level security;
revoke all on public.domain_health_events from anon, authenticated;
revoke all on public.domain_incidents from anon, authenticated;
