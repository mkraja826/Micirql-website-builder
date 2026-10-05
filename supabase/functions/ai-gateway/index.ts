import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { parseProviderJson } from './json.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Provider = 'nvidia'
type GatewayBody = { task?: 'planning' | 'content'; system?: string; input?: unknown; response_format?: 'json' }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  try {
    const authorization = req.headers.get('Authorization')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim()
    if (!authorization || !anonKey || !supabaseUrl) return json({ error: 'gateway_auth_not_configured' }, 500)
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    if (userError || !userData.user) return json({ error: 'unauthorized' }, 401)
    const body = await req.json().catch(() => ({})) as GatewayBody
    const task = body.task
    if (task !== 'planning' && task !== 'content') return json({ error: 'unsupported_ai_task' }, 400)
    const system = string(body.system)
    if (!system || system.length > 12000) return json({ error: 'invalid_system_prompt' }, 400)
    const serializedInput = typeof body.input === 'string' ? body.input : JSON.stringify(body.input ?? {})
    if (serializedInput.length > 30000) return json({ error: 'input_too_large' }, 413)
    const providers = providerOrder()
    const warnings: string[] = []
    for (const provider of providers) {
      const configs = providerConfigs(provider)
      if (!configs.length) { warnings.push(provider + '_not_configured'); continue }
      for (const config of configs) {
        try {
          const result = await callOpenAiCompatible(config, system, serializedInput)
          return json({ ok: true, task, provider, model: config.model, content: parseProviderJson(result.content), usage: result.usage, fallback_used: warnings.length > 0, warnings })
        } catch (error) {
          const message = error instanceof Error ? error.message : provider + '_failed'
          warnings.push(provider + ':' + config.model + ': ' + message)
          console.error('AI gateway provider failed', { provider, model: config.model, task, message })
        }
      }
    }
    return json({ error: 'no_ai_provider_available', warnings }, 503)
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'ai_gateway_failed' }, 400) }
})

type ProviderConfig = { apiKey: string; model: string; endpoint?: string }
function providerOrder(): Provider[] {
  const raw = Deno.env.get('AI_GATEWAY_PROVIDER_ORDER') ?? 'nvidia'
  const allowed: Provider[] = ['nvidia']
  const values = raw.split(',').map((value) => value.trim().toLowerCase()).filter((value): value is Provider => allowed.includes(value as Provider))
  return [...new Set(values.length ? values : allowed)]
}
function providerConfigs(provider: Provider): ProviderConfig[] {
  if (provider === 'nvidia') {
    const apiKey = Deno.env.get('NVIDIA_API_KEY')?.trim()
    const models = (Deno.env.get('NVIDIA_MODELS') ?? Deno.env.get('NVIDIA_MODEL') ?? 'nvidia/nemotron-3.5-lightning-30b-a3b').split(',').map((value) => value.trim()).filter(Boolean)
    const endpoint = Deno.env.get('NVIDIA_ENDPOINT')?.trim() || 'https://integrate.api.nvidia.com/v1/chat/completions'
    return apiKey ? models.map((model) => ({ apiKey, model, endpoint })) : []
  }
  return []
}
async function callOpenAiCompatible(config: ProviderConfig, system: string, input: string) {
  const response = await fetch(config.endpoint!, { method: 'POST', headers: { authorization: 'Bearer ' + config.apiKey, 'content-type': 'application/json' }, body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }], response_format: { type: 'json_object' }, chat_template_kwargs: { enable_thinking: false }, temperature: 0.1, max_tokens: 3200, stream: false }) })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message ?? payload?.message ?? ('provider_http_' + response.status))
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('empty_response')
  return { content, usage: { input_tokens: Number(payload?.usage?.prompt_tokens ?? payload?.usage?.input_tokens ?? 0) || 0, output_tokens: Number(payload?.usage?.completion_tokens ?? payload?.usage?.output_tokens ?? 0) || 0 } }
}
function string(value: unknown) { return typeof value === 'string' ? value.trim() : '' }
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...cors, 'Content-Type': 'application/json' } }) }
