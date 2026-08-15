create table if not exists public.assets (
  id text primary key,
  workspace_id uuid null,
  source text not null check (source in ('user-upload','micirql-placeholder','ai-generated')),
  kind text not null check (kind in ('image','logo','icon','illustration')),
  name text not null,
  alt text not null default '',
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  orientation text not null check (orientation in ('square','portrait','landscape','panoramic')),
  aspect_ratio numeric not null check (aspect_ratio > 0),
  focal_x numeric not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric not null default 0.5 check (focal_y between 0 and 1),
  dominant_tone text null,
  domains text[] not null default '{}',
  subtypes text[] not null default '{}',
  section_families text[] not null default '{}',
  themes text[] not null default '{}',
  tags text[] not null default '{}',
  license text not null check (license in ('user-owned','micirql-owned','licensed','generated')),
  source_reference text null,
  original_url text not null,
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists assets_workspace_idx on public.assets(workspace_id);
create index if not exists assets_source_idx on public.assets(source);
create index if not exists assets_domains_gin on public.assets using gin(domains);
create index if not exists assets_section_families_gin on public.assets using gin(section_families);
create index if not exists assets_tags_gin on public.assets using gin(tags);

alter table public.assets enable row level security;
revoke all on public.assets from anon, authenticated;

comment on table public.assets is 'Server-managed MiCirql asset registry. User uploads are tenant-scoped; placeholders are global curated assets.';
