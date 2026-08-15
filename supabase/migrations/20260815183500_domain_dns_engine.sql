alter table public.site_hostnames
  add column if not exists ownership_token text,
  add column if not exists provider_zone_id text,
  add column if not exists expected_nameservers text[],
  add column if not exists lifecycle_status text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_error text;

update public.site_hostnames
   set lifecycle_status = case
     when status = 'active' and ssl_status = 'active' then 'active'
     when status = 'failed' then 'failed'
     else 'pending'
   end
 where lifecycle_status is null;

alter table public.site_hostnames
  alter column lifecycle_status set default 'pending',
  alter column lifecycle_status set not null;

alter table public.site_hostnames
  drop constraint if exists site_hostnames_lifecycle_status_check;

alter table public.site_hostnames
  add constraint site_hostnames_lifecycle_status_check check (
    lifecycle_status in (
      'pending','ownership_verifying','ownership_verified','delegation_pending','delegated',
      'zone_provisioned','ssl_pending','active','degraded','disconnecting','disconnected','failed'
    )
  );

create index if not exists site_hostnames_lifecycle_idx
  on public.site_hostnames(lifecycle_status, last_checked_at);

create unique index if not exists site_hostnames_provider_zone_unique_idx
  on public.site_hostnames(provider_zone_id)
  where provider_zone_id is not null;

comment on column public.site_hostnames.ownership_token is 'Public DNS verification token only; never store provider secrets here.';
comment on column public.site_hostnames.provider_zone_id is 'Opaque DNS provider zone identifier; credentials remain server-side.';
comment on column public.site_hostnames.expected_nameservers is 'Authoritative nameservers MiCirql expects for managed-dns delegation.';
