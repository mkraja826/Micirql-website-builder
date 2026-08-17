create or replace function public.refund_workspace_credits(
  p_workspace_id uuid,
  p_credits bigint,
  p_operation_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
  if p_credits <= 0 then raise exception 'INVALID_CREDIT_AMOUNT'; end if;
  if exists(select 1 from public.credit_transactions where workspace_id=p_workspace_id and operation_key=p_operation_key) then
    select balance into v_balance from public.credit_wallets where workspace_id=p_workspace_id;
    return v_balance;
  end if;
  update public.credit_wallets
    set balance=balance+p_credits,
        lifetime_spent=greatest(0,lifetime_spent-p_credits),
        updated_at=now()
    where workspace_id=p_workspace_id
    returning balance into v_balance;
  if not found then raise exception 'CREDIT_WALLET_NOT_FOUND'; end if;
  insert into public.credit_transactions(workspace_id,kind,credits,operation_key,description,metadata)
    values(p_workspace_id,'refund',p_credits,p_operation_key,p_description,p_metadata);
  return v_balance;
end $$;

create or replace function public.add_purchased_credits(
  p_workspace_id uuid,
  p_credits bigint,
  p_operation_key text,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint language plpgsql security definer set search_path=public as $$
declare v_balance bigint;
begin
  if p_credits <= 0 then raise exception 'INVALID_CREDIT_AMOUNT'; end if;
  insert into public.credit_wallets(workspace_id) values(p_workspace_id) on conflict(workspace_id) do nothing;
  if exists(select 1 from public.credit_transactions where workspace_id=p_workspace_id and operation_key=p_operation_key) then
    select balance into v_balance from public.credit_wallets where workspace_id=p_workspace_id;
    return v_balance;
  end if;
  update public.credit_wallets
    set balance=balance+p_credits,lifetime_purchased=lifetime_purchased+p_credits,updated_at=now()
    where workspace_id=p_workspace_id returning balance into v_balance;
  insert into public.credit_transactions(workspace_id,kind,credits,operation_key,description,metadata)
    values(p_workspace_id,'purchase',p_credits,p_operation_key,p_description,p_metadata);
  return v_balance;
end $$;

revoke all on function public.refund_workspace_credits(uuid,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.add_purchased_credits(uuid,bigint,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.refund_workspace_credits(uuid,bigint,text,text,jsonb) to service_role;
grant execute on function public.add_purchased_credits(uuid,bigint,text,text,jsonb) to service_role;
