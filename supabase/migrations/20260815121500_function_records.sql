create extension if not exists pgcrypto;

create table if not exists public.site_function_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  site_id text not null,
  action_id text not null,
  action_version text not null,
  idempotency_key text,
  contact_name text,
  contact_email text,
  contact_phone text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received', 'queued', 'processing', 'completed', 'failed', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists site_function_records_idempotency_idx
  on public.site_function_records (site_id, action_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists site_function_records_site_created_idx
  on public.site_function_records (site_id, created_at desc);

create index if not exists site_function_records_workspace_created_idx
  on public.site_function_records (workspace_id, created_at desc);

alter table public.site_function_records enable row level security;

revoke all on table public.site_function_records from anon, authenticated;

comment on table public.site_function_records is
  'Server-written tenant-scoped records for MiCirql registered public website actions. Clients must never write directly.';

create table if not exists public.function_audit_log (
  id bigint generated always as identity primary key,
  workspace_id text not null,
  site_id text not null,
  action_id text not null,
  request_id text not null,
  actor_user_id uuid,
  success boolean not null,
  result_code text,
  occurred_at timestamptz not null default now()
);

create index if not exists function_audit_log_site_time_idx
  on public.function_audit_log (site_id, occurred_at desc);

alter table public.function_audit_log enable row level security;

revoke all on table public.function_audit_log from anon, authenticated;

comment on table public.function_audit_log is
  'Append-only server audit trail for MiCirql function execution. No direct browser access.';
