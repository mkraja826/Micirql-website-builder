import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SupabaseSitePersistenceRepository } from "../src/core/persistence/supabase";
import type { CertifiedMaterializedSite } from "../src/core/certification/schema";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required certification environment variable: ${name}`);
  return value;
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const url = required("SUPABASE_URL");
const anonKey = required("SUPABASE_ANON_KEY");
const accessToken = required("MICIRQL_CERTIFICATION_ACCESS_TOKEN");
const workspaceId = required("MICIRQL_CERTIFICATION_WORKSPACE_ID");
const actorId = required("MICIRQL_CERTIFICATION_ACTOR_ID");
const fixturePath = process.env.MICIRQL_CERTIFIED_REVISIONS_PATH?.trim() || "artifacts/persisted-publication-certification/input.json";

const input = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as {
  name: string;
  v1: CertifiedMaterializedSite;
  v2: CertifiedMaterializedSite;
};

assert(input.v1.site.siteId === input.v2.site.siteId, "V1 and V2 must represent the same logical site.");
assert(input.v1.site.revision === 1, "Certification input V1 must be revision 1.");
assert(input.v2.site.revision === 2, "Certification input V2 must be revision 2.");
assert(input.v1.site.fingerprint !== input.v2.site.fingerprint, "V2 must be a genuine changed snapshot.");

const client = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: userData, error: userError } = await client.auth.getUser(accessToken);
if (userError || !userData.user) throw new Error(`Certification token is invalid: ${userError?.message ?? "no user"}`);
assert(userData.user.id === actorId, "Certification token actor does not match MICIRQL_CERTIFICATION_ACTOR_ID.");

const repository = new SupabaseSitePersistenceRepository(client);
const persistedV1 = await repository.saveCertifiedSite({ workspaceId, actorId, name: input.name, certified: input.v1 });
assert(persistedV1.revision === 1 && persistedV1.fingerprint === input.v1.site.fingerprint, "Persisted V1 does not exactly match certified V1.");

const publishV1 = await repository.setPublishedVersion({ siteId: persistedV1.dbSiteId, versionId: persistedV1.versionId, actorId });
assert(publishV1.publishedVersionId === persistedV1.versionId, "V1 publication pointer mismatch.");
let published = await repository.loadPublished({ siteId: persistedV1.dbSiteId });
assert(published?.fingerprint === input.v1.site.fingerprint, "Published V1 fingerprint mismatch.");

const persistedV2 = await repository.saveCertifiedSite({ workspaceId, actorId, name: input.name, certified: input.v2 });
assert(persistedV2.revision === 2 && persistedV2.fingerprint === input.v2.site.fingerprint, "Persisted V2 does not exactly match certified V2.");
assert(persistedV2.dbSiteId === persistedV1.dbSiteId, "V2 persistence created a different durable site.");

const publishV2 = await repository.setPublishedVersion({ siteId: persistedV2.dbSiteId, versionId: persistedV2.versionId, actorId });
assert(publishV2.previousPublishedVersionId === persistedV1.versionId, "V2 transition did not preserve V1 as previous publication.");
published = await repository.loadPublished({ siteId: persistedV2.dbSiteId });
assert(published?.fingerprint === input.v2.site.fingerprint, "Published V2 fingerprint mismatch.");

const rollback = await repository.setPublishedVersion({ siteId: persistedV1.dbSiteId, versionId: persistedV1.versionId, actorId });
assert(rollback.previousPublishedVersionId === persistedV2.versionId, "Rollback did not transition from V2.");
published = await repository.loadPublished({ siteId: persistedV1.dbSiteId });
assert(published?.versionId === persistedV1.versionId, "Rollback did not restore the exact V1 version id.");
assert(published?.fingerprint === input.v1.site.fingerprint, "Rollback did not restore the exact V1 fingerprint.");
assert(JSON.stringify(published.snapshot) === JSON.stringify(input.v1.site), "Rollback did not restore the exact certified V1 snapshot.");

const { data: history, error: historyError } = await client
  .from("site_versions")
  .select("id, version_number, snapshot_hash, materialized_fingerprint")
  .eq("site_id", persistedV1.dbSiteId)
  .in("id", [persistedV1.versionId, persistedV2.versionId])
  .order("version_number", { ascending: true });
if (historyError) throw new Error(`Failed to verify immutable history: ${historyError.message}`);
assert(history?.length === 2, "Rollback lost a historical certified revision.");
assert(history[0]?.snapshot_hash === input.v1.site.fingerprint && history[1]?.snapshot_hash === input.v2.site.fingerprint, "Historical fingerprints changed during publication transitions.");

const report = {
  contract: "supabase-persisted-publication-lifecycle-v1",
  siteId: persistedV1.dbSiteId,
  materializedSiteId: persistedV1.materializedSiteId,
  v1: { versionId: persistedV1.versionId, fingerprint: persistedV1.fingerprint },
  v2: { versionId: persistedV2.versionId, fingerprint: persistedV2.fingerprint },
  rollback: { publishedVersionId: published.versionId, fingerprint: published.fingerprint },
  assertions: { authenticatedActor: true, persistedV1: true, publishedV1: true, persistedV2: true, publishedV2: true, exactRollbackV1: true, historicalV2Preserved: true },
};
fs.mkdirSync("artifacts/persisted-publication-certification", { recursive: true });
fs.writeFileSync("artifacts/persisted-publication-certification/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
