import type {
  EditorDraftRecord,
  EditorDraftSnapshot,
  LoadEditorDraftInput,
  SaveEditorDraftInput,
} from "./schema";

export interface EditorDraftRepository {
  load(input: LoadEditorDraftInput): Promise<EditorDraftRecord | null>;
  save(input: SaveEditorDraftInput): Promise<EditorDraftRecord>;
}

export function assertEditorDraftIdentity(
  snapshot: EditorDraftSnapshot,
  input: Pick<SaveEditorDraftInput, "workspaceId" | "dbSiteId">,
): void {
  if (snapshot.version !== "1.0") {
    throw new Error("Unsupported editor draft version.");
  }
  if (snapshot.workspaceId !== input.workspaceId || snapshot.dbSiteId !== input.dbSiteId) {
    throw new Error("Editor draft identity does not match save target.");
  }
  if (
    !snapshot.baseline.materializedSiteId
    || !snapshot.baseline.fingerprint
    || !snapshot.baseline.sourceKey
    || !snapshot.baseline.candidateId
    || !snapshot.baseline.draftVersion
  ) {
    throw new Error("Editor draft is missing immutable certified baseline provenance.");
  }
}
