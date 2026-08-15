create table if not exists public.asset_upload_intents (
  upload_id text primary key,
  asset_id text not null unique,
  workspace_id uuid not null,
  site_id text null,
  file_name text not null,
  content_type text not null check (content_type like 'image/%'),
  byte_size bigint not null check (byte_size > 0),
  object_key text not null unique,
  expires_at timestamptz not null,
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists asset_upload_intents_workspace_idx
  on public.asset_upload_intents(workspace_id, created_at desc);
create index if not exists asset_upload_intents_expiry_idx
  on public.asset_upload_intents(expires_at)
  where completed_at is null;

alter table public.asset_upload_intents enable row level security;
revoke all on public.asset_upload_intents from anon, authenticated;

comment on table public.asset_upload_intents is
  'Server-managed short-lived direct-upload intents. Browser clients never write this table directly.';
