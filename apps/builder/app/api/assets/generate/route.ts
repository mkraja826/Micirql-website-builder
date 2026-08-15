export async function POST(request: Request) {
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
    return Response.json({ error: "Generation request is incomplete." }, { status: 400 });
  }

  // Production wiring target: @micirql/ai generateAndIngestAsset().
  // We intentionally do not fabricate an image when no routed provider executor is configured.
  return Response.json({
    error: "Image generation provider is not configured for the builder runtime yet.",
    code: "IMAGE_EXECUTOR_NOT_CONFIGURED",
    routedTask: "generate-image",
  }, { status: 503 });
}
