import { getPexelsApiKey } from "../../../../pexels-stock-image";

export async function GET() {
  const configured = Boolean(getPexelsApiKey());
  return Response.json(
    {
      configured,
      ready: configured,
      code: configured ? "PEXELS_READY" : "PEXELS_NOT_CONFIGURED",
      providerType: configured ? "pexels-stock" : null,
      profileId: configured ? "pexels-stock" : null,
      model: null,
      size: null,
      attributionRequired: true,
      error: configured ? null : "PEXELS_API_KEY is not configured.",
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
