-- Keep taxonomy aliases reproducible across environments.
-- "luxury resort" should resolve to the resort sub-industry, not luxury-hotel.

update public.v1_taxonomy_aliases
set
  industry_id = (select id from public.v1_industries where slug = 'hospitality'),
  sub_industry_id = (select id from public.v1_sub_industries where slug = 'resort'),
  business_type_id = (select id from public.v1_business_types where slug = 'resort')
where lower(alias) = 'luxury resort';
