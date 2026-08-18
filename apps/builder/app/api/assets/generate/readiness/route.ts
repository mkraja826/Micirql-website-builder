import { imageProviderConfigFromEnvironment } from "@micirql/ai";

export async function GET() {
  try {
    const provider = imageProviderConfigFromEnvironment(process.env);
    if (!provider) {
      return Response.json(
        {
          configured: false,
          ready: false,
          code: "IMAGE_EXECUTOR_NOT_CONFIGURED",
          providerType: null,
          profileId: null,
          model: null,
          size: null,
        },
        { status: 200, headers: { "cache-control": "no-store" } },
      );
    }

    return Response.json(
      {
        configured: true,
        ready: true,
        code: "IMAGE_EXECUTOR_READY",
        providerType: process.env.MICIRQL_BFL_API_KEY?.trim() ? "bfl" : "openai-compatible",
        profileId: provider.id,
        model: provider.model,
        size: provider.size,
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        ready: false,
        code: "IMAGE_EXECUTOR_MISCONFIGURED",
        error: error instanceof Error ? error.message : "Image provider configuration is invalid.",
      },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  }
}
