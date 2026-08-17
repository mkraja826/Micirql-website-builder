-- MiCirql prepaid credit ledger + AI usage accounting.
-- Trial credits and paid recharge credits share one wallet; all debits are server-side.

create table if not exists public.credit_wallets (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  lifetime_granted bigint not null default 0 check (lifetime_granted >= 0),
  lifetime_purchased bigint not null default 0 check (lifetime_purchased >= 0),
  lifetime_spent bigint not null default 0 check (lifetime_spent >= 0),
  trial_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('trial_grant','purchase','reservation','settlement','refund','adjustment')),
  credits bigint not null,
  operation_key text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists credit_transactions_operation_key_unique on public.credit_transactions(workspace_id, operation_key) where operation_key is not null;
create index if not exists credit_transactions_workspace_created_idx on public.credit_transactions(workspace_id, created_at desc);

create table if not exists public.ai_usage (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  site_id uuid,
  build_id uuid,
  task text not null check (task in ('plan-site','generate-image','build-component')),
  profile_id text not null,
  provider text not null,
  model text not null,
  input_tokens integer,
  output_tokens integer,
  images integer,
  component_generations integer,
  cost_microusd bigint not null default 0 check (cost_microusd >= 0),
  credits_charged bigint not null default 0 check (credits_charged >= 0),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_workspace_created_idx on public.ai_usage(workspace_id, created_at desc);

alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.ai_usage enable row level security;

-- Members may inspect their balance/history, but only trusted server code mutates credits.
create policy "workspace members read credit wallet" on public.credit_wallets for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace members read credit transactions" on public.credit_transactions for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "workspace members read ai usage" on public.ai_usage for select to authenticated using (public.is_workspace_member(workspace_id));

create or replace function public.reserve_workspace_credits(p_workspace_id uuid,p_credits bigint,p_operation_key text,p_description text default null,p_metadata jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
  if p_credits <= 0 then raise exception 'INVALID_CREDIT_AMOUNT'; end if;
  select balance into v_balance from public.credit_wallets where workspace_id=p_workspace_id for update;
  if not found then raise exception 'CREDIT_WALLET_NOT_FOUND'; end if;
  if exists(select 1 from public.credit_transactions where workspace_id=p_workspace_id and operation_key=p_operation_key) then return v_balance; end if;
  if v_balance < p_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;
  update public.credit_wallets set balance=balance-p_credits,lifetime_spent=lifetime_spent+p_credits,updated_at=now() where workspace_id=p_workspace_id returning balance into v_balance;
  insert into public.credit_transactions(workspace_id,kind,credits,operation_key,description,metadata) values(p_workspace_id,'reservation',-p_credits,p_operation_key,p_description,p_metadata);
  return v_balance;
end $$;

create or replace function public.grant_trial_credits(p_workspace_id uuid,p_credits bigint)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
  if p_credits <= 0 then raise exception 'INVALID_CREDIT_AMOUNT'; end if;
  insert into public.credit_wallets(workspace_id) values(p_workspace_id) on conflict(workspace_id) do nothing;
  update public.credit_wallets set balance=balance+p_credits,lifetime_granted=lifetime_granted+p_credits,trial_granted_at=now(),updated_at=now()
    where workspace_id=p_workspace_id and trial_granted_at is null returning balance into v_balance;
  if found then insert into public.credit_transactions(workspace_id,kind,credits,operation_key,description) values(p_workspace_id,'trial_grant',p_credits,'trial-grant','Initial limited trial credits');
  else select balance into v_balance from public.credit_wallets where workspace_id=p_workspace_id; end if;
  return v_balance;
end $$;

revoke all on function public.reserve_workspace_credits(uuid,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.grant_trial_credits(uuid,bigint) from public,anon,authenticated;
grant execute on function public.reserve_workspace_credits(uuid,bigint,text,text,jsonb) to service_role;
grant execute on function public.grant_trial_credits(uuid,bigint) to service_role;
