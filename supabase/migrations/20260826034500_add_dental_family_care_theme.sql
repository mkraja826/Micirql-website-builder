insert into public.design_themes (
  id, name, description, industry_tags, style_tags,
  color_tokens, typography_tokens, spacing_tokens, radius_tokens,
  shadow_tokens, motion_tokens, layout_tokens, ai_hints,
  version, status, is_system
) values (
  'theme_dental_family_care',
  'Dental Family Care',
  'Warm premium dental system for modern family-oriented and general dentistry websites.',
  array['clinic','dental','healthcare']::text[],
  array['premium','modern','professional','friendly','clean','trust']::text[],
  '{"primary":"#123B4A","secondary":"#1D5668","accent":"#2A9D8F","background":"#F8FBFA","surface":"#FFFFFF","surfaceAlt":"#EEF6F4","text":"#17313A","muted":"#667D84","border":"#D8E7E3","success":"#177A55","warning":"#AD6A00","error":"#C93636"}'::jsonb,
  '{"body":"Inter","scale":"balanced","heading":"Inter"}'::jsonb,
  '{"content":"comfortable","section":"spacious"}'::jsonb,
  '{"card":"18","button":"12"}'::jsonb,
  '{"card":"soft","floating":"medium"}'::jsonb,
  '{"hover":"responsive","entrance":"subtle"}'::jsonb,
  '{"grid":12,"maxWidth":1240,"mobileFirst":true}'::jsonb,
  '{"bestFor":["family dentistry","general dentistry","multi-treatment clinics"],"avoid":["childish graphics","unverified clinical claims"]}'::jsonb,
  1,
  'active',
  true
)
on conflict (id) do update set
  name=excluded.name,
  description=excluded.description,
  industry_tags=excluded.industry_tags,
  style_tags=excluded.style_tags,
  color_tokens=excluded.color_tokens,
  typography_tokens=excluded.typography_tokens,
  spacing_tokens=excluded.spacing_tokens,
  radius_tokens=excluded.radius_tokens,
  shadow_tokens=excluded.shadow_tokens,
  motion_tokens=excluded.motion_tokens,
  layout_tokens=excluded.layout_tokens,
  ai_hints=excluded.ai_hints,
  version=excluded.version,
  status=excluded.status,
  is_system=excluded.is_system,
  updated_at=now();

update public.industry_packs
set recommended_theme_ids = array['theme_clinic_precision','theme_dental_family_care']::text[],
    updated_at = now()
where id='pack_dental_clinic';
