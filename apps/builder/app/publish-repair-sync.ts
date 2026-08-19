import type { Site } from "@micirql/schema";

export type PublishRepairSyncAssessment =
  | { ok: true; expectedRevision: number }
  | { ok: false; code: "DRAFT_CHANGED_BEFORE_PUBLISH"; message: string };

export function assessPublishRepairSync(
  reviewedSite: Site,
  currentSavedSite: Site,
  currentRevision: number,
): PublishRepairSyncAssessment {
  if (!Number.isInteger(currentRevision) || currentRevision < 0) {
    return {
      ok: false,
      code: "DRAFT_CHANGED_BEFORE_PUBLISH",
      message: "The saved draft revision is invalid. Reload the latest draft before publishing.",
    };
  }

  if (!sameSite(currentSavedSite, reviewedSite)) {
    return {
      ok: false,
      code: "DRAFT_CHANGED_BEFORE_PUBLISH",
      message: "The saved draft changed after final review. Reload the latest draft before publishing so MiCirql does not overwrite newer edits.",
    };
  }

  return { ok: true, expectedRevision: currentRevision };
}

export function sameSite(left: Site, right: Site) {
  return JSON.stringify(left) === JSON.stringify(right);
}
