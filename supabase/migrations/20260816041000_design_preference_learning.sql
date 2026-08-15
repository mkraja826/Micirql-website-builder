create table if not exists public.design_preference_signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  user_id uuid not null,
  signal_type text not null check (signal_type in ('more_like_this','compare','regenerate','selected')),
  direction_id text not null,
  direction_signature text,
  theme_family text,
  density text,
  shape text,
  motion text,
  typography_display text,
  typography_body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists design_preference_signals_workspace_site_idx
  on public.design_preference_signals(workspace_id, site_id, created_at desc);
create index if not exists design_preference_signals_user_idx
  on public.design_preference_signals(user_id, created_at desc);

alter table public.design_preference_signals enable row level security;

drop policy if exists "workspace members can read design preference signals" on public.design_preference_signals;
create policy "workspace members can read design preference signals"
on public.design_preference_signals for select to authenticated
using (is_workspace_member(workspace_id));

drop policy if exists "workspace editors can create design preference signals" on public.design_preference_signals;
create policy "workspace editors can create design preference signals"
on public.design_preference_signals for insert to authenticated
with check (
  auth.uid() = user_id
  and has_workspace_role(workspace_id, array['owner','admin','editor']::text[])
);

grant select, insert on public.design_preference_signals to authenticated;

create or replace view public.design_preference_profiles with (security_invoker = true) as
select
  workspace_id,
  site_id,
  user_id,
  count(*) filter (where signal_type = 'more_like_this') as likes,
  count(*) filter (where signal_type = 'regenerate') as regenerations,
  count(*) filter (where signal_type = 'selected') as selections,
  mode() within group (order by theme_family)
    filter (where signal_type in ('more_like_this','selected') and theme_family is not null) as preferred_theme_family,
  mode() within group (order by density)
    filter (where signal_type in ('more_like_this','selected') and density is not null) as preferred_density,
  mode() within group (order by shape)
    filter (where signal_type in ('more_like_this','selected') and shape is not null) as preferred_shape,
  mode() within group (order by motion)
    filter (where signal_type in ('more_like_this','selected') and motion is not null) as preferred_motion,
  mode() within group (order by typography_display)
    filter (where signal_type in ('more_like_this','selected') and typography_display is not null) as preferred_display_font,
  mode() within group (order by typography_body)
    filter (where signal_type in ('more_like_this','selected') and typography_body is not null) as preferred_body_font,
  max(created_at) as updated_at
from public.design_preference_signals
group by workspace_id, site_id, user_id;

grant select on public.design_preference_profiles to authenticated;
