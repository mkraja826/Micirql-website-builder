create table if not exists public.build_observability (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  build_id text not null,
  outcome text not null check (outcome in ('success','recovered','failed')),
  failed_stage text,
  duration_ms integer not null default 0 check (duration_ms >= 0),
  provider text,
  model text,
  fallback_count integer not null default 0 check (fallback_count >= 0),
  quality_score integer,
  recovery_reason text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists build_observability_workspace_created_idx
  on public.build_observability (workspace_id, created_at desc);
create index if not exists build_observability_site_created_idx
  on public.build_observability (site_id, created_at desc);

alter table public.build_observability enable row level security;

drop policy if exists build_observability_workspace_select on public.build_observability;
create policy build_observability_workspace_select on public.build_observability
for select to authenticated using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = build_observability.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists build_observability_workspace_insert on public.build_observability;
create policy build_observability_workspace_insert on public.build_observability
for insert to authenticated with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = build_observability.workspace_id
      and wm.user_id = auth.uid()
  )
);

grant select, insert on public.build_observability to authenticated;
