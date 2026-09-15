# Canonical published-site renderer boundary

Production rendering must be driven only by the authoritative published durable revision.

## Required authority chain

1. Load the durable `sites` row by database UUID.
2. Require `sites.status = 'published'`.
3. Require a non-null `sites.published_version_id`.
4. Load `site_versions` by the exact `published_version_id` and the same `site_id`.
5. Hydrate and fingerprint-check the persisted materialized snapshot.
6. Render that persisted content, selected sections, theme, CSS variables, and capability state.
7. Build request-action runtime identity only from the verified published runtime.

The renderer must never select the latest revision, regenerate content, infer a replacement version, or fall back to a preview/candidate snapshot.

This keeps editor work isolated from the live website until an explicit publish changes `published_version_id`.

## Snapshot renderer implementation

`src/rendering/published-snapshot.tsx` dispatches persisted section IDs to complete
sections. `src/core/publish/renderer.tsx` exposes its entry point without placing
concrete section IDs in the generic generation core. Unknown section choices or
missing page/section content return `null`; callers must show an unavailable page.

Rendering uses the saved CSS variables and theme colors. It does not reconstruct
art direction or call the theme compiler. Media stays scoped to its saved page,
section, role and index; gallery assets are not replaced by service imagery.
Renderer-invented proof and business placeholder copy are excluded.

Request actions require active capability state in both the snapshot and the
published runtime. The existing browser binding resolver remains authoritative
for form activation. Preview/benchmark routes do not supply published identity.

The entry point expects an already verified snapshot from `loadPublished` and its
corresponding runtime; it is not a substitute for the loader's authority checks.
This increment adds no public route. Route integration and rendered browser visual
certification remain required before production exposure.

Validation includes server rendering of 80 saved candidates across restaurant,
SaaS, construction and law-firm fixtures with network access prohibited during
rendering, plus reload stability, media isolation and capability-denial tests.
