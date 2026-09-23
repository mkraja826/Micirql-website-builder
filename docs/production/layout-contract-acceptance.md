# Layout contract acceptance criteria

## Purpose

`plan_site_blueprint(...)` currently validates caller-supplied section payloads against broad family and shape rules. The `certified_layout_contracts` table stores layout identity, industry, status, and version, but not the authoritative section contract. Until those sources are joined, the planner must remain a release-review item.

## Required authoritative source

A layout may be treated as certified only when one canonical record provides:

- the exact layout ID and version;
- the ordered section list;
- each section family and implementation key;
- allowed content slots and capability requirements;
- compatibility constraints between adjacent sections;
- accessibility and responsive requirements;
- lifecycle status and retirement metadata.

The source must cover every active certified layout, including the existing `dental-*` records. Client-supplied JSON, generated snapshots, or a partial `site_plans` sample is not sufficient as the canonical source.

## Safe rollout sequence

1. Inventory and reconcile every active `certified_layout_contracts.id` with its real implementation.
2. Add versioned contract payload storage without modifying historical site snapshots.
3. Backfill only from an authoritative source, with a count and ID reconciliation check.
4. Update `plan_site_blueprint(...)` to compare the request against the stored versioned payload.
5. Add negative tests for unknown IDs, retired versions, missing sections, incompatible adjacency, and capability mismatch.
6. Re-run certification and Supabase security review before removing this release-review item.

No production migration is implied by this document. In particular, it does not rewrite historical plans, snapshots, or the 52 preserved historical AI usage rows.
