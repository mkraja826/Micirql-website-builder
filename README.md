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


## AI provider bucket

The builder uses one authenticated Supabase Edge Function, `ai-gateway`, for AI planning and content generation. NVIDIA credentials stay in Supabase Edge Function Secrets; the browser and builder never receive them. The gateway returns the selected NVIDIA model and usage metadata. Pexels remains the image source.

Set these production secrets in the Supabase project:

```env
AI_GATEWAY_PROVIDER_ORDER=nvidia

NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b
NVIDIA_MODELS=nvidia/nemotron-3.5-lightning-30b-a3b,deepseek-ai/deepseek-v4.1-flash,z-ai/glm-5-3-flash,z-ai/glm-5-3,moonshotai/kimi-k3,nvidia/nemotron-3-ultra-550b-a55b
NVIDIA_ENDPOINT=https://integrate.api.nvidia.com/v1/chat/completions

```

Do not commit secret values. The gateway accepts only NVIDIA, allows only the `planning` and `content` tasks, and requires an authenticated user JWT. If multiple approved NVIDIA models are configured, it tries them in the listed order.
