insert into public.ai_model_pricing (
  id,
  provider,
  model,
  input_microusd_per_million_tokens,
  output_microusd_per_million_tokens,
  image_microusd_each,
  component_generation_microusd_each,
  image_input_microusd_per_million_tokens,
  image_output_microusd_per_million_tokens,
  active,
  updated_at
)
values (
  'nvidia_nemotron_3_super_120b_a12b_free',
  'nvidia',
  'nvidia/nemotron-3-super-120b-a12b',
  0,
  0,
  0,
  0,
  0,
  0,
  true,
  now()
)
on conflict (provider, model) do update set
  input_microusd_per_million_tokens = excluded.input_microusd_per_million_tokens,
  output_microusd_per_million_tokens = excluded.output_microusd_per_million_tokens,
  image_microusd_each = excluded.image_microusd_each,
  component_generation_microusd_each = excluded.component_generation_microusd_each,
  image_input_microusd_per_million_tokens = excluded.image_input_microusd_per_million_tokens,
  image_output_microusd_per_million_tokens = excluded.image_output_microusd_per_million_tokens,
  active = true,
  updated_at = now();
