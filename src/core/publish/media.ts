import type { MediaRole } from "../media/planner";
import type { MediaCandidate } from "../../providers/media/schema";
import type { PublishableMediaAsset } from "./schema";

export type ResolvedMediaByRole = Partial<Record<MediaRole, MediaCandidate[]>>;

export function toPublishableMediaAssets({
  pageSlug,
  resolved,
}: {
  pageSlug: string;
  resolved: ResolvedMediaByRole;
}): PublishableMediaAsset[] {
  const normalizedPageSlug = pageSlug.trim();
  if (!normalizedPageSlug) return [];

  return Object.entries(resolved).flatMap(([role, candidates]) => {
    if (!Array.isArray(candidates)) return [];

    return candidates.map((candidate, index) => ({
      pageSlug: normalizedPageSlug,
      sectionType: role,
      role,
      index,
      src: candidate.imageUrl,
      alt: candidate.alt,
      width: candidate.width,
      height: candidate.height,
      focalPoint: candidate.focalPoint,
      provider: candidate.provider,
      providerId: candidate.providerId,
      sourcePageUrl: candidate.sourcePageUrl,
      attribution: candidate.photographer ? `${candidate.photographer} via Pexels` : undefined,
    }));
  });
}
