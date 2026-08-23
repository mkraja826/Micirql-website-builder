import type { AssetRecord } from "@micirql/assets";
import { fetchPexelsImage, focalPointForSection, getPexelsApiKey } from "./pexels-stock-image";
import { assertWorkspaceAccess, insertAsset, listAssets, uploadAssetBinary } from "./api/assets/supabase-assets";

export type PexelsAssetRequest = {
  workspaceId: string;
  siteId: string;
  sectionId: string;
  pagePath: string;
  family?: string;
  domain?: string;
  prompt: string;
  desiredAspect?: string;
  preferredTags?: string[];
};

export async function createPexelsAsset(request: Request, body: PexelsAssetRequest) {
  await assertWorkspaceAccess(request, body.workspaceId);
  if (!getPexelsApiKey()) {
    const error = new Error("Pexels API is not configured for the builder runtime yet.") as Error & { status?: number; code?: string };
    error.status = 503;
    error.code = "PEXELS_NOT_CONFIGURED";
    throw error;
  }

  const existingAssets = await listAssets(body.workspaceId);
  const excludedPhotoIds = existingAssets
    .map((asset) => asset.sourceReference?.match(/^pexels:(\d+)\|/)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value))
    .filter(Number.isFinite);

  const result = await fetchPexelsImage({
    query: body.prompt,
    ...(body.family ? { family: body.family } : {}),
    ...(body.domain ? { domain: body.domain } : {}),
    ...(body.desiredAspect ? { desiredAspect: body.desiredAspect } : {}),
    ...(body.preferredTags?.length ? { preferredTags: body.preferredTags } : {}),
    excludedPhotoIds,
  });

  const id = `pexels-${result.photoId}-${crypto.randomUUID()}`;
  const stored = await uploadAssetBinary(body.workspaceId, id, result.bytes, result.contentType);
  const purpose = `${body.family ?? "website"} visual`;
  const tags = [
    body.domain ?? "general",
    purpose,
    ...(body.preferredTags ?? []),
    "pexels",
    "licensed-stock",
    `photographer:${result.photographer}`,
  ].filter(Boolean);

  const asset: AssetRecord = {
    id,
    workspaceId: body.workspaceId,
    source: "licensed-stock",
    kind: "image",
    name: `Pexels ${body.family ?? "website"} photo by ${result.photographer}`,
    alt: result.alt,
    width: result.width,
    height: result.height,
    orientation: result.orientation,
    aspectRatio: result.aspectRatio,
    focalPoint: focalPointForSection(body.family, result.orientation, body.desiredAspect),
    domains: [],
    subtypes: [],
    sectionFamilies: body.family ? [body.family] : [],
    themes: [],
    tags,
    license: "licensed",
    sourceReference: `pexels:${result.photoId}|${result.photoUrl}|${result.photographer}|${result.photographerUrl}`,
    originalUrl: stored.url,
    variants: [],
    active: true,
    createdAt: new Date().toISOString(),
  };

  const persisted = await insertAsset(asset, stored.key);
  return {
    asset: persisted,
    provider: {
      profileId: "pexels-stock",
      model: null,
      provider: "api.pexels.com",
      photoId: result.photoId,
      photoUrl: result.photoUrl,
      photographer: result.photographer,
      photographerUrl: result.photographerUrl,
      query: result.query,
      requestedAspect: body.desiredAspect ?? null,
      preferredTags: body.preferredTags ?? [],
      duplicateCandidatesExcluded: excludedPhotoIds.length,
    },
  };
}
