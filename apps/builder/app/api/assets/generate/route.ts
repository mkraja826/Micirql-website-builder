import type { AssetRecord } from "@micirql/assets";
import { fetchPexelsImage, getPexelsApiKey } from "../../../pexels-stock-image";
import { assertWorkspaceAccess, insertAsset, uploadAssetBinary } from "../supabase-assets";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      workspaceId?: string;
      siteId?: string;
      sectionId?: string;
      pagePath?: string;
      family?: string;
      domain?: string;
      prompt?: string;
    };

    if (!body.workspaceId || !body.siteId || !body.sectionId || !body.pagePath || !body.prompt) {
      return Response.json({ error: "Image request is incomplete." }, { status: 400 });
    }
    await assertWorkspaceAccess(request, body.workspaceId);
    if (!getPexelsApiKey()) {
      return Response.json(
        {
          error: "Pexels API is not configured for the builder runtime yet.",
          code: "PEXELS_NOT_CONFIGURED",
          routedTask: "stock-image",
        },
        { status: 503 },
      );
    }

    const result = await fetchPexelsImage({
      query: body.prompt,
      ...(body.family ? { family: body.family } : {}),
      ...(body.domain ? { domain: body.domain } : {}),
    });

    const id = `pexels-${result.photoId}-${crypto.randomUUID()}`;
    const stored = await uploadAssetBinary(body.workspaceId, id, result.bytes, result.contentType);
    const purpose = `${body.family ?? "website"} visual`;
    const tags = [
      body.domain ?? "general",
      purpose,
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
      focalPoint: { x: 0.5, y: body.family === "team" ? 0.34 : 0.5 },
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
    return Response.json(
      {
        asset: persisted,
        creditsCharged: 0,
        usage: { images: 1, costMicrousd: 0 },
        provider: {
          profileId: "pexels-stock",
          model: null,
          provider: "api.pexels.com",
          photoId: result.photoId,
          photoUrl: result.photoUrl,
          photographer: result.photographer,
          photographerUrl: result.photographerUrl,
          query: result.query,
        },
        attribution: {
          label: `Photo by ${result.photographer} on Pexels`,
          photographer: result.photographer,
          photographerUrl: result.photographerUrl,
          photoUrl: result.photoUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    const message = error instanceof Error ? error.message : "Pexels image selection failed.";
    return Response.json({ error: message, code: "PEXELS_IMAGE_FAILED" }, { status });
  }
}
