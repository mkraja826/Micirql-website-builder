# Deploy MiCirql Builder to Cloudflare Workers

The authenticated builder is deployed as a full-stack Next.js application through the Cloudflare OpenNext adapter.

## Cloudflare Workers Builds

Connect the GitHub repository `mkraja826/Micirql-website-builder` to a Cloudflare Worker.

Use these settings:

- Production branch: `main`
- Root directory: `/`
- Install command: `pnpm install --no-frozen-lockfile`
- Build command: leave empty
- Deploy command: `pnpm --filter @micirql/builder deploy`
- Preview deploy command: `pnpm --filter @micirql/builder exec opennextjs-cloudflare build && pnpm --filter @micirql/builder exec wrangler versions upload`

The Worker name in `apps/builder/wrangler.jsonc` is `micirql-builder`.

## Required build variables

Configure these in Cloudflare Workers > Settings > Build > Variables and secrets:

- `NEXT_PUBLIC_SUPABASE_URL` — URL for the `Micirql webbuilder` Supabase project.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — active publishable key for that project.
- `MICIRQL_DRAFT_STORE=supabase`

Do not add a Supabase service-role key to the browser-facing builder. Authenticated requests use the signed-in user's JWT and Supabase RLS.

AI-provider variables can remain unset until providers are activated. The builder has deterministic fallbacks for the current onboarding path.

## Custom domain

After the Worker has one successful deployment, add the custom domain:

`builder.micirql.com`

from Cloudflare Workers > `micirql-builder` > Settings > Domains & Routes > Add > Custom domain.

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
