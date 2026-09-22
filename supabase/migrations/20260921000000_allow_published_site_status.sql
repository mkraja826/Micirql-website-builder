alter table public.sites drop constraint if exists sites_status_check;

alter table public.sites
  add constraint sites_status_check
  check (status = any (array['draft'::text, 'preview'::text, 'active'::text, 'suspended'::text, 'published'::text]));
