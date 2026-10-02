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
