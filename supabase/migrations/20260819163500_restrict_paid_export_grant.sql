-- Keep paid export entitlement server-side only.
-- Authenticated users may request/quote exports, but only trusted backend code may grant a paid entitlement.

revoke execute on function public.grant_paid_export(uuid, text, timestamptz) from public;
revoke execute on function public.grant_paid_export(uuid, text, timestamptz) from anon;
revoke execute on function public.grant_paid_export(uuid, text, timestamptz) from authenticated;
grant execute on function public.grant_paid_export(uuid, text, timestamptz) to service_role;
