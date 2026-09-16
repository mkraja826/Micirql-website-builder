import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260916070000_support_immutable_certified_site_revisions.sql';
const sql = fs.readFileSync(migrationPath, 'utf8');
const failures = [];
const requireText = (text, message) => { if (!sql.includes(text)) failures.push(message); };

requireText("v_revision := coalesce((p_snapshot ->> 'revision')::integer, 0);", 'RPC does not derive revision from certified snapshot');
requireText("if v_revision < 1 then", 'RPC does not reject invalid revisions');
requireText("v_version_id := v_site_id::text || ':' || v_revision::text;", 'version identity is not revision-aware');
requireText('certified site revisions must be persisted sequentially', 'RPC does not enforce sequential revision history');
requireText('on conflict (site_id, version_number)', 'RPC does not protect version identity');
requireText('public.site_versions.snapshot_hash = excluded.snapshot_hash', 'idempotent replay does not require exact snapshot fingerprint');
requireText('public.site_versions.materialized_fingerprint = excluded.materialized_fingerprint', 'idempotent replay does not require exact materialized fingerprint');
requireText('public.site_versions.certified_winner = excluded.certified_winner', 'idempotent replay does not require exact certification evidence');
requireText("raise exception 'durable site revision is immutable';", 'RPC does not fail closed on revision overwrite');
requireText("auth.uid() is null or auth.uid() <> p_actor_id", 'RPC no longer binds persistence to authenticated actor');

const report = {
  contract: 'persisted-certified-revision-rpc-v1',
  migrationPath,
  checks: {
    revisionFromSnapshot: failures.every((x) => !x.includes('derive revision')),
    positiveRevision: failures.every((x) => !x.includes('invalid revisions')),
    revisionAwareIdentity: failures.every((x) => !x.includes('revision-aware')),
    sequentialHistory: failures.every((x) => !x.includes('sequential')),
    immutableVersionIdentity: failures.every((x) => !x.includes('version identity')),
    exactIdempotentReplay: !failures.some((x) => x.includes('idempotent replay')),
    failClosedOverwrite: failures.every((x) => !x.includes('fail closed')),
    authenticatedActor: failures.every((x) => !x.includes('authenticated actor')),
  },
  failures,
};
fs.mkdirSync('artifacts/persisted-revision-rpc-audit', { recursive: true });
fs.writeFileSync('artifacts/persisted-revision-rpc-audit/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
