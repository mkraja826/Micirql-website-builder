# Deploy MiCirql Builder to Cloudflare Workers

The authenticated builder is deployed as a full-stack Next.js application through the Cloudflare OpenNext adapter.

## Cloudflare Workers Builds

Connect the GitHub repository `mkraja826/Micirql-website-builder` to a Cloudflare Worker.

Use these settings:

- Production branch: `deploy/cloudflare-builder`
- Root directory: `/`
- Install command: `pnpm install --no-frozen-lockfile`
- Build command: leave empty
- Deploy command: `pnpm --filter @micirql/builder run deploy`
- Preview deploy command: `pnpm --filter @micirql/builder exec opennextjs-cloudflare build && pnpm --filter @micirql/builder exec wrangler versions upload`

The Worker name in `apps/builder/wrangler.jsonc` is `micirql-website-builder`.

## Required build variables and runtime bindings

Configure these in Cloudflare Workers > Settings > Build > Variables and secrets:

- `NEXT_PUBLIC_SUPABASE_URL` — URL for the `Micirql webbuilder` Supabase project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — active publishable key for that project.
- `MICIRQL_DRAFT_STORE=supabase` — runtime binding; preserve it with `--keep-vars`.
- `MICIRQL_SUPABASE_SECRET_KEY` — server-only Worker secret used solely for the existing publishing and rollback RPCs.

The two `NEXT_PUBLIC_` values are intentionally embedded into the browser bundle and are also used by server routes. Never expose `MICIRQL_SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` name or return it to the browser. Normal draft, onboarding, selection and export authorization still use the signed-in user's JWT and Supabase RLS; only the existing service-role-only publishing RPCs use the server secret.

AI-provider variables can remain unset until providers are activated. The builder has deterministic fallbacks for the current onboarding path.

## Custom domain

After the Worker has one successful deployment, add the custom domain:

`builder.micirql.com`

from Cloudflare Workers > `micirql-website-builder` > Settings > Domains & Routes > Add > Custom domain.

Because `micirql.com` is already managed in Cloudflare, Cloudflare can create/manage the DNS record and TLS certificate for this hostname.

## Local production-runtime check

From the repository root:

```bash
pnpm install
pnpm --filter @micirql/builder preview:cloudflare
```

For normal Next.js development use:

```bash
pnpm --filter @micirql/builder dev
```
