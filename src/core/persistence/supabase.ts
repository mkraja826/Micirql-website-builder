import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertifiedWinner } from "../certification/schema";
import { hydrateMaterializedSite } from "../materialization/materializer";
import type { MaterializedSiteSnapshot } from "../materialization/schema";
import { assertPersistableCertifiedSite, type SitePersistenceRepository } from "./repository";
import type {
  DurableSiteRecord,
  LoadDurableSiteInput,
  LoadPublishedSiteInput,
  PersistCertifiedSiteInput,
  PublicationTransition,
  PublishedDurableSiteRecord,
  SetPublishedSiteVersionInput,
} from "./schema";

type DurableSiteRow = {
  id: string;
  workspace_id: string;
  name: string;
  status: "draft" | "published";
  published_version_id: string | null;
  materialized_site_id: string;
  source_key: string;
  candidate_id: string;
  draft_version: MaterializedSiteSnapshot["source"]["draftVersion"];
};

type DurableVersionRow = {
  id: string;
  site_id: string;
  version_number: number;
  status: string;
  snapshot: MaterializedSiteSnapshot;
  snapshot_hash: string | null;
  materialized_fingerprint: string | null;
  certified_winner: CertifiedWinner | null;
  created_by: string;
};

type PublicationTransitionRow = {
  site_id: string;
  published_version_id: string;
  previous_published_version_id: string | null;
};

function hydrateDurableRecord(site: DurableSiteRow, version: DurableVersionRow): DurableSiteRecord {
  const snapshot = hydrateMaterializedSite(JSON.stringify(version.snapshot));
  const winner = version.certified_winner;

  if (version.site_id !== site.id) {
    throw new Error("Persisted revision does not belong to durable site.");
  }
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
    publishedVersionId: site.published_version_id,
    versionId: version.id,
    source: snapshot.source,
    revision: snapshot.revision,
    fingerprint: snapshot.fingerprint,
    snapshot,
    winner,
    createdBy: version.created_by,
  };
}

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
      .select("id, workspace_id, name, status, published_version_id, materialized_site_id, source_key, candidate_id, draft_version")
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
      .select("id, site_id, version_number, status, snapshot, snapshot_hash, materialized_fingerprint, certified_winner, created_by")
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

    return hydrateDurableRecord(site, versionData as DurableVersionRow);
  }

  async loadPublished(input: LoadPublishedSiteInput): Promise<PublishedDurableSiteRecord | null> {
    if (!input.siteId.trim()) return null;

    const { data: siteData, error: siteError } = await this.client
      .from("sites")
      .select("id, workspace_id, name, status, published_version_id, materialized_site_id, source_key, candidate_id, draft_version")
      .eq("id", input.siteId)
      .eq("status", "published")
      .maybeSingle();

    if (siteError) {
      throw new Error(`Failed to load published site: ${siteError.message}`);
    }
    if (!siteData) return null;

    const site = siteData as DurableSiteRow;
    if (site.status !== "published" || !site.published_version_id) return null;

    const { data: versionData, error: versionError } = await this.client
      .from("site_versions")
      .select("id, site_id, version_number, status, snapshot, snapshot_hash, materialized_fingerprint, certified_winner, created_by")
      .eq("id", site.published_version_id)
      .eq("site_id", site.id)
      .maybeSingle();

    if (versionError) {
      throw new Error(`Failed to load published site revision: ${versionError.message}`);
    }
    if (!versionData) {
      throw new Error("Published site points to a missing or mismatched revision.");
    }

    const record = hydrateDurableRecord(site, versionData as DurableVersionRow);
    if (record.versionId !== site.published_version_id) {
      throw new Error("Published site revision identity mismatch.");
    }

    return record as PublishedDurableSiteRecord;
  }

  async setPublishedVersion(input: SetPublishedSiteVersionInput): Promise<PublicationTransition> {
    if (!input.siteId.trim() || !input.versionId.trim() || !input.actorId.trim()) {
      throw new Error("Publication transition requires site, version, and actor identities.");
    }

    const { data, error } = await this.client.rpc("set_published_site_version", {
      p_site_id: input.siteId,
      p_version_id: input.versionId,
      p_actor_id: input.actorId,
    });

    if (error) {
      throw new Error(`Failed to switch published site version: ${error.message}`);
    }

    const row = (Array.isArray(data) ? data[0] : data) as PublicationTransitionRow | null;
    if (!row || row.site_id !== input.siteId || row.published_version_id !== input.versionId) {
      throw new Error("Publication transition returned an unexpected site or version identity.");
    }

    return {
      siteId: row.site_id,
      publishedVersionId: row.published_version_id,
      previousPublishedVersionId: row.previous_published_version_id,
    };
  }
}
