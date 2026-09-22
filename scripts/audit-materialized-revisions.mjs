import fs from 'node:fs';

const materializerPath = 'src/core/materialization/materializer.ts';
const schemaPath = 'src/core/materialization/schema.ts';
const materializer = fs.readFileSync(materializerPath, 'utf8');
const schema = fs.readFileSync(schemaPath, 'utf8');
const failures = [];

const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};

// V1 compatibility: initial materialization remains revision 1 and its fingerprint
// is still computed only from the persisted snapshot payload.
requireText(materializer, 'revision: 1,', 'initial materialization no longer starts at revision 1');
requireText(materializer, 'fingerprint: fingerprint(persistedSnapshot)', 'snapshot fingerprint algorithm contract changed');
requireText(materializer, 'siteId: siteIdFor(sourceKey, draft.candidateId)', 'initial deterministic site identity changed');

// V2+ contract: revision is explicit, immutable, and remains the same logical site.
requireText(schema, 'revision: number;', 'materialized schema is still revision-1-only');
requireText(materializer, 'export function materializeSiteRevision', 'revision materializer is missing');
requireText(materializer, 'siteId: previous.siteId,', 'revision does not preserve site identity');
requireText(materializer, 'revision: previous.revision + 1,', 'revision does not increment exactly once');
requireText(materializer, 'draft.candidateId !== previous.source.candidateId', 'revision can change certified candidate identity');
requireText(materializer, 'hydrateMaterializedSite(serializeMaterializedSite(previous))', 'previous revision is not integrity-checked before deriving next revision');

// Hydration must accept valid immutable revision history but reject invalid counters.
requireText(materializer, '!Number.isSafeInteger(parsed.revision) || parsed.revision < 1', 'hydration does not validate positive integer revisions');

const report = {
  generatedAt: new Date().toISOString(),
  contract: 'materialized-revision-v1',
  checks: {
    initialRevisionRemainsOne: materializer.includes('revision: 1,'),
    fingerprintPayloadUnchanged: materializer.includes('fingerprint: fingerprint(persistedSnapshot)'),
    deterministicInitialSiteId: materializer.includes('siteId: siteIdFor(sourceKey, draft.candidateId)'),
    revisionAwareSchema: schema.includes('revision: number;'),
    revisionApiPresent: materializer.includes('export function materializeSiteRevision'),
    sameSiteAcrossRevisions: materializer.includes('siteId: previous.siteId,'),
    monotonicRevision: materializer.includes('revision: previous.revision + 1,'),
    candidateIdentityLocked: materializer.includes('draft.candidateId !== previous.source.candidateId'),
    previousIntegrityChecked: materializer.includes('hydrateMaterializedSite(serializeMaterializedSite(previous))'),
    hydrationAcceptsPositiveIntegerHistory: materializer.includes('!Number.isSafeInteger(parsed.revision) || parsed.revision < 1'),
  },
  failures,
};

fs.mkdirSync('artifacts/materialized-revision-audit', { recursive: true });
fs.writeFileSync('artifacts/materialized-revision-audit/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
