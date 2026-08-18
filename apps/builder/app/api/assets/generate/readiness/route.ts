import { imageProviderConfigFromEnvironment } from "@micirql/ai";
import { CLOUDFLARE_IMAGE_MODEL, CLOUDFLARE_IMAGE_SIZE, getWorkersAiBinding } from "../../../../cloudflare-workers-ai-image";

export async function GET() {
  let externalError: string | null = null;
  try {
    const provider = imageProviderConfigFromEnvironment(process.env);
    if (provider) {
      return Response.json(
        {
          configured: true,
          ready: true,
          code: "IMAGE_EXECUTOR_READY",
          providerType: process.env.MICIRQL_BFL_API_KEY?.trim() ? "bfl" : "openai-compatible",
          profileId: provider.id,
          model: provider.model,
          size: provider.size,
          fallbackAvailable: Boolean(getWorkersAiBinding()),
        },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }
  } catch (error) {
    externalError = error instanceof Error ? error.message : "External image provider configuration is invalid.";
  }

  if (getWorkersAiBinding()) {
    return Response.json(
      {
        configured: true,
        ready: true,
        code: "IMAGE_EXECUTOR_READY",
        providerType: "cloudflare-workers-ai",
        profileId: "cloudflare-workers-ai-flux-2-klein-4b",
        model: CLOUDFLARE_IMAGE_MODEL,
        size: `${CLOUDFLARE_IMAGE_SIZE.width}x${CLOUDFLARE_IMAGE_SIZE.height}`,
        externalProviderWarning: externalError,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }

  return Response.json(
    {
      configured: Boolean(externalError),
      ready: false,
      code: externalError ? "IMAGE_EXECUTOR_MISCONFIGURED" : "IMAGE_EXECUTOR_NOT_CONFIGURED",
      providerType: null,
      profileId: null,
      model: null,
      size: null,
      error: externalError,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
