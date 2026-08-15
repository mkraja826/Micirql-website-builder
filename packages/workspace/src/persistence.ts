import { siteSchema, type Site } from "@micirql/schema";
import type { EditorState } from "./editor";

export type WorkspaceDraftRecord = {
  workspaceId: string;
  siteId: string;
  revision: number;
  snapshot: Site;
  updatedAt: string;
  updatedBy: string;
};

export type WorkspaceDraftStore = {
  load(args: { workspaceId: string; siteId: string }): Promise<WorkspaceDraftRecord | undefined>;
  save(record: WorkspaceDraftRecord, expectedRevision: number): Promise<{ revision: number }>;
};

export type SaveWorkspaceResult =
  | { ok: true; state: EditorState }
  | { ok: false; code: "REVISION_CONFLICT" | "SAVE_FAILED"; reason: string; state: EditorState };

export async function saveWorkspaceDraft(args: {
  state: EditorState;
  store: WorkspaceDraftStore;
  updatedBy: string;
  expectedPersistedRevision: number;
  now?: () => Date;
}): Promise<SaveWorkspaceResult> {
  try {
    const snapshot = siteSchema.parse(args.state.site);
    const saved = await args.store.save({
      workspaceId: snapshot.workspaceId,
      siteId: snapshot.siteId,
      revision: args.state.revision,
      snapshot,
      updatedAt: (args.now?.() ?? new Date()).toISOString(),
      updatedBy: args.updatedBy,
    }, args.expectedPersistedRevision);
    return { ok: true, state: { ...args.state, revision: saved.revision, dirty: false } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workspace save failed.";
    const conflict = /revision|conflict|stale/i.test(message);
    return { ok: false, code: conflict ? "REVISION_CONFLICT" : "SAVE_FAILED", reason: message, state: args.state };
  }
}
