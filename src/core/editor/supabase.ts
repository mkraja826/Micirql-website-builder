import type { SupabaseClient } from "@supabase/supabase-js";
import { assertEditorDraftIdentity, type EditorDraftRepository } from "./repository";
import type {
  EditorDraftRecord,
  EditorDraftSnapshot,
  LoadEditorDraftInput,
  SaveEditorDraftInput,
} from "./schema";

type SiteBaselineRow = {
  id: string;
  workspace_id: string;
  materialized_site_id: string;
  source_key: string;
  candidate_id: string;
  draft_version: string;
};

type BaselineVersionRow = {
  version_number: number;
  snapshot_hash: string | null;
  materialized_fingerprint: string | null;
};

type WorkspaceDraftRow = {
  workspace_id: string;
  site_id: string;
  revision: number;
  snapshot: EditorDraftSnapshot;
  updated_by: string;
  updated_at: string;
};

export class SupabaseEditorDraftRepository implements EditorDraftRepository {
  constructor(private readonly client: SupabaseClient) {}

  async load(input: LoadEditorDraftInput): Promise<EditorDraftRecord | null> {
    const baseline = await this.loadBaseline(input);

    const { data, error } = await this.client
      .from("workspace_drafts")
      .select("workspace_id, site_id, revision, snapshot, updated_by, updated_at")
      .eq("workspace_id", input.workspaceId)
      .eq("site_id", input.dbSiteId)
      .maybeSingle();

    if (error) throw new Error(`Failed to load editor draft: ${error.message}`);
    if (!data) return null;

    const row = data as WorkspaceDraftRow;
    this.assertBaseline(row.snapshot, baseline);

    return {
      workspaceId: row.workspace_id,
      dbSiteId: row.site_id,
      revision: Number(row.revision),
      snapshot: row.snapshot,
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
    };
  }

  async save(input: SaveEditorDraftInput): Promise<EditorDraftRecord> {
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) {
      throw new Error("Editor draft expected revision must be a non-negative safe integer.");
    }

    assertEditorDraftIdentity(input.snapshot, input);
    const baseline = await this.loadBaseline(input);
    this.assertBaseline(input.snapshot, baseline);

    const current = await this.load(input);
    if (current ? current.revision !== input.expectedRevision : input.expectedRevision !== 0) {
      throw new Error("Editor draft revision conflict.");
    }

    const { data, error } = await this.client.rpc("save_workspace_draft", {
      p_workspace_id: input.workspaceId,
      p_site_id: input.dbSiteId,
      p_expected_revision: input.expectedRevision,
      p_snapshot: input.snapshot,
      p_updated_by: input.actorId,
    });

    if (error) throw new Error(`Failed to save editor draft: ${error.message}`);

    const saved = await this.load(input);
    if (!saved || saved.revision !== Number(data)) {
      throw new Error("Editor draft save completed without a matching readable revision.");
    }
    return saved;
  }

  private async loadBaseline(input: LoadEditorDraftInput): Promise<{
    site: SiteBaselineRow;
    fingerprint: string;
  }> {
    const { data: siteData, error: siteError } = await this.client
      .from("sites")
      .select("id, workspace_id, materialized_site_id, source_key, candidate_id, draft_version")
      .eq("id", input.dbSiteId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();

    if (siteError) throw new Error(`Failed to load editor site baseline: ${siteError.message}`);
    if (!siteData) throw new Error("Editor site baseline does not exist in this workspace.");

    const site = siteData as SiteBaselineRow;
    const { data: versionData, error: versionError } = await this.client
      .from("site_versions")
      .select("version_number, snapshot_hash, materialized_fingerprint")
      .eq("site_id", input.dbSiteId)
      .eq("version_number", 1)
      .maybeSingle();

    if (versionError) throw new Error(`Failed to load certified editor baseline: ${versionError.message}`);
    if (!versionData) throw new Error("Certified revision-1 baseline is missing.");

    const version = versionData as BaselineVersionRow;
    const fingerprint = version.materialized_fingerprint ?? version.snapshot_hash;
    if (!fingerprint || version.snapshot_hash !== fingerprint) {
      throw new Error("Certified editor baseline fingerprint is missing or inconsistent.");
    }

    return { site, fingerprint };
  }

  private assertBaseline(
    snapshot: EditorDraftSnapshot,
    baseline: { site: SiteBaselineRow; fingerprint: string },
  ): void {
    assertEditorDraftIdentity(snapshot, {
      workspaceId: baseline.site.workspace_id,
      dbSiteId: baseline.site.id,
    });

    if (
      snapshot.baseline.materializedSiteId !== baseline.site.materialized_site_id
      || snapshot.baseline.fingerprint !== baseline.fingerprint
      || snapshot.baseline.sourceKey !== baseline.site.source_key
      || snapshot.baseline.candidateId !== baseline.site.candidate_id
      || snapshot.baseline.draftVersion !== baseline.site.draft_version
    ) {
      throw new Error("Editor draft cannot replace its certified baseline provenance.");
    }
  }
}
