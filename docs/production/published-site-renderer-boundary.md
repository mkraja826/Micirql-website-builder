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
