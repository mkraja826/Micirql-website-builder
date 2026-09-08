create table if not exists public.publish_certification_receipts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  draft_fingerprint text not null,
  certification_type text not null check (certification_type in ('rendered-visual','full-stack')),
  passed boolean not null,
  certified_at timestamptz not null,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(site_id, draft_fingerprint, certification_type)
);

create index if not exists publish_certification_receipts_lookup_idx
  on public.publish_certification_receipts(site_id, draft_fingerprint, certification_type);

alter table public.publish_certification_receipts enable row level security;

revoke all on table public.publish_certification_receipts from public, anon, authenticated;

grant select, insert, update on table public.publish_certification_receipts to service_role;

create or replace function public.upsert_publish_certification_receipt(
  p_site_id uuid,
  p_draft_fingerprint text,
  p_certification_type text,
  p_passed boolean,
  p_certified_at timestamptz,
  p_receipt jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  receipt_id uuid;
begin
  if p_certification_type not in ('rendered-visual','full-stack') then
    raise exception 'invalid certification type';
  end if;

  if coalesce(length(trim(p_draft_fingerprint)), 0) < 32 then
    raise exception 'invalid draft fingerprint';
  end if;

  insert into public.publish_certification_receipts (
    site_id,
    draft_fingerprint,
    certification_type,
    passed,
    certified_at,
    receipt,
    updated_at
  ) values (
    p_site_id,
    p_draft_fingerprint,
    p_certification_type,
    p_passed,
    p_certified_at,
    p_receipt,
    now()
  )
  on conflict (site_id, draft_fingerprint, certification_type)
  do update set
    passed = excluded.passed,
    certified_at = excluded.certified_at,
    receipt = excluded.receipt,
    updated_at = now()
  returning id into receipt_id;

  return receipt_id;
end;
$$;

revoke all on function public.upsert_publish_certification_receipt(uuid, text, text, boolean, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_publish_certification_receipt(uuid, text, text, boolean, timestamptz, jsonb) to service_role;
