# MiCirql Website Builder

AI-assisted, schema-driven website builder focused on reusable design systems rather than unnecessary code generation.

## Core protocol

Every production site and library item must be:

1. Functional
2. Mobile-first
3. Performance-safe
4. Accessible
5. SEO-ready
6. Visually coherent

## Architecture

- Next.js + React + TypeScript
- pnpm + Turborepo monorepo
- Schema-driven renderer
- Versioned component/design registry
- Theme families + semantic design tokens
- Function registry for backend behavior
- AI as planner/selector/reviewer; code generation only as a last resort

## Workspace

- `apps/builder` — customer-facing builder/editor
- `apps/preview` — deterministic site preview/runtime shell
- `apps/docs` — internal library/docs shell
- `packages/*` — shared platform packages

Phase 1 establishes the monorepo and package boundaries. Later phases add protocol enforcement, schemas, registry, themes, renderer, backend functions, AI selection, and publishing.


## Text AI provider configuration

MiCirql supports AIMLAPI for AI planning and content-advisor tasks through its OpenAI-compatible chat-completions endpoint.

Configure these as private Worker/runtime variables; never commit them:

- `MICIRQL_TEXT_PROVIDER=aimlapi`
- `AIMLAPI_API_KEY`
- `AIMLAPI_MODEL`
- `AIMLAPI_ENDPOINT` (optional; defaults to `https://api.aimlapi.com/v1/chat/completions`)
- `AIMLAPI_TEMPERATURE` (optional)
- `AIMLAPI_MAX_OUTPUT_TOKENS` (optional)
- `AIMLAPI_INPUT_USD_PER_MILLION` and `AIMLAPI_OUTPUT_USD_PER_MILLION` (optional usage-cost metadata)

If AIMLAPI is selected but the key or model is missing, generation fails clearly instead of silently presenting deterministic fallback content as AI-generated.


## AI provider bucket

The builder uses one authenticated Supabase Edge Function, `ai-gateway`, for AI planning and content generation. Provider credentials stay in Supabase Edge Function Secrets; the browser and builder never receive them. The gateway tries providers in the order configured by `AI_GATEWAY_PROVIDER_ORDER`, then returns the selected provider and usage metadata. Pexels remains the image source.

Set these production secrets in the Supabase project:

```env
AI_GATEWAY_PROVIDER_ORDER=nvidia,gemini,groq,cerebras,aimlapi

NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
NVIDIA_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite

GROQ_API_KEY=
GROQ_MODEL=

CEREBRAS_API_KEY=
CEREBRAS_MODEL=

AIMLAPI_API_KEY=
AIMLAPI_MODEL=
AIMLAPI_ENDPOINT=https://api.aimlapi.com/v1/chat/completions
```

Only add the providers you have keys for. The gateway skips unconfigured providers and falls back to the next configured provider. Do not commit secret values. The gateway only allows the `planning` and `content` tasks and requires an authenticated user JWT.
