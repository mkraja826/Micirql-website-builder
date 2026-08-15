create table if not exists public.ai_usage_events (
  id uuid primary key,
  workspace_id uuid not null,
  site_id uuid,
  build_id uuid,
  task text not null check (task in ('plan-site','generate-image','build-component')),
  profile_id text not null,
  provider text not null,
  model text not null,
  input_tokens bigint,
  output_tokens bigint,
  images integer,
  component_generations integer,
  cost_microusd bigint not null check (cost_microusd >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_events_workspace_created_idx
  on public.ai_usage_events (workspace_id, created_at desc);
create index if not exists ai_usage_events_site_created_idx
  on public.ai_usage_events (site_id, created_at desc) where site_id is not null;
create index if not exists ai_usage_events_build_created_idx
  on public.ai_usage_events (build_id, created_at desc) where build_id is not null;

create table if not exists public.ai_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid,
  build_id uuid,
  soft_limit_microusd bigint check (soft_limit_microusd is null or soft_limit_microusd >= 0),
  hard_limit_microusd bigint check (hard_limit_microusd is null or hard_limit_microusd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hard_limit_microusd is null or soft_limit_microusd is null or hard_limit_microusd >= soft_limit_microusd)
);

create unique index if not exists ai_budgets_scope_unique_idx
  on public.ai_budgets (
    workspace_id,
    coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(build_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.ai_usage_events enable row level security;
alter table public.ai_budgets enable row level security;

revoke all on table public.ai_usage_events from anon, authenticated;
revoke all on table public.ai_budgets from anon, authenticated;

comment on table public.ai_usage_events is 'Server-recorded MiCirql AI usage ledger; costs are stored as integer micro-USD.';
comment on table public.ai_budgets is 'Server-managed soft/hard AI spending limits per workspace, site, or build.';
