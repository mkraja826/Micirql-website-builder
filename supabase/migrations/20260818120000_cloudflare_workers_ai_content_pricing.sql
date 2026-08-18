insert into public.ai_model_pricing (
  id,
  provider,
  model,
  input_microusd_per_million_tokens,
  output_microusd_per_million_tokens,
  active
) values (
  'cloudflare-workers-ai:@cf/meta/llama-3.1-8b-instruct-fp8',
  'cloudflare-workers-ai',
  '@cf/meta/llama-3.1-8b-instruct-fp8',
  152000,
  287000,
  true
)
on conflict (id) do update set
  provider = excluded.provider,
  model = excluded.model,
  input_microusd_per_million_tokens = excluded.input_microusd_per_million_tokens,
  output_microusd_per_million_tokens = excluded.output_microusd_per_million_tokens,
  active = true,
  updated_at = now();
