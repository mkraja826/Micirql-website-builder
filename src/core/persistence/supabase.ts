import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertifiedWinner } from "../certification/schema";
import { hydrateMaterializedSite } from "../materialization/materializer";
import type { MaterializedSiteSnapshot } from "../materialization/schema";
import { assertPersistableCertifiedSite, type SitePersistenceRepository } from "./repository";
import type {
  DurableSiteRecord,
  LoadDurableSiteInput,
  PersistCertifiedSiteInput,
} from "./schema";

type DurableSiteRow = {
  id: string;
  workspace_id: string;
  name: string;
  status: "draft";
  materialized_site_id: string;
  source_key: string;
  candidate_id: string;
  draft_version: MaterializedSiteSnapshot["source"]["draftVersion"];
};

type DurableVersionRow = {
  version_number: number;
  snapshot: MaterializedSiteSnapshot;
  snapshot_hash: string | null;
  materialized_fingerprint: string | null;
  certified_winner: CertifiedWinner | null;
  created_by: string;
};

export class SupabaseSitePersistenceRepository implements SitePersistenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async saveCertifiedSite(input: PersistCertifiedSiteInput): Promise<DurableSiteRecord> {
    assertPersistableCertifiedSite(input);

    const { site, winner } = input.certified;
    const { error } = await this.client.rpc("persist_certified_site", {
      p_workspace_id: input.workspaceId,
      p_materialized_site_id: site.siteId,
      p_name: input.name.trim(),
      p_source_key: site.source.sourceKey,
      p_candidate_id: site.source.candidateId,
      p_draft_version: site.source.draftVersion,
      p_certified_rank: winner.rank,
      p_certified_score: winner.finalScore,
      p_actor_id: input.actorId,
      p_materialized_fingerprint: site.fingerprint,
      p_snapshot: site,
      p_certified_winner: winner,
    });

    if (error) {
      throw new Error(`Failed to persist certified site: ${error.message}`);
    }

    const persisted = await this.loadLatest({
      workspaceId: input.workspaceId,
      materializedSiteId: site.siteId,
    });

    if (!persisted) {
      throw new Error("Certified site write completed without a readable durable record.");
    }

    return persisted;
  }

  async loadLatest(input: LoadDurableSiteInput): Promise<DurableSiteRecord | null> {
    const { data: siteData, error: siteError } = await this.client
      .from("sites")
      .select("id, workspace_id, name, status, materialized_site_id, source_key, candidate_id, draft_version")
      .eq("workspace_id", input.workspaceId)
      .eq("materialized_site_id", input.materializedSiteId)
      .maybeSingle();

    if (siteError) {
      throw new Error(`Failed to load durable site: ${siteError.message}`);
    }
    if (!siteData) return null;

    const site = siteData as DurableSiteRow;
    const { data: versionData, error: versionError } = await this.client
      .from("site_versions")
      .select("version_number, snapshot, snapshot_hash, materialized_fingerprint, certified_winner, created_by")
      .eq("site_id", site.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      throw new Error(`Failed to load durable site revision: ${versionError.message}`);
    }
    if (!versionData) {
      throw new Error("Durable site exists without a persisted revision.");
    }

    const version = versionData as DurableVersionRow;
    const snapshot = hydrateMaterializedSite(JSON.stringify(version.snapshot));
    const winner = version.certified_winner;

    if (!winner || winner.rank !== 1 || winner.candidateId !== snapshot.source.candidateId) {
      throw new Error("Persisted certification evidence is missing or mismatched.");
    }
    if (version.version_number !== snapshot.revision) {
      throw new Error("Persisted revision does not match materialized snapshot revision.");
    }
    if (version.snapshot_hash !== snapshot.fingerprint || version.materialized_fingerprint !== snapshot.fingerprint) {
      throw new Error("Persisted snapshot fingerprint does not match durable metadata.");
    }
    if (
      site.materialized_site_id !== snapshot.siteId
      || site.source_key !== snapshot.source.sourceKey
      || site.candidate_id !== snapshot.source.candidateId
      || site.draft_version !== snapshot.source.draftVersion
    ) {
      throw new Error("Persisted site provenance does not match the materialized snapshot.");
    }

    return {
      dbSiteId: site.id,
      workspaceId: site.workspace_id,
      materializedSiteId: site.materialized_site_id,
      name: site.name,
      status: site.status,
      source: snapshot.source,
      revision: snapshot.revision,
      fingerprint: snapshot.fingerprint,
      snapshot,
      winner,
      createdBy: version.created_by,
    };
  }
}
