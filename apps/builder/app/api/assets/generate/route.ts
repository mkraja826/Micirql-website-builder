import { createPexelsAsset } from "../../../pexels-asset-service";

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
      desiredAspect?: string;
      preferredTags?: string[];
    };

    if (!body.workspaceId || !body.siteId || !body.sectionId || !body.pagePath || !body.prompt) {
      return Response.json({ error: "Image request is incomplete." }, { status: 400 });
    }

    const result = await createPexelsAsset(request, {
      workspaceId: body.workspaceId,
      siteId: body.siteId,
      sectionId: body.sectionId,
      pagePath: body.pagePath,
      prompt: body.prompt,
      ...(body.family ? { family: body.family } : {}),
      ...(body.domain ? { domain: body.domain } : {}),
      ...(body.desiredAspect ? { desiredAspect: body.desiredAspect } : {}),
      ...(body.preferredTags?.length ? { preferredTags: body.preferredTags } : {}),
    });

    return Response.json(
      {
        asset: result.asset,
        creditsCharged: 0,
        usage: { images: 1, costMicrousd: 0 },
        provider: result.provider,
        attribution: {
          label: `Photo by ${result.provider.photographer} on Pexels`,
          photographer: result.provider.photographer,
          photographerUrl: result.provider.photographerUrl,
          photoUrl: result.provider.photoUrl,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const typed = error as Error & { status?: number; code?: string };
    const status = typed.status ?? 500;
    const message = error instanceof Error ? error.message : "Pexels image selection failed.";
    return Response.json({ error: message, code: typed.code ?? "PEXELS_IMAGE_FAILED" }, { status });
  }
}
