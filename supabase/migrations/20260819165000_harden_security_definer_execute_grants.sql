-- Tighten SECURITY DEFINER RPC exposure without breaking intentional public runtime reads.
-- Public website resolution RPCs remain anon-callable by design:
--   get_live_published_site(uuid)
--   resolve_live_site_hostname(text)

-- plan_site_blueprint performs auth.uid() and workspace-role checks internally,
-- so there is no reason for PUBLIC/anon or unrelated database roles to execute it.
revoke all on function public.plan_site_blueprint(uuid,uuid,text,text,text[],text[],text[],jsonb) from public;
revoke all on function public.plan_site_blueprint(uuid,uuid,text,text,text[],text[],text[],jsonb) from anon;
grant execute on function public.plan_site_blueprint(uuid,uuid,text,text,text[],text[],text[],jsonb) to authenticated;
grant execute on function public.plan_site_blueprint(uuid,uuid,text,text,text[],text[],text[],jsonb) to service_role;

-- workspace_has_members is only used by authenticated workspace bootstrap logic.
-- Anonymous callers do not need to learn whether a workspace has members.
revoke all on function public.workspace_has_members(uuid) from public;
revoke all on function public.workspace_has_members(uuid) from anon;
grant execute on function public.workspace_has_members(uuid) to authenticated;
grant execute on function public.workspace_has_members(uuid) to service_role;
