-- This internal certification table has RLS enabled with no client policies.
-- Keep access on trusted server paths; remove unused PostgREST privileges.
REVOKE ALL PRIVILEGES ON TABLE public.certified_layout_contracts FROM PUBLIC, anon, authenticated;
