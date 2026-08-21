revoke execute on function public.record_ai_usage(uuid, uuid, uuid, text, text, text, text, bigint, bigint, integer, integer) from anon;
grant execute on function public.record_ai_usage(uuid, uuid, uuid, text, text, text, text, bigint, bigint, integer, integer) to authenticated;
