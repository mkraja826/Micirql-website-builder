import { fetchPexelsImage, getPexelsApiKey } from "../../../pexels-stock-image";

export async function GET(request: Request) {
  try {
    assertLibraryAdmin(request);
    if (!getPexelsApiKey()) {
      return Response.json(
        { ok: false, code: "PEXELS_NOT_CONFIGURED", error: "Pexels API is not configured in the Builder runtime." },
        { status: 503 },
      );
    }

    const result = await fetchPexelsImage({
      query: "dental implant consultation modern dental clinic",
      family: "hero",
      domain: "dental",
      desiredAspect: "16:9",
      preferredTags: ["implant", "clinical", "consultation"],
      excludedPhotoIds: [],
    });

    if (!result.photoId || !result.bytes.byteLength || !result.width || !result.height) {
      throw new Error("Pexels returned an incomplete runtime image result.");
    }

    return Response.json({
      ok: true,
      provider: "pexels",
      photoId: result.photoId,
      query: result.query,
      contentType: result.contentType,
      bytes: result.bytes.byteLength,
      width: result.width,
      height: result.height,
      orientation: result.orientation,
      aspectRatio: result.aspectRatio,
      photographer: result.photographer,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return Response.json(
      {
        ok: false,
        code: "PEXELS_RUNTIME_HEALTH_FAILED",
        error: error instanceof Error ? error.message : "Pexels runtime health check failed.",
      },
      { status },
    );
  }
}

function assertLibraryAdmin(request: Request) {
  const expected = process.env.MICIRQL_LIBRARY_ADMIN_TOKEN;
  if (!expected) {
    const error = new Error("Dental media library admin token is not configured.") as Error & { status?: number };
    error.status = 503;
    throw error;
  }
  const provided = request.headers.get("x-micirql-library-token");
  if (!provided || provided !== expected) {
    const error = new Error("FORBIDDEN") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
}
