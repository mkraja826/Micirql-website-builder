create table if not exists public.site_function_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_function_idempotency (
  idempotency_key text primary key,
  result jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_function_rate_limits enable row level security;
alter table public.site_function_idempotency enable row level security;

revoke all on table public.site_function_rate_limits from public, anon, authenticated;
revoke all on table public.site_function_idempotency from public, anon, authenticated;
grant all on table public.site_function_rate_limits to service_role;
grant all on table public.site_function_idempotency to service_role;

create or replace function public.consume_site_function_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns table (
  allowed boolean,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started timestamptz;
  v_count integer;
  v_now timestamptz := now();
begin
  if p_key is null or length(trim(p_key)) = 0 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_key));

  select window_started_at, request_count
    into v_started, v_count
    from public.site_function_rate_limits
   where rate_key = p_key
   for update;

  if not found then
    insert into public.site_function_rate_limits(rate_key, window_started_at, request_count, updated_at)
    values (p_key, v_now, 1, v_now);
    return query select true, greatest(0, p_limit - 1);
    return;
  end if;

  if v_started + make_interval(secs => p_window_seconds) <= v_now then
    update public.site_function_rate_limits
       set window_started_at = v_now,
           request_count = 1,
           updated_at = v_now
     where rate_key = p_key;
    return query select true, greatest(0, p_limit - 1);
    return;
  end if;

  v_count := v_count + 1;
  update public.site_function_rate_limits
     set request_count = v_count,
         updated_at = v_now
   where rate_key = p_key;

  return query select v_count <= p_limit, greatest(0, p_limit - v_count);
end;
$$;

revoke all on function public.consume_site_function_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_site_function_rate_limit(text, integer, integer) to service_role;

create index if not exists site_function_rate_limits_updated_idx
  on public.site_function_rate_limits(updated_at);

create index if not exists site_function_idempotency_expires_idx
  on public.site_function_idempotency(expires_at);
