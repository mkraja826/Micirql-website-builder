revoke all on function public.save_workspace_draft(uuid, uuid, bigint, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.save_workspace_draft(uuid, uuid, bigint, jsonb, uuid) to service_role;
