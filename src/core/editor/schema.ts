import type { MaterializedSiteSnapshot } from "../materialization/schema";

export type EditorDraftContent = MaterializedSiteSnapshot["snapshot"];

export type EditorDraftSnapshot = {
  version: "1.0";
  dbSiteId: string;
  workspaceId: string;
  baseline: {
    materializedSiteId: string;
    fingerprint: string;
    sourceKey: string;
    candidateId: string;
    draftVersion: MaterializedSiteSnapshot["source"]["draftVersion"];
  };
  content: EditorDraftContent;
};

export type EditorDraftRecord = {
  workspaceId: string;
  dbSiteId: string;
  revision: number;
  snapshot: EditorDraftSnapshot;
  updatedBy: string;
  updatedAt: string;
};

export type LoadEditorDraftInput = {
  workspaceId: string;
  dbSiteId: string;
};

export type SaveEditorDraftInput = {
  workspaceId: string;
  dbSiteId: string;
  actorId: string;
  expectedRevision: number;
  snapshot: EditorDraftSnapshot;
};
