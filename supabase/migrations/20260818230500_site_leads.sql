create table if not exists public.site_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  action_id text not null default 'lead.create',
  source_page text,
  name text not null,
  email text,
  phone text,
  message text,
  fields jsonb not null default '{}'::jsonb,
  consent boolean not null default false,
  status text not null default 'new' check (status in ('new','contacted','qualified','closed','spam')),
  request_id text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_leads_site_created_idx on public.site_leads(site_id, created_at desc);
create index if not exists site_leads_workspace_status_idx on public.site_leads(workspace_id, status, created_at desc);
create unique index if not exists site_leads_request_id_idx on public.site_leads(request_id);

alter table public.site_leads enable row level security;
revoke all on table public.site_leads from anon, authenticated;

comment on table public.site_leads is
  'Server-managed lead, enquiry, appointment and booking requests submitted from MiCirql-generated sites.';
comment on column public.site_leads.fields is
  'Sanitized action-specific form fields. Secrets and arbitrary HTML must never be stored here.';
