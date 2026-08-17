create table if not exists public.credit_payment_orders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('razorpay')),
  provider_order_id text not null unique,
  package_id text not null,
  credits bigint not null check (credits > 0),
  amount_inr integer not null check (amount_inr > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','paid','failed','cancelled')),
  provider_payment_id text,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists credit_payment_orders_workspace_created_idx on public.credit_payment_orders(workspace_id,created_at desc);
alter table public.credit_payment_orders enable row level security;
create policy "workspace members read payment orders" on public.credit_payment_orders for select to authenticated using (public.is_workspace_member(workspace_id));
