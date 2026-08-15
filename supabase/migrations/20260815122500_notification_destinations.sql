create table if not exists public.site_notification_destinations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  channel text not null check (channel in ('email','whatsapp','sms','webhook','calendar','crm')),
  provider text not null,
  config_ref text not null,
  action_ids text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_notification_destinations_site_idx
  on public.site_notification_destinations (site_id, enabled);

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  destination_id uuid,
  event_id text not null,
  action_id text not null,
  request_id text not null,
  channel text not null,
  provider text not null,
  provider_message_id text,
  status text not null check (status in ('sent','queued','skipped','failed')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists notification_delivery_log_site_idx
  on public.notification_delivery_log (site_id, created_at desc);

alter table public.site_notification_destinations enable row level security;
alter table public.notification_delivery_log enable row level security;

revoke all on public.site_notification_destinations from anon, authenticated;
revoke all on public.notification_delivery_log from anon, authenticated;

comment on column public.site_notification_destinations.config_ref is
  'Opaque server-side reference to integration configuration/secrets. Never expose provider credentials to generated sites.';
